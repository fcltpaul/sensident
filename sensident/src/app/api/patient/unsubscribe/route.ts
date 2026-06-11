/**
 * Sensident — Endpoint RGPD désabonnement newsletter (art. 17 partiel)
 *
 * Un patient clique sur le lien "me désabonner" dans une newsletter.
 * Le token est un JWT-like signé HMAC : base64url(payload).base64url(sig)
 *
 * payload = { recipientId, cabinetId, ts }
 *   - recipientId : id de la ligne newsletter_recipients (unique par envoi+destinataire)
 *   - cabinetId   : scope cabinet (anti-rejeu cross-cabinet)
 *   - ts          : timestamp epoch ms (permet d'expirer le token à 90j)
 *
 * Vérification timing-safe via crypto.timingSafeEqual.
 * À l'expiration du token, on demande à l'utilisateur de re-cliquer depuis
 * une newsletter récente (cas légitime : patient qui désabonne 6 mois après
 * l'envoi).
 */
import { NextRequest, NextResponse } from 'next/server';
import crypto from 'node:crypto';
import { db } from '@/db/client';
import { newsletterRecipients, patientConsents, auditLogs } from '@/db/schema';
import { and, eq, sql } from 'drizzle-orm';
import type { UnsubscribePayload } from '@/lib/unsubscribe-token';

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
const SECRET = process.env.AUTH_SECRET || 'dev-secret';
const TOKEN_TTL_DAYS = 90; // Au-delà, on demande une confirmation fraîche

function verifyToken(token: string): UnsubscribePayload | null {
  const [payload, sig] = token.split('.');
  if (!payload || !sig) return null;

  const expected = crypto
    .createHmac('sha256', SECRET)
    .update(payload)
    .digest('base64url');

  // Comparaison timing-safe (longueurs égales obligatoires)
  const sigBuf = Buffer.from(sig);
  const expectedBuf = Buffer.from(expected);
  if (sigBuf.length !== expectedBuf.length) return null;
  if (!crypto.timingSafeEqual(sigBuf, expectedBuf)) return null;

  // Decode
  try {
    const decoded = JSON.parse(Buffer.from(payload, 'base64url').toString('utf-8')) as UnsubscribePayload;
    if (!decoded.recipientId || !decoded.cabinetId || !decoded.ts) return null;
    return decoded;
  } catch {
    return null;
  }
}

export async function GET(req: NextRequest) {
  const token = req.nextUrl.searchParams.get('t');
  if (!token) return NextResponse.redirect(new URL('/?error=missing_token', APP_URL));

  const payload = verifyToken(token);
  if (!payload) return NextResponse.redirect(new URL('/?error=invalid_token', APP_URL));

  // Vérifier expiration
  if (Date.now() - payload.ts > TOKEN_TTL_DAYS * 24 * 60 * 60 * 1000) {
    return NextResponse.redirect(new URL('/?error=expired_token', APP_URL));
  }

  // Trouve le recipient (sert d'anti-énumération : on n'expose pas l'email)
  const recipient = (await db
    .select()
    .from(newsletterRecipients)
    .where(
      and(
        eq(newsletterRecipients.id, payload.recipientId),
        eq(newsletterRecipients.cabinetId, payload.cabinetId)
      )
    )
    .limit(1))[0];

  if (!recipient) {
    // Pas de fuite d'info : on redirige vers la page merci dans tous les cas "safe"
    return NextResponse.redirect(new URL('/desabonnement/merci', APP_URL));
  }

  // Marquer le recipient comme désabonné (et la cascade se fait sur le consentement)
  await db
    .update(newsletterRecipients)
    .set({ status: 'unsubscribed', unsubscribedAt: new Date() })
    .where(eq(newsletterRecipients.id, recipient.id));

  // Propager au consent : on arrête d'envoyer pour ce hash dans CE cabinet
  await db
    .update(patientConsents)
    .set({ unsubscribedAt: new Date() })
    .where(
      and(
        eq(patientConsents.cabinetId, payload.cabinetId),
        eq(patientConsents.emailHash, recipient.patientEmailHash),
        sql`${patientConsents.unsubscribedAt} IS NULL`
      )
    );

  await db.insert(auditLogs).values({
    actorType: 'patient',
    cabinetId: payload.cabinetId,
    action: 'newsletter_unsubscribed',
    targetType: 'newsletter_recipient',
    targetId: recipient.id,
    metadata: {
      method: 'signed_token_link',
      recipient_id_prefix: recipient.id.slice(0, 8),
    },
  });

  return NextResponse.redirect(new URL('/desabonnement/merci', APP_URL));
}
