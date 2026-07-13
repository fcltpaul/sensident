import { NextRequest, NextResponse } from 'next/server';
import crypto from 'node:crypto';
import { db, DB_DIALECT, rawSqlClient } from '@/db/client';
import { cabinets, patientConsents } from '@/db/schema';
import { and, eq } from 'drizzle-orm';
import { getSessionFromCookie } from '@/lib/auth';
import { sendConfirmationEmail, generateConfirmToken } from '@/lib/email';

/**
 * POST /api/library/quick-send
 * Envoie un magic link a un patient pour acceder a un article specifique.
 * Double opt-in : le patient confirme via le lien, puis est redirige vers l'article.
 *
 * Audit 2026-07-07 03h (fix P0) :
 *  - Avant : withCabinetContext + eq(patientConsents.cabinetId) => crash Neon
 *    (dette cabinet_id uuid vs text). La route renvoyait silencieusement 500.
 *  - Avant : on lisait patient.email qui n'existe pas (seul emailEncrypted,
 *    base64, est en BDD). Le token etait genere avec undefined.
 *  - Fix : on lit via rawSqlClient (Neon) ou Drizzle (SQLite), on decode le
 *    base64 pour recuperer l'email en clair, on genere le token, on envoie.
 *  - Le cabinet lookup utilise le pattern ::text pour Neon (idem send route).
 */
export async function POST(request: NextRequest) {
  const session = await getSessionFromCookie();
  if (!session || !session.mfaVerified) {
    return NextResponse.json({ error: 'Non authorise' }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'JSON invalide' }, { status: 400 });
  }

  const articleSlug = (body as any)?.articleSlug;
  const patientEmailHash = (body as any)?.patientEmailHash;
  if (!articleSlug || typeof articleSlug !== 'string') {
    return NextResponse.json({ error: 'articleSlug requis' }, { status: 400 });
  }
  if (!patientEmailHash || typeof patientEmailHash !== 'string') {
    return NextResponse.json({ error: 'patientEmailHash requis' }, { status: 400 });
  }

  // 1. Recuperer le patient
  type PatientRow = { email_encrypted: string | null };
  type CabinetRow = { id: string; name: string; slug: string };

  let patient: PatientRow | null = null;
  let cabinet: CabinetRow | null = null;

  if (DB_DIALECT === 'postgresql') {
    const pRows = await rawSqlClient<PatientRow[]>`
      SELECT email_encrypted FROM patient_consents
      WHERE cabinet_id::text = ${session.cabinetId}::text
        AND email_hash = ${patientEmailHash}
      LIMIT 1
    `;
    patient = pRows[0] ?? null;

    const cRows = await rawSqlClient<CabinetRow[]>`
      SELECT id::text AS id, name, slug FROM cabinets
      WHERE id::text = ${session.cabinetId}::text
      LIMIT 1
    `;
    cabinet = cRows[0] ?? null;
  } else {
    const pRows = await db
      .select({ emailEncrypted: patientConsents.emailEncrypted })
      .from(patientConsents)
      .where(
        and(
          eq(patientConsents.cabinetId, session.cabinetId),
          eq(patientConsents.emailHash, patientEmailHash),
        ),
      )
      .limit(1);
    patient = pRows[0] ? { email_encrypted: pRows[0].emailEncrypted } : null;

    const cRows = await db
      .select({ id: cabinets.id, name: cabinets.name, slug: cabinets.slug })
      .from(cabinets)
      .where(eq(cabinets.id, session.cabinetId))
      .limit(1);
    cabinet = cRows[0] ?? null;
  }

  if (!patient) {
    return NextResponse.json({ error: 'Patient introuvable' }, { status: 404 });
  }
  if (!cabinet) {
    return NextResponse.json({ error: 'Cabinet introuvable' }, { status: 404 });
  }

  // 2. Decoder l'email en clair (emailEncrypted est du base64 cote BDD)
  let patientEmail: string | null = null;
  if (patient.email_encrypted) {
    try {
      patientEmail = Buffer.from(patient.email_encrypted, 'base64').toString('utf-8').trim();
    } catch {
      patientEmail = null;
    }
  }
  if (!patientEmail || !patientEmail.includes('@')) {
    return NextResponse.json(
      { error: 'Email patient illisible (donnee corrompue ou chiffrement non supporte)' },
      { status: 422 },
    );
  }

  // 3. Generer le token de confirmation. 2026-07-13 : on passe l'article
  //    comme query param `&redirect=<slug>` (pas inline dans le token comme
  //    precedemment — l'ancien hack cassait la signature HMAC du token).
  const confirmToken = generateConfirmToken(patientEmail, session.cabinetId);

  // 4. Envoyer via le flux opt-in standard (email + audit email_logs)
  await sendConfirmationEmail({
    to: patientEmail,
    cabinet: cabinet as any,
    confirmToken,
    articleSlug, // <2026-07-13 : route /api/patient/confirm redirige vers l'article
  });

  // 5. Audit action praticien (best-effort, ne bloque pas l'envoi)
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
          'library_quick_send',
          'patient',
          ${patientEmailHash},
          ${JSON.stringify({ articleSlug })}::jsonb
        )
      `;
    } else {
      const { auditLogs } = await import('@/db/schema');
      await db.insert(auditLogs).values({
        actorType: 'practitioner',
        actorId: session.practitionerId,
        cabinetId: session.cabinetId,
        action: 'library_quick_send',
        targetType: 'patient',
        targetId: patientEmailHash,
        metadata: { articleSlug },
      });
    }
  } catch (auditErr) {
    console.error('[quick-send] audit insert failed:', auditErr);
  }

  return NextResponse.json({ ok: true, message: 'Lien envoye par email' });
}