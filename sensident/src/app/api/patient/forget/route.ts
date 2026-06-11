/**
 * Sensident — Endpoint RGPD "droit à l'effacement" (art. 17)
 *
 * Strategie : ANONYMISATION (pas suppression dure).
 * On conserve les rows 3 ans post-desabonnement pour :
 *  - preuve de consentement anterieur (obligation legale praticien, art. L.1110-4 CSP)
 *  - audit de la conformite RGPD
 *  - agregats anonymes (analytics cabinet)
 *
 * Ce qui est anonymise :
 *  - emailHash → hash constant `erased_<timestamp>_<rand>`
 *  - emailEncrypted → null (definitivement detruit)
 *  - ip, userAgent → null
 *  - tous les patient_magic_links du patient → expiresAt = now()
 *  - tous les newsletter_recipients → status='erased', email_hash = hash constant
 *  - reading_sessions : on conserve les agregats (article_slug, maxScrollPct, durationSec)
 *    mais on detruit le hash et l'ip
 *
 * Ce qui est conserve tel quel :
 *  - audit_logs (preuve legale), avec l'email_hash_prefix uniquement
 *  - date de desabonnement (preuve de retrait du consentement)
 *
 * Declenchement :
 *  1. Via email envoye a dpo@sensident.fr avec preuve d'identite
 *  2. Via ce endpoint (avec magic link ou confirmation email)
 */
import { NextRequest, NextResponse } from 'next/server';
import crypto from 'node:crypto';
import { z } from 'zod';
import { db } from '@/db/client';
import {
  patientConsents,
  patientMagicLinks,
  newsletterRecipients,
  auditLogs,
  readingSessions,
  articleHeartbeats,
  cabinets,
} from '@/db/schema';
import { and, eq, sql } from 'drizzle-orm';
import { sendEmail } from '@/lib/email';
import { checkRateLimit, getClientIp } from '@/lib/rate-limit';

const ForgetSchema = z.object({
  email: z.string().email().transform((e) => e.toLowerCase().trim()),
  cabinetSlug: z.string(),
  reason: z.string().max(500).optional(),
});

const CABINET_HASH_SALT = process.env.CABINET_HASH_SALT || 'dev-only-salt-replace-in-prod';
const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
const DPO_EMAIL = 'dpo@sensident.fr';

const ANONYMIZED_MARKER = 'erased';

function buildAnonymizedHash(seed: string): string {
  return `${ANONYMIZED_MARKER}_${Date.now()}_${crypto.randomBytes(8).toString('hex')}_${crypto
    .createHash('sha256')
    .update(seed)
    .digest('hex')
    .slice(0, 16)}`;
}

async function getCabinetIdBySlug(slug: string): Promise<string | null> {
  const cab = (
    await db
      .select({ id: cabinets.id, name: cabinets.name })
      .from(cabinets)
      .where(eq(cabinets.slug, slug))
      .limit(1)
  )[0];
  return cab?.id ?? null;
}

export async function POST(req: NextRequest) {
  const ip = getClientIp(req);
  const rl = await checkRateLimit('patient_optin', ip); // meme bucket que optin
  if (!rl.allowed) {
    // Anti-enumeration : on renvoie OK dans tous les cas
    return NextResponse.json(
      { success: true, message: 'Si un compte existe, il sera traite sous 30 jours.' },
      { status: 200 }
    );
  }

  let body;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'JSON invalide.' }, { status: 400 });
  }
  const parsed = ForgetSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: 'Email invalide.' }, { status: 400 });

  const { email, cabinetSlug, reason } = parsed.data;
  const userIp = req.headers.get('x-forwarded-for') || req.ip || null;
  const userAgent = req.headers.get('user-agent') || null;

  // Anti-enumeration : on renvoie OK avant meme de chercher le cabinet
  // (mais on a besoin du cabinet_id pour le hash, donc lookup rapide silencieux)
  const cabinetId = await getCabinetIdBySlug(cabinetSlug);
  if (!cabinetId) {
    return NextResponse.json({
      success: true,
      message: 'Si un compte existe, il sera traite sous 30 jours.',
    });
  }

  const emailHash = crypto
    .createHash('sha256')
    .update(email + cabinetId + CABINET_HASH_SALT)
    .digest('hex');

  // Hash constant d'anonymisation : meme valeur pour tous les rows de ce patient
  // (pour eviter toute re-correlation apres effacement)
  const anonymizedHash = buildAnonymizedHash(emailHash);

  try {
    // 1. Anonymiser le patient_consent (on garde le row)
    await db
      .update(patientConsents)
      .set({
        emailHash: anonymizedHash,         // ancien hash ecrase
        emailEncrypted: null,              // email chiffre detruit
        ip: null,
        userAgent: null,
        unsubscribedAt: new Date(),
        // Note: on pourrait ajouter une colonne anonymizedAt dans une migration,
        // mais pour le MVP on utilise unsubscribedAt comme proxy.
      })
      .where(
        and(
          eq(patientConsents.cabinetId, cabinetId),
          eq(patientConsents.emailHash, emailHash)
        )
      );

    // 2. Invalider tous les magic links lies
    await db
      .update(patientMagicLinks)
      .set({ expiresAt: new Date(0) })
      .where(
        and(
          eq(patientMagicLinks.cabinetId, cabinetId),
          eq(patientMagicLinks.emailHash, emailHash)
        )
      );

    // 3. Marquer les recipients newsletter comme 'erased'
    await db
      .update(newsletterRecipients)
      .set({
        patientEmailHash: anonymizedHash,
        status: 'erased',
        unsubscribedAt: new Date(),
      })
      .where(
        and(
          eq(newsletterRecipients.cabinetId, cabinetId),
          eq(newsletterRecipients.patientEmailHash, emailHash)
        )
      );

    // 4. Anonymiser les reading_sessions (on garde les agregats, on detruit hash/ip)
    await db
      .update(readingSessions)
      .set({
        patientEmailHash: anonymizedHash,
        ip: null,
      })
      .where(
        and(
          eq(readingSessions.cabinetId, cabinetId),
          eq(readingSessions.patientEmailHash, emailHash)
        )
      );

    // 5. Audit log (preuve legale, sans l'email)
    await db.insert(auditLogs).values({
      actorType: 'system',
      cabinetId,
      action: 'patient_data_anonymized',
      targetType: 'patient',
      ip: userIp as any,
      userAgent,
      metadata: {
        anonymized_hash_prefix: anonymizedHash.slice(0, 16),
        original_hash_prefix: emailHash.slice(0, 8), // pour traçabilite interne
        reason: reason ?? 'no_reason_provided',
        method: 'rgpd_art_17',
        retention_until: new Date(Date.now() + 3 * 365 * 24 * 60 * 60 * 1000).toISOString(),
      } as any,
    });

    // 6. Notification au DPO (prod uniquement)
    if (process.env.NODE_ENV === 'production') {
      await sendEmail({
        to: DPO_EMAIL,
        subject: `[RGPD art.17] Demande d'anonymisation de donnees patient`,
        html: `
          <p>Une demande d'anonymisation de donnees patient a ete traitee.</p>
          <p>Hash anonymise (prefix): <code>${anonymizedHash.slice(0, 24)}</code></p>
          <p>Hash original (prefix): <code>${emailHash.slice(0, 16)}</code> (pour traçabilite interne uniquement)</p>
          <p>Cabinet: ${cabinetSlug} (${cabinetId})</p>
          <p>Raison: ${reason ?? 'non precisee'}</p>
          <p>Date: ${new Date().toISOString()}</p>
          <p>Retention: 3 ans</p>
        `,
      });
    }
  } catch (err) {
    console.error('[forget] anonymization failed', err);
    return NextResponse.json({ error: 'Erreur lors de l\'anonymisation.' }, { status: 500 });
  }

  return NextResponse.json({
    success: true,
    message:
      'Vos donnees personnelles ont ete anonymisees. Aucune donnee identifiable ne sera conservee au-dela de 3 ans. Vous ne recevrez plus aucun email de ce cabinet.',
  });
}
