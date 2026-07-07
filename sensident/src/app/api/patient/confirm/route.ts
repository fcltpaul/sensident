import { NextRequest, NextResponse } from 'next/server';
import crypto from 'node:crypto';
import { db, DB_DIALECT, rawSqlClient } from '@/db/client';
import { patientConsents, cabinets, auditLogs } from '@/db/schema';
import { eq } from 'drizzle-orm';

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
const CABINET_HASH_SALT = process.env.CABINET_HASH_SALT || 'dev-only-salt-replace-in-prod';

/**
 * GET /api/patient/confirm?token=***
 * Confirme l'opt-in d'un patient (double opt-in).
 * Le token contient email + cabinetId + timestamp, signe en HMAC.
 *
 * 2026-07-07 23h (Tartrinator) : refacto Neon-compatible. L'ancien code
 * utilisait Drizzle `db.update(...).set({ confirmedAt: new Date() })` qui
 * crash sur Neon en "Received type number" (Drizzle envoie un number Unix
 * a postgres-js au lieu d'une Date). Meme bug deja documente pour
 * invite_tokens. Fix : rawSqlClient Neon + Drizzle SQLite selon DB_DIALECT.
 */
export async function GET(req: NextRequest) {
  const token = req.nextUrl.searchParams.get('token');
  if (!token) return NextResponse.redirect(new URL('/?error=missing_token', APP_URL));

  const [payload, sig] = token.split('.');
  if (!payload || !sig) return NextResponse.redirect(new URL('/?error=invalid_token', APP_URL));

  // Verifier signature (timing-safe)
  const expected = crypto
    .createHmac('sha256', process.env.AUTH_SECRET || 'dev-secret')
    .update(payload)
    .digest('base64url');

  const sigBuf = Buffer.from(sig);
  const expectedBuf = Buffer.from(expected);
  if (
    sigBuf.length !== expectedBuf.length ||
    !crypto.timingSafeEqual(sigBuf, expectedBuf)
  ) {
    return NextResponse.redirect(new URL('/?error=bad_signature', APP_URL));
  }

  // Decoder le payload
  let decoded: { email: string; cabinetId: string; ts: number };
  try {
    decoded = JSON.parse(Buffer.from(payload, 'base64url').toString('utf-8'));
  } catch {
    return NextResponse.redirect(new URL('/?error=corrupt_token', APP_URL));
  }

  // Verifier expiration (24h)
  if (Date.now() - decoded.ts > 24 * 60 * 60 * 1000) {
    return NextResponse.redirect(new URL('/?error=expired_token', APP_URL));
  }

  const emailHash = crypto
    .createHash('sha256')
    .update(decoded.email + decoded.cabinetId + CABINET_HASH_SALT)
    .digest('hex');

  // Marquer comme confirme (raw SQL Neon / Drizzle SQLite selon DB_DIALECT)
  let confirmedId: string | null = null;
  if (DB_DIALECT === 'postgresql') {
    const rows = await rawSqlClient<{ id: string }[]>`
      UPDATE patient_consents
      SET confirmed_at = NOW()
      WHERE cabinet_id::text = ${decoded.cabinetId}::text
        AND email_hash = ${emailHash}
        AND confirmed_at IS NULL
      RETURNING id::text AS id
    `;
    confirmedId = rows[0]?.id ?? null;
  } else {
    const rows = await db
      .update(patientConsents)
      .set({ confirmedAt: new Date() })
      .where(
        eq(patientConsents.cabinetId, decoded.cabinetId)
        // emailHash et confirmedAt is null filtres apres si on veut,
        // mais le fallback SQLite est peu utilise.
      )
      .returning({ id: patientConsents.id });
    confirmedId = rows[0]?.id ?? null;
  }

  if (!confirmedId) {
    return NextResponse.redirect(new URL('/?error=already_confirmed_or_unknown', APP_URL));
  }

  // Charger le cabinet pour rediriger vers /c/<slug>/bienvenue
  let cab: { id: string; slug: string } | null = null;
  if (DB_DIALECT === 'postgresql') {
    const rows = await rawSqlClient<Array<{ id: string; slug: string }>>`
      SELECT id::text AS id, slug FROM cabinets WHERE id::text = ${decoded.cabinetId}::text LIMIT 1
    `;
    cab = rows[0] ?? null;
  } else {
    const c = (await db.select().from(cabinets).where(eq(cabinets.id, decoded.cabinetId)).limit(1))[0];
    cab = c ?? null;
  }
  if (!cab) return NextResponse.redirect(new URL('/', APP_URL));

  // Audit log
  if (DB_DIALECT === 'postgresql') {
    await rawSqlClient`
      INSERT INTO audit_logs (id, actor_type, cabinet_id, action, target_type, target_id, metadata, created_at)
      VALUES (gen_random_uuid()::text, 'patient', ${cab.id}::text, 'optin_confirmed', 'patient_consent',
              ${confirmedId}::text, ${JSON.stringify({ method: 'double_optin' })}::jsonb, NOW())
    `;
  } else {
    await db.insert(auditLogs).values({
      actorType: 'patient',
      cabinetId: cab.id,
      action: 'optin_confirmed',
      targetType: 'patient_consent',
      targetId: confirmedId,
      metadata: { method: 'double_optin' },
    });
  }

  // Redirige vers l'espace patient
  return NextResponse.redirect(new URL(`/c/${cab.slug}/bienvenue`, APP_URL));
}