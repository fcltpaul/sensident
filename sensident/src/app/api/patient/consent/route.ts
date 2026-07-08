/**
 * Sensident — PUT /api/patient/consent
 *
 * Consentement granulaire patient : enregistre/ou retire 3 finalites
 * indépendantes (newsletter, analytics, reactions).
 *
 * Authentification : cookie sensident_patient_session
 * (posé par la vérification du magic link).
 */
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import crypto from 'node:crypto';
import { db, DB_DIALECT, rawSqlClient } from '@/db/client';
import { patientConsents, consentLog, patientMagicLinks, cabinets, auditLogs } from '@/db/schema';
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

  const session = await (async () => {
    if (DB_DIALECT === 'postgresql') {
      // Fix 2026-07-08 : postgres-js v3+ ne serialise pas les Date en bind.
      // On force un string ISO + cast ::timestamptz.
      const rows = await rawSqlClient<Array<{
        id: string; cabinet_id: string; email_hash: string;
        used_at: string | null; expires_at: string | Date;
      }>>`
        SELECT id::text AS id, cabinet_id::text AS cabinet_id, email_hash,
               used_at::text AS used_at, expires_at
        FROM patient_magic_links
        WHERE token_hash = ${sessionHash}
          AND expires_at > ${new Date().toISOString()}::timestamptz
          AND used_at IS NULL
        LIMIT 1
      `;
      return rows[0];
    }
    return (await db
      .select()
      .from(patientMagicLinks)
      .where(
        and(
          eq(patientMagicLinks.tokenHash, sessionHash),
          gt(patientMagicLinks.expiresAt, new Date()),
          isNull(patientMagicLinks.usedAt)  // la session a été posée après usage du magic link
        )
      )
      .limit(1))[0];
  })();

  if (!session) return null;

  // Trouver le patient consent correspondant
  const consent = (
    await db
      .select()
      .from(patientConsents)
      .where(
        and(
          eq(patientConsents.cabinetId, session.cabinetId),
          eq(patientConsents.emailHash, session.emailHash),
          sql`${patientConsents.confirmedAt} IS NOT NULL`
        )
      )
      .limit(1)
  )[0];

  if (!consent) return null;

  return {
    patientConsentId: consent.id,
    cabinetId: (session as any).cabinetId ?? (session as any).cabinet_id,
    emailHash: (session as any).emailHash ?? (session as any).email_hash,
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

  // 3. Pour chaque finalité : upsert dans consent_log + mettre à jour patients
  const updates: Record<string, boolean> = {};

  for (const { finalite, consenti } of finalites) {
    // Upsert dans consent_log : si une ligne existe déjà pour ce patient+finalité,
    // on la met à jour ; sinon on insère.
    // SQLite / PG : on vérifie d'abord l'existence (upsert Drizzle pas natif)
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
        .set({
          consenti,
          version,
          timestamp: now,
          source: 'account',
        })
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

    // Mapper finalite -> colonne patient_consents
    const colMap: Record<string, string> = {
      newsletter: 'consentNewsletter',
      analytics: 'consentAnalytics',
      reactions: 'consentReactions',
    };
    updates[colMap[finalite]] = consenti;
  }

  // 4. Mettre à jour les colonnes consent_* dans patient_consents
  await db
    .update(patientConsents)
    .set({
      ...updates,
      consentVersion: version,
      consentTimestamp: now,
      // Si newsletter == false → désabonnement
      unsubscribedAt: updates['consentNewsletter'] === false ? now : undefined,
    } as any)
    .where(eq(patientConsents.id, session.patientConsentId));

  // 5. Audit log
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

  return NextResponse.json({ success: true });
}
