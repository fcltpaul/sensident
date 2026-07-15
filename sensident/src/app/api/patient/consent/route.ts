/**
 * Sensident — PUT /api/patient/consent
 *
 * Consentement granulaire patient : enregistre/ou retire 3 finalites
 * independantes (newsletter, analytics, reactions).
 *
 * Authentification : cookie sensident_patient_session
 * (pose par la verification du magic link).
 *
 * Note 2026-07-15 (Tartrinator) : cette route souffrait de la dette Drizzle
 * + postgres-js v3+ (Date bind + eq(cabinetId) sur uuid) qui crashait en
 * Neon avec ERR_INVALID_ARG_TYPE ou silencieusement. Repasser en raw SQL
 * Neon est le pattern deja applique sur /api/patient/optin (commit b79e2b2).
 */
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import crypto from 'node:crypto';
import { db, DB_DIALECT, rawSqlClient } from '@/db/client';
import { patientConsents, consentLog, patientMagicLinks, auditLogs } from '@/db/schema';
import { eq, and, gt, isNull, sql } from 'drizzle-orm';

const CONSENT_VERSION = '1.0';

const FinaliteSchema = z.object({
  finalite: z.enum(['newsletter', 'analytics', 'reactions']),
  consenti: z.boolean(),
});

const BodySchema = z.object({
  finalites: z.array(FinaliteSchema).min(1),
  version: z.string().optional().default(CONSENT_VERSION),
});

// ============================================
// Session validation (patient magic link cookie)
// ============================================
async function getPatientSession(req: NextRequest): Promise<{
  patientConsentId: string;
  cabinetId: string;
  emailHash: string;
} | null> {
  const sessionToken = req.cookies.get('sensident_patient_session')?.value;
  if (!sessionToken) return null;

  const sessionHash = crypto
    .createHash('sha256')
    .update(sessionToken)
    .digest('hex');

  // Bypass Drizzle Neon (eq() sur uuid + Date bind) - meme pattern que b79e2b2.
  let session: { id: string; cabinetId: string; emailHash: string } | null = null;
  if (DB_DIALECT === 'postgresql') {
    const rows = await rawSqlClient<Array<{
      id: string; cabinet_id: string; email_hash: string;
    }>>`
      SELECT id::text AS id, cabinet_id::text AS cabinet_id, email_hash
      FROM patient_magic_links
      WHERE token_hash = ${sessionHash}
        AND expires_at > ${new Date().toISOString()}::timestamptz
        AND used_at IS NULL
      LIMIT 1
    `;
    if (rows[0]) {
      session = { id: rows[0].id, cabinetId: rows[0].cabinet_id, emailHash: rows[0].email_hash };
    }
  } else {
    const row = (await db
      .select()
      .from(patientMagicLinks)
      .where(
        and(
          eq(patientMagicLinks.tokenHash, sessionHash),
          gt(patientMagicLinks.expiresAt, new Date()),
          isNull(patientMagicLinks.usedAt)
        )
      )
      .limit(1))[0];
    if (row) {
      session = { id: row.id, cabinetId: row.cabinetId, emailHash: row.emailHash };
    }
  }

  if (!session) return null;

  // Trouver le patient consent correspondant (raw SQL Neon, eq uuid -> crash)
  let consent: { id: string } | null = null;
  if (DB_DIALECT === 'postgresql') {
    const rows = await rawSqlClient<Array<{ id: string }>>`
      SELECT id::text AS id FROM patient_consents
      WHERE cabinet_id::text = ${session.cabinetId}::text
        AND email_hash = ${session.emailHash}
        AND confirmed_at IS NOT NULL
      LIMIT 1
    `;
    consent = rows[0] ?? null;
  } else {
    const row = (await db
      .select({ id: patientConsents.id })
      .from(patientConsents)
      .where(
        and(
          eq(patientConsents.cabinetId, session.cabinetId),
          eq(patientConsents.emailHash, session.emailHash),
          sql`${patientConsents.confirmedAt} IS NOT NULL`
        )
      )
      .limit(1))[0];
    consent = row ?? null;
  }

  if (!consent) return null;

  return {
    patientConsentId: consent.id,
    cabinetId: session.cabinetId,
    emailHash: session.emailHash,
  };
}

export async function PUT(req: NextRequest) {
  // 1. Authentifier le patient
  const session = await getPatientSession(req);
  if (!session) {
    return NextResponse.json(
      { error: 'Non authentifie. Veuillez vous reconnecter via votre lien magique.' },
      { status: 401 }
    );
  }

  // 2. Parser le body
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'JSON invalide.' }, { status: 400 });
  }

  const parsed = BodySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Format invalide.', details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const { finalites, version } = parsed.data;
  const now = new Date();

  // 3. Pour chaque finalite : upsert dans consent_log
  //    Raw SQL Neon pour eviter Date bind + eq(uuid).
  for (const { finalite, consenti } of finalites) {
    if (DB_DIALECT === 'postgresql') {
      const nowIso = now.toISOString();
      // Upsert via UPDATE-if-exists, INSERT-otherwise
      const existing = await rawSqlClient<Array<{ id: string }>>`
        SELECT id::text AS id FROM consent_log
        WHERE patient_id::text = ${session.patientConsentId}::text
          AND finalite = ${finalite}
        LIMIT 1
      `;
      if (existing[0]) {
        await rawSqlClient`
          UPDATE consent_log
          SET consenti = ${consenti},
              version = ${version},
              timestamp = ${nowIso}::timestamptz,
              source = 'account'
          WHERE id::text = ${existing[0].id}::text
        `;
      } else {
        await rawSqlClient`
          INSERT INTO consent_log (id, patient_id, cabinet_id, finalite, consenti, version, source, timestamp)
          VALUES (
            gen_random_uuid()::text,
            ${session.patientConsentId}::text,
            ${session.cabinetId}::text,
            ${finalite},
            ${consenti},
            ${version},
            'account',
            ${nowIso}::timestamptz
          )
        `;
      }
    } else {
      // SQLite dev : Drizzle inchange
      const existing = (
        await db
          .select({ id: consentLog.id })
          .from(consentLog)
          .where(
            and(
              eq(consentLog.patientId, session.patientConsentId),
              eq(consentLog.finalite, finalite)
            )
          )
          .limit(1)
      )[0];

      if (existing) {
        await db
          .update(consentLog)
          .set({ consenti, version, timestamp: now, source: 'account' })
          .where(eq(consentLog.id, existing.id));
      } else {
        await db.insert(consentLog).values({
          patientId: session.patientConsentId,
          cabinetId: session.cabinetId,
          finalite,
          consenti,
          version,
          timestamp: now,
          source: 'account',
        });
      }
    }
  }

  // 4. Mettre a jour les colonnes consent_* dans patient_consents
  //    Map finalite -> colonne patient_consents
  const colMap: Record<string, 'consentNewsletter' | 'consentAnalytics' | 'consentReactions'> = {
    newsletter: 'consentNewsletter',
    analytics: 'consentAnalytics',
    reactions: 'consentReactions',
  };
  const updates: Record<string, boolean> = {};
  for (const { finalite, consenti } of finalites) {
    updates[colMap[finalite]] = consenti;
  }

  if (DB_DIALECT === 'postgresql') {
    const nowIso = now.toISOString();
    // Si newsletter == false -> desabonnement
    const unsubscribedAt = updates['consentNewsletter'] === false ? nowIso : null;
    await rawSqlClient`
      UPDATE patient_consents
      SET
        consent_newsletter = ${updates['consentNewsletter'] ?? null},
        consent_analytics = ${updates['consentAnalytics'] ?? null},
        consent_reactions = ${updates['consentReactions'] ?? null},
        consent_version = ${version},
        consent_timestamp = ${nowIso}::timestamptz,
        unsubscribed_at = ${unsubscribedAt}::timestamptz
      WHERE id::text = ${session.patientConsentId}::text
    `;
  } else {
    await db
      .update(patientConsents)
      .set({
        ...updates,
        consentVersion: version,
        consentTimestamp: now,
        unsubscribedAt: updates['consentNewsletter'] === false ? now : null,
      } as any)
      .where(eq(patientConsents.id, session.patientConsentId));
  }

  // 5. Audit log
  if (DB_DIALECT === 'postgresql') {
    const nowIso = now.toISOString();
    const metadataJson = JSON.stringify({
      finalites: finalites.map((f) => ({ finalite: f.finalite, consenti: f.consenti })),
      version,
    });
    await rawSqlClient`
      INSERT INTO audit_logs (id, actor_type, cabinet_id, action, target_type, target_id, metadata, ts)
      VALUES (
        gen_random_uuid()::text,
        'patient',
        ${session.cabinetId}::text,
        'consent_updated',
        'patient_consent',
        ${session.patientConsentId}::text,
        ${metadataJson}::jsonb,
        ${nowIso}::timestamptz
      )
    `;
  } else {
    await db.insert(auditLogs).values({
      actorType: 'patient',
      cabinetId: session.cabinetId,
      action: 'consent_updated',
      targetType: 'patient_consent',
      targetId: session.patientConsentId,
      metadata: {
        finalites: finalites.map((f) => ({ finalite: f.finalite, consenti: f.consenti })),
        version,
      },
    });
  }

  return NextResponse.json({ success: true });
}