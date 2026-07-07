/**
 * GET /api/billing/portal
 *
 * 2026-07-07 14h (Tartrinator) — Demande Paul : pas de facturation pendant la
 * phase beta. Cette route renvoie sur /dashboard/account avec un message
 * d'information (au lieu de creer un Stripe Billing Portal).
 */
import { NextRequest, NextResponse } from 'next/server';
import { getSessionFromCookie } from '@/lib/auth';

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

export async function GET(_req: NextRequest) {
  const session = await getSessionFromCookie();
  if (!session || !session.mfaVerified) {
    return NextResponse.redirect(new URL('/login', APP_URL));
  }
  return NextResponse.redirect(
    new URL('/dashboard/account?billing_disabled=1', APP_URL),
  );
}