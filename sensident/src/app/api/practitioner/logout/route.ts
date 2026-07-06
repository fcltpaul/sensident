import { NextResponse } from 'next/server';
import { destroySession } from '@/lib/auth';

export async function POST() {
  const response = NextResponse.redirect(
    new URL('/login', process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'),
  );

  // Important : destroySession() modifie le cookieStore cote serveur, mais
  // ces modifs ne sont PAS propagees automatiquement au client dans une
  // route API qui retourne un NextResponse.redirect(). On force le Set-Cookie
  // ici pour etre sur que le navigateur supprime le cookie de session.
  // Cf. https://github.com/vercel/next.js/issues/49425
  response.cookies.set('sensident_session', '', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    expires: new Date(0), // date passee = suppression immediate
  });

  // Detruit la session en BDD en parallele (pas besoin d'attendre)
  destroySession().catch((e) => console.error('[logout] destroySession error:', e));

  return response;
}
