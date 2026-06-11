import { NextRequest, NextResponse } from 'next/server';
import crypto from 'node:crypto';
import { db } from '@/db/client';
import { patientConsents, cabinets, auditLogs } from '@/db/schema';
import { eq, and, sql } from 'drizzle-orm';

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
const CABINET_HASH_SALT = process.env.CABINET_HASH_SALT || 'dev-only-salt-replace-in-prod';

/**
 * GET /api/patient/confirm?token=***
 * Confirme l'opt-in d'un patient (double opt-in).
 * Le token contient l'emailHash + cabinetId + timestamp, signe en HMAC.
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

  // Marquer comme confirme
  const result = await db
    .update(patientConsents)
    .set({ confirmedAt: new Date() })
    .where(
      and(
        eq(patientConsents.cabinetId, decoded.cabinetId),
        eq(patientConsents.emailHash, emailHash),
        sql`${patientConsents.confirmedAt} IS NULL`
      )
    )
    .returning();

  if (result.length === 0) {
    return NextResponse.redirect(new URL('/?error=already_confirmed_or_unknown', APP_URL));
  }

  const cab = (await db.select().from(cabinets).where(eq(cabinets.id, decoded.cabinetId)).limit(1))[0];
  if (!cab) return NextResponse.redirect(new URL('/', APP_URL));

  await db.insert(auditLogs).values({
    actorType: 'patient',
    cabinetId: cab.id,
    action: 'optin_confirmed',
    targetType: 'patient_consent',
    targetId: result[0].id,
    metadata: { method: 'double_optin' },
  });

  // Redirige vers l'espace patient
  return NextResponse.redirect(new URL(`/c/${cab.slug}/bienvenue`, APP_URL));
}
