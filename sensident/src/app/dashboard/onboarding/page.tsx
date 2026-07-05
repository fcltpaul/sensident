import { redirect } from 'next/navigation';
import { getSessionFromCookie } from '@/lib/auth';
import { OnboardingWizard } from './onboarding-wizard';

/**
 * /dashboard/onboarding — Wizard 3 étapes post-signup (PLAN-UX boucle 4).
 *
 * Côté serveur : check session + MFA, sinon redirect /login.
 * Le check "déjà terminé ?" est fait côté client dans le wizard :
 * on évite une query DB supplémentaire dans le layout (cf. crash 20/06).
 */
export default async function OnboardingPage() {
  const session = await getSessionFromCookie();
  if (!session) redirect('/login');
  if (!session.mfaVerified) redirect('/login/mfa');

  return <OnboardingWizard />;
}