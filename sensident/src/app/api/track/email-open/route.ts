/**
 * Sensident — Tracking pixel d'ouverture email
 *
 * GET /api/track/email-open?t={token}
 *
 * Token format : {payload}.{sig}
 *   payload = base64url(JSON.stringify({ h: emailHash, c: cabinetId, s: sendId }))
 *   sig     = base64url(HMAC-SHA256(payload, AUTH_SECRET))
 *
 * Premier open : UPDATE newsletterRecipients SET openedAt=now(), status='opened'
 * Opens suivants : no-op (idempotent)
 *
 * Renvoie toujours un GIF 1x1 transparent (même si token invalide) :
 * pas de fuite d'information, pas de 404 qui casserait le rendu email.
 */
import { NextRequest, NextResponse } from 'next/server';
import crypto from 'node:crypto';
import { db } from '@/db/client';
import { newsletterRecipients, patientConsents } from '@/db/schema';
import { and, eq, isNull } from 'drizzle-orm';

const SECRET = process.env.AUTH_SECRET || 'dev-secret';

// GIF 1x1 transparent (43 octets) — pas de fichier à servir
const TRANSPARENT_GIF = Buffer.from(
  'R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7',
  'base64'
);

const GIF_HEADERS = {
  'Content-Type': 'image/gif',
  'Cache-Control': 'no-store, no-cache, must-revalidate, private',
} as const;

interface TrackingPayload {
  h: string; // emailHash
  c: string; // cabinetId
  s: string; // sendId
}

function verifyToken(token: string): TrackingPayload | null {
  const dotIdx = token.indexOf('.');
  if (dotIdx === -1) return null;
  const payload = token.slice(0, dotIdx);
  const sig = token.slice(dotIdx + 1);
  if (!payload || !sig) return null;

  const expected = crypto
    .createHmac('sha256', SECRET)
    .update(payload)
    .digest('base64url');

  // Comparaison timing-safe
  const sigBuf = Buffer.from(sig);
  const expectedBuf = Buffer.from(expected);
  if (sigBuf.length !== expectedBuf.length) return null;
  if (!crypto.timingSafeEqual(sigBuf, expectedBuf)) return null;

  try {
    const decoded = JSON.parse(
      Buffer.from(payload, 'base64url').toString('utf-8')
    ) as TrackingPayload;
    if (!decoded.h || !decoded.c || !decoded.s) return null;
    return decoded;
  } catch {
    return null;
  }
}

export async function GET(req: NextRequest): Promise<NextResponse> {
  const token = req.nextUrl.searchParams.get('t');
  const payload = token ? verifyToken(token) : null;

  if (payload) {
    try {
      // RGPD article 7 : verifier que le patient a consenti aux analytics
      // AVANT de marquer l'email comme ouvert (sinon fuyant).
      const consent = await db
        .select({ consentAnalytics: patientConsents.consentAnalytics })
        .from(patientConsents)
        .where(
          and(
            eq(patientConsents.cabinetId, payload.c),
            eq(patientConsents.emailHash, payload.h),
          ),
        )
        .limit(1);
      const hasAnalyticsConsent = consent[0]?.consentAnalytics === true;

      if (!hasAnalyticsConsent) {
        // Patient sans consentement analytics : on ne log pas l'open pixel.
        // On renvoie quand meme le GIF pour ne pas casser le rendu email.
        return new NextResponse(TRANSPARENT_GIF, { status: 200, headers: GIF_HEADERS });
      }

      // Trouver le recipient correspondant
      const recipient = (
        await db
          .select()
          .from(newsletterRecipients)
          .where(
            and(
              eq(newsletterRecipients.sendId, payload.s),
              eq(newsletterRecipients.cabinetId, payload.c),
              eq(newsletterRecipients.patientEmailHash, payload.h),
              isNull(newsletterRecipients.openedAt),
            )
          )
          .limit(1)
      )[0];

      if (recipient) {
        // Premier open : marquer comme ouvert
        await db
          .update(newsletterRecipients)
          .set({ openedAt: new Date(), status: 'opened' })
          .where(eq(newsletterRecipients.id, recipient.id));
      }
      // Si déjà ouvert : la clause isNull(openedAt) fait qu'on ne le trouve pas → no-op
    } catch {
      // Silencieux : on renvoie le GIF même en cas d'erreur DB
    }
  }

  // Toujours renvoyer le GIF transparent (même si token invalide/absent)
  return new NextResponse(TRANSPARENT_GIF, {
    status: 200,
    headers: GIF_HEADERS,
  });
}
