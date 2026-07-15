import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import crypto from 'node:crypto';
import { db, DB_DIALECT, rawSqlClient } from '@/db/client';
import { cabinets, patientConsents, inviteTokens, auditLogs, consentLog } from '@/db/schema';
import { eq, and, gt, isNull } from 'drizzle-orm';
import { sendConfirmationEmail, generateConfirmToken } from '@/lib/email';
import { checkRateLimit, getClientIp } from '@/lib/rate-limit';
import { enforceMaxPatients, FeatureDeniedError } from '@/lib/features';

const OptinSchema = z.object({
  cabinetId: z.string().min(8),  // UUID en prod, hex en dev SQLite
  email: z.string().email().max(255).transform((e) => e.toLowerCase().trim()),
  cguAccepted: z.literal(true),
  newsletterOptin: z.boolean(),
  // RGPD 3 finalités (analytics + reactions optionnels, défaut false)
  analyticsOptin: z.boolean().optional().default(false),
  reactionsOptin: z.boolean().optional().default(false),
  // Optionnels — collectés pour personnaliser le contenu. Pas persistés en BDD
  // pour le MVP (cf. MEMORY 2026-07-02). À migrer en V2 (colonnes firstName, birthYear).
  firstName: z.string().min(1).max(100).optional(),
  birthYear: z.string().regex(/^\d{4}$/).optional(),
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

  const { cabinetId, email, newsletterOptin, analyticsOptin, reactionsOptin, firstName, birthYear } = parsed.data;

  // Verifier cabinet existe
  // Fix 2026-07-15 (Tartrinator) : eq(cabinets.id) Drizzle sur uuid Neon
  // = crash silencieux. On bypass en raw SQL Neon (cf. pattern features.ts).
  let cab: typeof cabinets.$inferSelect | null = null;
  if (DB_DIALECT === 'postgresql') {
    const rows = await rawSqlClient<Array<typeof cabinets.$inferSelect>>`
      SELECT id::text AS id, slug, name, rpps,
             created_at, updated_at,
             contact_address, contact_phone, contact_email, contact_rdv_url,
             contact_opening_hours, contact_facade_photo_url, contact_oncd_mention,
             contact_map_url,
             newsletter_branding, newsletter_cadence
      FROM cabinets WHERE id::text = ${cabinetId}::text LIMIT 1
    `;
    cab = (rows[0] as any) ?? null;
  } else {
    const cabinet = await db.select().from(cabinets).where(eq(cabinets.id, cabinetId)).limit(1);
    cab = cabinet[0] ?? null;
  }
  if (!cab) {
    return NextResponse.json({ error: 'Cabinet introuvable.' }, { status: 404 });
  }

  // Hash email pour counts distincts anonymises (A1)
  const emailHash = crypto
    .createHash('sha256')
    .update(email + cab.id + CABINET_HASH_SALT)
    .digest('hex');

  // Verifier si deja inscrit
  // Fix 2026-07-15 (Tartrinator) : eq(cabinetId) Drizzle + cabinet_id uuid en Neon
  // = crash. On bypass en raw SQL Neon (cf. pattern features.ts).
  let existing: { id: string; confirmedAt: Date | null }[] = [];
  if (DB_DIALECT === 'postgresql') {
    const rows = await rawSqlClient<Array<{ id: string; confirmed_at: Date | null }>>`
      SELECT id::text AS id, confirmed_at FROM patient_consents
      WHERE cabinet_id::text = ${cab.id}::text AND email_hash = ${emailHash}
      LIMIT 1
    `;
    existing = rows.map(r => ({ id: r.id, confirmedAt: r.confirmed_at }));
  } else {
    existing = await db
      .select({ id: patientConsents.id, confirmedAt: patientConsents.confirmedAt })
      .from(patientConsents)
      .where(and(eq(patientConsents.cabinetId, cab.id), eq(patientConsents.emailHash, emailHash)))
      .limit(1);
  }

  if (existing.length > 0) {
    if (existing[0].confirmedAt) {
      // Deja confirme : on renvoie le mail de confirmation (avec un message
      // adapte) plutot que de renvoyer 409. L'utilisateur peut alors cliquer
      // le lien pour acceder a son espace. 2026-07-07 23h20 UX fix.
      const confirmToken = generateConfirmToken(email, cab.id);
      await sendConfirmationEmail({ to: email, cabinet: cab, confirmToken });
      return NextResponse.json({
        success: true,
        alreadyConfirmed: true,
        message: 'Vous etes deja inscrit·e. Un nouveau lien d\'acces vient d\'etre envoye sur votre boite mail.',
      });
    }
    // Pas encore confirme, on renvoie l'email de confirmation
    const confirmToken = generateConfirmToken(email, cab.id);
    await sendConfirmationEmail({ to: email, cabinet: cab, confirmToken });
    return NextResponse.json({ success: true, message: 'Email de confirmation renvoye.' });
  }

  // Creer le consentement
  const userAgent = req.headers.get('user-agent') || null;

  // Trouver invite_token optionnel (si on est passe par un lien /rejoindre?token=)
  // Note: on pourrait le passer dans le body, mais on simplifie pour le MVP
  // Bypass Drizzle : postgres-js + Date column crash (14/06/2026) - cf. commit b61c3b6.
  // En Neon on bypasse Drizzle via rawSqlClient + ::text / ::timestamptz.
  let inviteToken: { id: string }[] = [];
  if (DB_DIALECT === 'postgresql') {
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

  // 2026-07-15 (Tartrinator) : la dette Drizzle + postgres-js v3+ Date bind
  // (cf. commit b61c3b6) fait crasher l'INSERT en Neon avec
  // "The 'string' argument must be of type string ... Received type number
  // (1784104970)". Symptôme prod : POST /api/patient/optin -> HTTP 500.
  // Fix : on bypasse Drizzle et on INSERT en raw SQL Neon avec cast explicite
  // des colonnes timestamp (::timestamptz) et uuid (::text). SQLite reste en
  // Drizzle (dev only).
  const consentTimestamp = new Date();
  const ipParam = ip && ip !== 'unknown' ? ip : null;
  let newConsentId: string | null = null;
  if (DB_DIALECT === 'postgresql') {
    const nowIso = consentTimestamp.toISOString();
    const inserted = await rawSqlClient<Array<{ id: string }>>`
      INSERT INTO patient_consents (
        id, cabinet_id, email_hash, email_encrypted, opt_in_version,
        cgu_accepted, newsletter_optin,
        consent_newsletter, consent_analytics, consent_reactions,
        consent_version, consent_timestamp,
        ip, user_agent, invite_token_id, created_at
      )
      VALUES (
        gen_random_uuid()::text,
        ${cab.id}::text,
        ${emailHash},
        ${emailEncrypted},
        ${OPTIN_VERSION},
        true,
        ${newsletterOptin},
        ${newsletterOptin},
        ${analyticsOptin ?? false},
        ${reactionsOptin ?? false},
        ${OPTIN_VERSION},
        ${nowIso}::timestamptz,
        ${ipParam}::inet,
        ${userAgent},
        ${inviteToken[0]?.id ?? null}::text,
        ${nowIso}::timestamptz
      )
      RETURNING id::text AS id
    `;
    newConsentId = inserted[0]?.id ?? null;
  } else {
    const insertedConsent = await db.insert(patientConsents).values({
      cabinetId: cab.id,
      emailHash,
      emailEncrypted,
      optInVersion: OPTIN_VERSION,
      cguAccepted: true,
      newsletterOptin,
      consentNewsletter: newsletterOptin,
      consentAnalytics: analyticsOptin ?? false,
      consentReactions: reactionsOptin ?? false,
      consentVersion: OPTIN_VERSION,
      consentTimestamp,
      ip: ip as any,
      userAgent,
      inviteTokenId: inviteToken[0]?.id || null,
    }).returning({ id: patientConsents.id });
    newConsentId = insertedConsent[0]?.id ?? null;
  }

  // RGPD : écriture audit trail granulaire dans consent_log (article 7 RGPD)
  // Une ligne par finalité → patient peut voir/modifier chaque consentement,
  // et le cabinet peut prouver la conformité à tout moment.
  // Idem : raw SQL Neon (Drizzle Date bind crasherait sur timestamp defaultNow).
  if (newConsentId) {
    if (DB_DIALECT === 'postgresql') {
      const nowIso = consentTimestamp.toISOString();
      await rawSqlClient`
        INSERT INTO consent_log (id, patient_id, cabinet_id, finalite, consenti, version, source, timestamp)
        VALUES
          (gen_random_uuid()::text, ${newConsentId}::text, ${cab.id}::text, 'newsletter', ${newsletterOptin}, ${OPTIN_VERSION}, 'onboarding', ${nowIso}::timestamptz),
          (gen_random_uuid()::text, ${newConsentId}::text, ${cab.id}::text, 'analytics', ${analyticsOptin ?? false}, ${OPTIN_VERSION}, 'onboarding', ${nowIso}::timestamptz),
          (gen_random_uuid()::text, ${newConsentId}::text, ${cab.id}::text, 'reactions', ${reactionsOptin ?? false}, ${OPTIN_VERSION}, 'onboarding', ${nowIso}::timestamptz)
      `;
    } else {
      await db.insert(consentLog).values([
        { patientId: newConsentId, cabinetId: cab.id, finalite: 'newsletter', consenti: newsletterOptin, version: OPTIN_VERSION, source: 'onboarding' },
        { patientId: newConsentId, cabinetId: cab.id, finalite: 'analytics', consenti: analyticsOptin ?? false, version: OPTIN_VERSION, source: 'onboarding' },
        { patientId: newConsentId, cabinetId: cab.id, finalite: 'reactions', consenti: reactionsOptin ?? false, version: OPTIN_VERSION, source: 'onboarding' },
      ]);
    }
  }

  // Audit
  // Idem : raw SQL Neon (Drizzle Date bind sur audit_logs.ts defaultNow crash).
  if (DB_DIALECT === 'postgresql') {
    const nowIso = consentTimestamp.toISOString();
    const metadataJson = JSON.stringify({
      newsletterOptin,
      analyticsOptin: analyticsOptin ?? false,
      reactionsOptin: reactionsOptin ?? false,
      hasFirstName: !!firstName,
      hasBirthYear: !!birthYear,
    });
    await rawSqlClient`
      INSERT INTO audit_logs (id, actor_type, cabinet_id, action, target_type, target_id, ip, user_agent, metadata, ts)
      VALUES (
        gen_random_uuid()::text, 'patient', ${cab.id}::text, 'optin_created', 'patient_consent',
        ${newConsentId}::text, ${ipParam}::inet, ${userAgent},
        ${metadataJson}::jsonb, ${nowIso}::timestamptz
      )
    `;
  } else {
    await db.insert(auditLogs).values({
      actorType: 'patient',
      cabinetId: cab.id,
      action: 'optin_created',
      targetType: 'patient_consent',
      ip: ip as any,
      userAgent,
      metadata: {
        newsletterOptin,
        analyticsOptin: analyticsOptin ?? false,
        reactionsOptin: reactionsOptin ?? false,
        // Stockés ici en attendant la migration V2 (colonnes firstName/birthYear).
        hasFirstName: !!firstName,
        hasBirthYear: !!birthYear,
      },
    });
  }

  // Envoyer l'email de confirmation (double opt-in)
  const confirmToken = generateConfirmToken(email, cab.id);
  await sendConfirmationEmail({ to: email, cabinet: cab, confirmToken });

  return NextResponse.json({ success: true, message: 'Email de confirmation envoye.' });
}
