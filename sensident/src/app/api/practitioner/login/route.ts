import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { db } from '@/db/client';
import { practitioners, practitionerSessions, auditLogs } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { authenticateLogin, createSession, setSessionCookie } from '@/lib/auth';
import { checkRateLimit, getClientIp } from '@/lib/rate-limit';

const LoginSchema = z.object({
  email: z.string().email().transform((e) => e.toLowerCase().trim()),
  password: z.string().min(1),
});

export async function POST(req: NextRequest) {
  // Rate limit par IP
  const ip = getClientIp(req);
  const rl = await checkRateLimit('login_practitioner', ip);
  if (!rl.allowed) {
    return NextResponse.json(
      { error: 'Trop de tentatives. Reessayez dans quelques minutes.' },
      {
        status: 429,
        headers: {
          'Retry-After': String(rl.retryAfterSec ?? 60),
          'X-RateLimit-Reset': String(Math.floor(rl.resetAt.getTime() / 1000)),
        },
      }
    );
  }

  let body;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'JSON invalide.' }, { status: 400 });
  }

  const parsed = LoginSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: 'Email ou mot de passe invalide.' }, { status: 400 });
  }

  const practitioner = await authenticateLogin(parsed.data.email, parsed.data.password);
  if (!practitioner) {
    return NextResponse.json({ error: 'Email ou mot de passe incorrect.' }, { status: 401 });
  }

  const userAgent = req.headers.get('user-agent') || undefined;

  // Si MFA pas encore active (cas de l'inscription), on exige verify-mfa
  const requiresMfa = practitioner.totpEnabled;

  const { token, expiresAt } = await createSession({
    practitionerId: practitioner.id,
    cabinetId: practitioner.cabinetId,
    ip,
    userAgent,
    mfaVerified: !requiresMfa,  // Si MFA pas active, on considere qu'on est "verify"
  });
  setSessionCookie(token, expiresAt);

  // Audit
  await db.insert(auditLogs).values({
    actorType: 'practitioner',
    actorId: practitioner.id,
    cabinetId: practitioner.cabinetId,
    action: 'login_password_ok',
    ip: ip ?? null,
    userAgent,
  });

  return NextResponse.json({ success: true, requiresMfa });
}
