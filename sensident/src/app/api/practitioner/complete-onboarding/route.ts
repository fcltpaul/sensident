import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db/client';
import { practitioners } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { getSessionFromCookie } from '@/lib/auth';

/**
 * POST /api/practitioner/complete-onboarding
 * Marque l'onboarding comme terminé pour le praticien courant.
 * Appelé à la fin de l'étape 3 du wizard /dashboard/onboarding (ou via "Skip" à l'étape 1).
 *
 * Idempotent : si déjà terminé, renvoie ok sans rien faire.
 */
export async function POST(_request: NextRequest) {
  const session = await getSessionFromCookie();
  if (!session || !session.mfaVerified) {
    return NextResponse.json({ error: 'Non autorisé.' }, { status: 401 });
  }

  await db
    .update(practitioners)
    .set({
      onboardingCompletedAt: new Date(),
      updatedAt: new Date(),
    })
    .where(eq(practitioners.id, session.practitionerId));

  return NextResponse.json({ ok: true, onboardingCompletedAt: new Date().toISOString() });
}