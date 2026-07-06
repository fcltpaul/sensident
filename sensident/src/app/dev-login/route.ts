/**
 * Endpoint DEV UNIQUEMENT : connecte automatiquement un praticien de test
 * et redirige vers /dashboard.
 *
 * Usage : https://sensidentv0.vercel.app/dev-login?email=fcltpaul@gmail.com
 *
 * Authentifie sans mot de passe (utilise createSession directement).
 * NE PAS exposer en prod : le flow normal doit toujours exiger un mot de passe.
 * Un garde-fou refuse l'acces si NODE_ENV=production et qu'un domain
 * autorise n'est pas matche.
 */
import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db/client';
import { practitioners } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { createSession, setSessionCookie } from '@/lib/auth';

export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const email = url.searchParams.get('email') || 'fcltpaul@gmail.com';

  // Garde-fou : ce endpoint est reserve au dev. En prod, on exige que
  // ALLOW_DEV_LOGIN=1 soit explicitement defini, sinon on renvoie 404.
  if (process.env.NODE_ENV === 'production' && process.env.ALLOW_DEV_LOGIN !== '1') {
    return new NextResponse('Not Found', { status: 404 });
  }

  // Cherche le praticien
  const [practitioner] = await db
    .select()
    .from(practitioners)
    .where(eq(practitioners.email, email))
    .limit(1);

  if (!practitioner) {
    return NextResponse.json({ error: 'Compte introuvable.' }, { status: 404 });
  }

  // Cree la session + cookie
  const userAgent = req.headers.get('user-agent') || undefined;
  const { token, expiresAt } = await createSession({
    practitionerId: practitioner.id,
    cabinetId: practitioner.cabinetId,
    ip: '0.0.0.0',
    userAgent,
    mfaVerified: !practitioner.totpEnabled,
  });
  setSessionCookie(token, expiresAt);

  // Redirect vers dashboard
  return NextResponse.redirect(new URL('/dashboard', req.url));
}
