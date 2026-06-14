import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import crypto from 'node:crypto';
import { db } from '@/db/client';
import { cabinets, patientConsents, inviteTokens, auditLogs } from '@/db/schema';
import { eq, and, gt, isNull } from 'drizzle-orm';
import { sendConfirmationEmail, generateConfirmToken } from '@/lib/email';
import { checkRateLimit, getClientIp } from '@/lib/rate-limit';
import { enforceMaxPatients, FeatureDeniedError } from '@/lib/features';

const OptinSchema = z.object({
  cabinetId: z.string().min(8),  // UUID en prod, hex en dev SQLite
  email: z.string().email().max(255).transform((e) => e.toLowerCase().trim()),
  cguAccepted: z.literal(true),
  newsletterOptin: z.boolean(),
});

const CGU_VERSION = 'v1.0-2026-06-08';
const OPTIN_VERSION = 'v1.0-2026-06-08';
const CABINET_HASH_SALT = process.env.CABINET_HASH_SALT || 'dev-only-cabinet-salt-replace-in-prod';

export async function POST(req: NextRequest) {
  const ip = getClientIp(req);
  const rl = await checkRateLimit('patient_optin', ip);
  if (!rl.allowed) {
    return NextResponse.json(
      { error: 'Trop de tentatives. Reessayez plus tard.' },
      { status: 429, headers: { 'Retry-After': String(rl.retryAfterSec ?? 60) } }
    );
  }

  let body;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'JSON invalide.' }, { status: 400 });
  }

  const parsed = OptinSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: 'Vous devez accepter les CGU.' }, { status: 400 });
  }

  const { cabinetId, email, newsletterOptin } = parsed.data;

  // Verifier cabinet existe
  const cabinet = await db.select().from(cabinets).where(eq(cabinets.id, cabinetId)).limit(1);
  if (cabinet.length === 0) {
    return NextResponse.json({ error: 'Cabinet introuvable.' }, { status: 404 });
  }
  const cab = cabinet[0];

  // Hash email pour counts distincts anonymises (A1)
  const emailHash = crypto
    .createHash('sha256')
    .update(email + cab.id + CABINET_HASH_SALT)
    .digest('hex');

  // Verifier si deja inscrit
  const existing = await db
    .select({ id: patientConsents.id, confirmedAt: patientConsents.confirmedAt })
    .from(patientConsents)
    .where(and(eq(patientConsents.cabinetId, cab.id), eq(patientConsents.emailHash, emailHash)))
    .limit(1);

  if (existing.length > 0) {
    if (existing[0].confirmedAt) {
      return NextResponse.json({ error: 'Vous etes deja inscrit·e. Consultez votre boite mail pour acceder a votre espace.' }, { status: 409 });
    }
    // Pas encore confirme, on renvoie l'email
    const confirmToken = generateConfirmToken(email, cab.id);
    await sendConfirmationEmail({ to: email, cabinet: cab, confirmToken });
    return NextResponse.json({ success: true, message: 'Email de confirmation renvoye.' });
  }

  // Creer le consentement
  const userAgent = req.headers.get('user-agent') || null;

  // Trouver invite_token optionnel (si on est passe par un lien /rejoindre?token=)
  // Note: on pourrait le passer dans le body, mais on simplifie pour le MVP
  // Bypass Drizzle : postgres-js + Date column crash (14/06/2026)
  let inviteToken: { id: string }[] = [];
  if ((await import('@/db/client')).DB_DIALECT === 'postgresql') {
    const { rawSqlClient } = await import('@/db/client');
    const nowIso = new Date().toISOString();
    // postgres-js tagged template : on passe cab.id comme string, on caste
    // explicitement en uuid dans la clause WHERE
    inviteToken = await rawSqlClient<{ id: string }[]>`
      SELECT id FROM invite_tokens
      WHERE cabinet_id::text = ${cab.id}
        AND expires_at > ${nowIso}::timestamptz
        AND revoked_at IS NULL
      ORDER BY created_at DESC LIMIT 1
    `;
  } else {
    inviteToken = await db
      .select({ id: inviteTokens.id })
      .from(inviteTokens)
      .where(
        and(
          eq(inviteTokens.cabinetId, cab.id),
          gt(inviteTokens.expiresAt, new Date()),
          isNull(inviteTokens.revokedAt)
        )
      )
      .limit(1);
  }

  // Gate feature : quota max patients (free:100, pro:1000, cabinet:10000)
  try {
    await enforceMaxPatients(cab.id);
  } catch (e) {
    if (e instanceof FeatureDeniedError) {
      return NextResponse.json(
        {
          error: "Ce cabinet a atteint la limite de patients inclus dans son plan. Le praticien doit passer au plan superieur pour accepter de nouveaux patients.",
          code: 'quota_exceeded',
          feature: e.feature,
          plan: e.currentPlan,
        },
        { status: 403 }
      );
    }
    throw e;
  }

  // Stocker l'email encode (base64) pour l'envoi newsletter
  // En prod : PGP-encrypt via OpenPGP.js
  const emailEncrypted = Buffer.from(email).toString('base64');

  await db.insert(patientConsents).values({
    cabinetId: cab.id,
    emailHash,
    emailEncrypted,
    optInVersion: OPTIN_VERSION,
    cguAccepted: true,
    newsletterOptin,
    ip: ip as any,
    userAgent,
    inviteTokenId: inviteToken[0]?.id || null,
  });

  // Audit
  await db.insert(auditLogs).values({
    actorType: 'patient',
    cabinetId: cab.id,
    action: 'optin_created',
    targetType: 'patient_consent',
    ip: ip as any,
    userAgent,
    metadata: { newsletterOptin },
  });

  // Envoyer l'email de confirmation (double opt-in)
  const confirmToken = generateConfirmToken(email, cab.id);
  await sendConfirmationEmail({ to: email, cabinet: cab, confirmToken });

  return NextResponse.json({ success: true, message: 'Email de confirmation envoye.' });
}
