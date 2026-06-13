/**
 * Sensident — Route démo patient (MODE PREVIEW UNIQUEMENT)
 *
 * Crée une session patient factice pour la démo François.
 * Le cookie de session patient est nommé `demo_patient` (≠ `sensident_session`
 * praticien) et contient juste l'email hash + cabinetId.
 *
 * La page /c/[slug]/espace lit ce cookie en priorité quand SENSIDENT_DEMO_MODE=1.
 */
import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import crypto from 'node:crypto';
import { db } from '@/db/client';
import { cabinets, patientConsents } from '@/db/schema';
import { eq, and } from 'drizzle-orm';

const DEMO_CABINET_SLUG = 'demo-francois-thibault';
const DEMO_PATIENT_COOKIE = 'demo_patient';
const SALT = 'demo-salt-v1';

export async function POST(req: NextRequest) {
  if (process.env.SENSIDENT_DEMO_MODE !== '1') {
    return NextResponse.json(
      { error: 'Mode démo désactivé.' },
      { status: 404 }
    );
  }

  const host = req.headers.get('host') ?? '';
  const isLocal = host.startsWith('localhost') || host.startsWith('127.0.0.1');
  const isVercelPreview = host.endsWith('.vercel.app');
  if (!isLocal && !isVercelPreview) {
    return NextResponse.json(
      { error: 'Démo accessible uniquement depuis localhost ou Vercel preview.' },
      { status: 403 }
    );
  }

  // Trouve le cabinet démo
  const [cab] = await db
    .select()
    .from(cabinets)
    .where(eq(cabinets.slug, DEMO_CABINET_SLUG))
    .limit(1);

  if (!cab) {
    return NextResponse.json(
      { error: 'Cabinet démo non seedé. Lance d\'abord : node scripts/seed-demo-francois-sqlite.mjs' },
      { status: 404 }
    );
  }

  // Récupère un patient du cabinet (le 1er)
  const [patient] = await db
    .select()
    .from(patientConsents)
    .where(eq(patientConsents.cabinetId, cab.id))
    .limit(1);

  if (!patient) {
    return NextResponse.json(
      { error: 'Aucun patient dans le cabinet démo. Re-seeds nécessaire.' },
      { status: 404 }
    );
  }

  // Crée le cookie de session démo
  const cookieStore = await cookies();
  cookieStore.set(DEMO_PATIENT_COOKIE, JSON.stringify({
    cabinetId: cab.id,
    cabinetSlug: cab.slug,
    emailHash: patient.emailHash,
    createdAt: Date.now(),
  }), {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 60 * 60 * 4,  // 4h
  });

  return NextResponse.json({
    success: true,
    redirect: `/c/${cab.slug}/bienvenue?demo=1`,
    cabinet: { name: cab.name, slug: cab.slug },
  });
}

export async function DELETE() {
  const cookieStore = await cookies();
  cookieStore.delete(DEMO_PATIENT_COOKIE);
  return NextResponse.json({ success: true });
}
