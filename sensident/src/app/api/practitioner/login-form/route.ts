/**
 * Login endpoint pour formulaire HTML natif.
 *
 * Reçoit un POST application/x-www-form-urlencoded (formulaire HTML),
 * cree la session, redirige vers le dashboard ou affiche l'erreur.
 *
 * Pourquoi cet endpoint : sur certains mobiles, un <form action="...">
 * HTML natif fonctionne quand un fetch POST JSON depuis <form onSubmit>
 * est silencieusement bloque. Ce endpoint garantit une compatibilite
 * maximale cote navigateur.
 */
import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db/client';
import { practitioners } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { verifyPassword, createSession, setSessionCookie } from '@/lib/auth';
import { checkRateLimit, getClientIp } from '@/lib/rate-limit';

export async function POST(req: NextRequest) {
  const ip = getClientIp(req);
  const rl = await checkRateLimit('login_practitioner', ip);
  if (!rl.allowed) {
    return NextResponse.redirect(
      new URL('/login?error=rate_limited', req.url),
      { status: 303 },
    );
  }

  // Parse le form data
  const form = await req.formData();
  const email = (form.get('email') as string || '').toLowerCase().trim();
  const password = (form.get('password') as string || '');
  const next = (form.get('next') as string || '/dashboard');

  if (!email || !password) {
    return NextResponse.redirect(
      new URL('/login?error=Email+et+mot+de+passage+requis', req.url),
      { status: 303 },
    );
  }

  const [practitioner] = await db
    .select()
    .from(practitioners)
    .where(eq(practitioners.email, email))
    .limit(1);

  if (!practitioner) {
    // Anti-enumeration : on delai avant de repondre
    await new Promise((r) => setTimeout(r, 200));
    return NextResponse.redirect(
      new URL('/login?error=invalid_credentials', req.url),
      { status: 303 },
    );
  }

  const valid = await verifyPassword(password, practitioner.passwordHash);
  if (!valid) {
    await new Promise((r) => setTimeout(r, 200));
    return NextResponse.redirect(
      new URL('/login?error=invalid_credentials', req.url),
      { status: 303 },
    );
  }

  // MFA
  const requiresMfa = practitioner.totpEnabled;
  const userAgent = req.headers.get('user-agent') || undefined;

  const { token, expiresAt } = await createSession({
    practitionerId: practitioner.id,
    cabinetId: practitioner.cabinetId,
    ip,
    userAgent,
    mfaVerified: !requiresMfa,
  });

  // Important : NextResponse.redirect avec 303 pour que le navigateur
  // suive le redirect apres un POST form. Set-Cookie doit etre sur la
  // reponse de redirect pour etre transmis au navigateur.
  const redirectTo = requiresMfa
    ? new URL('/login/mfa', req.url)
    : new URL(next.startsWith('/') ? next : '/dashboard', req.url);

  const response = NextResponse.redirect(redirectTo, { status: 303 });
  setSessionCookieOnResponse(response, token, expiresAt);
  return response;
}

/**
 * Helper : set le cookie sensident_session directement sur la response.
 * (Le cookieStore.set() dans un POST form ne propage pas au client via
 * NextResponse.redirect(), il faut le faire explicitement.)
 */
function setSessionCookieOnResponse(
  response: NextResponse,
  token: string,
  expiresAt: Date,
) {
  response.cookies.set('sensident_session', token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    expires: expiresAt,
  });
}
