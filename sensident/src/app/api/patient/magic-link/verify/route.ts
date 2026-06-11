import { NextRequest, NextResponse } from 'next/server';
import crypto from 'node:crypto';
import { db } from '@/db/client';
import { patientMagicLinks, cabinets, patientConsents, auditLogs } from '@/db/schema';
import { eq, and, gt, isNull, sql } from 'drizzle-orm';

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

export async function GET(req: NextRequest) {
  const token = req.nextUrl.searchParams.get('token');
  const slug = req.nextUrl.searchParams.get('c');
  if (!token || !slug) {
    return NextResponse.redirect(new URL('/?error=missing_token', APP_URL));
  }

  const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
  const cab = (await db.select().from(cabinets).where(eq(cabinets.slug, slug)).limit(1))[0];
  if (!cab) return NextResponse.redirect(new URL('/?error=invalid_cabinet', APP_URL));

  const magic = (await db
    .select()
    .from(patientMagicLinks)
    .where(
      and(
        eq(patientMagicLinks.cabinetId, cab.id),
        eq(patientMagicLinks.tokenHash, tokenHash),
        gt(patientMagicLinks.expiresAt, new Date()),
        isNull(patientMagicLinks.usedAt)
      )
    )
    .limit(1))[0];

  if (!magic) {
    return NextResponse.redirect(new URL('/?error=invalid_or_expired_magic_link', APP_URL));
  }

  // Marquer comme utilise
  await db.update(patientMagicLinks).set({ usedAt: new Date() }).where(eq(patientMagicLinks.id, magic.id));

  // Poser un cookie de session patient (24h)
  // Note: pour le MVP, on utilise un cookie signe minimal.
  const sessionToken = crypto.randomBytes(32).toString('base64url');
  const sessionHash = crypto.createHash('sha256').update(sessionToken).digest('hex');
  await db.insert(patientMagicLinks).values({
    cabinetId: cab.id,
    emailHash: magic.emailHash,
    tokenHash: sessionHash,
    expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
  });

  await db.insert(auditLogs).values({
    actorType: 'patient',
    cabinetId: cab.id,
    action: 'patient_session_started',
  });

  const response = NextResponse.redirect(new URL(`/c/${cab.slug}/bienvenue`, APP_URL));
  response.cookies.set('sensident_patient_session', sessionToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 24 * 60 * 60,
  });
  response.cookies.set('sensident_current_cabinet', cab.id, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 24 * 60 * 60,
  });
  return response;
}
