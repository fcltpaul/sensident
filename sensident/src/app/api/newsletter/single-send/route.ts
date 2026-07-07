import { NextRequest, NextResponse } from 'next/server';
import crypto from 'node:crypto';
import { eq, and } from 'drizzle-orm';
import { z } from 'zod';
import { db, DB_DIALECT, rawSqlClient } from '@/db/client';
import { cabinets, patientConsents } from '@/db/schema';
import { getSessionFromCookie } from '@/lib/auth';
import { sendConfirmationEmail, generateConfirmToken } from '@/lib/email';

const BodySchema = z.object({
  articleSlug: z.string().min(1),
  patientEmailHash: z.string().min(1),
  patientEmail: z.string().email(),
  customMessage: z.string().max(500).nullable(),
});

/**
 * POST /api/newsletter/single-send
 *
 * Envoi d'un article a UN patient specifique avec double opt-in.
 * Use case : depuis /dashboard/engagement, le praticien clique "Newsletter"
 * sur un patient donne et est redirige vers /dashboard/newsletter/compose.
 *
 * Le patient recoit un email d'opt-in avec magic link qui le redirige
 * vers l'article apres confirmation.
 *
 * Audit 2026-07-07 09h (P3) : route creee pour resoudre le 404 sur les
 * liens depuis /dashboard/engagement. Reutilise sendConfirmationEmail
 * (deja teste Neon-compatible) + audit_logs metadata articleSlug.
 */
export async function POST(request: NextRequest) {
  const session = await getSessionFromCookie();
  if (!session || !session.mfaVerified) {
    return NextResponse.json({ error: 'Non autorise' }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'JSON invalide' }, { status: 400 });
  }

  const parsed = BodySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: 'Donnees invalides', details: parsed.error.format() }, { status: 400 });
  }

  const { articleSlug, patientEmailHash, patientEmail, customMessage } = parsed.data;

  // 1. Verifier que le patient appartient bien au cabinet (isolation multi-tenant)
  type PatientRow = { email_hash: string };
  let patient: PatientRow | null = null;
  if (DB_DIALECT === 'postgresql') {
    const rows = await rawSqlClient<PatientRow[]>`
      SELECT email_hash FROM patient_consents
      WHERE cabinet_id::text = ${session.cabinetId}::text
        AND email_hash = ${patientEmailHash}
      LIMIT 1
    `;
    patient = rows[0] ?? null;
  } else {
    const r = await db
      .select({ emailHash: patientConsents.emailHash })
      .from(patientConsents)
      .where(
        and(
          eq(patientConsents.cabinetId, session.cabinetId),
          eq(patientConsents.emailHash, patientEmailHash),
        ),
      )
      .limit(1);
    patient = r[0] ? { email_hash: r[0].emailHash } : null;
  }

  if (!patient) {
    return NextResponse.json({ error: 'Patient introuvable dans votre cabinet' }, { status: 404 });
  }

  // 2. Charger le cabinet
  type CabinetRow = { id: string; name: string; slug: string };
  let cabinet: CabinetRow | null = null;
  if (DB_DIALECT === 'postgresql') {
    const rows = await rawSqlClient<CabinetRow[]>`
      SELECT id::text AS id, name, slug FROM cabinets
      WHERE id::text = ${session.cabinetId}::text LIMIT 1
    `;
    cabinet = rows[0] ?? null;
  } else {
    const r = await db
      .select({ id: cabinets.id, name: cabinets.name, slug: cabinets.slug })
      .from(cabinets)
      .where(eq(cabinets.id, session.cabinetId))
      .limit(1);
    cabinet = r[0] ?? null;
  }

  if (!cabinet) {
    return NextResponse.json({ error: 'Cabinet introuvable' }, { status: 404 });
  }

  // 3. Generer le token avec redirect vers l'article apres confirmation
  const baseToken = generateConfirmToken(patientEmail, session.cabinetId);
  // Encode le message custom dans le token (limite 500 chars avant opt-in, sera
  // recupere a la confirmation si besoin). Pour MVP on stocke juste le slug.
  const confirmToken = `${baseToken}%3Aredirect%3D${articleSlug}`;

  // 4. Envoyer l'email d'opt-in
  await sendConfirmationEmail({
    to: patientEmail,
    cabinet: cabinet as any,
    confirmToken,
  });

  // 5. Audit (best-effort)
  try {
    if (DB_DIALECT === 'postgresql') {
      await rawSqlClient`
        INSERT INTO audit_logs (id, ts, actor_type, actor_id, cabinet_id, action, target_type, target_id, metadata)
        VALUES (
          ${crypto.randomUUID()}::text,
          NOW(),
          'practitioner',
          ${session.practitionerId}::text,
          ${session.cabinetId}::text,
          'newsletter_single_send',
          'patient',
          ${patientEmailHash},
          ${JSON.stringify({
            articleSlug,
            hasCustomMessage: !!customMessage,
            customMessageLength: customMessage?.length ?? 0,
          })}::jsonb
        )
      `;
    } else {
      const { auditLogs } = await import('@/db/schema');
      await db.insert(auditLogs).values({
        actorType: 'practitioner',
        actorId: session.practitionerId,
        cabinetId: session.cabinetId,
        action: 'newsletter_single_send',
        targetType: 'patient',
        targetId: patientEmailHash,
        metadata: {
          articleSlug,
          hasCustomMessage: !!customMessage,
          customMessageLength: customMessage?.length ?? 0,
        },
      });
    }
  } catch (auditErr) {
    console.error('[single-send] audit insert failed:', auditErr);
  }

  return NextResponse.json({
    ok: true,
    message: `Email envoye a ${patientEmail}. Le patient doit confirmer via le lien pour acceder a l'article.`,
  });
}