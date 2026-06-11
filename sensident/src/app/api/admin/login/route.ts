import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import bcrypt from 'bcryptjs';
import { db } from '@/db/client';
import { admins, adminSessions, auditLogs } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { createAdminSession, setAdminCookie, verifyPassword } from '@/lib/admin-auth';
import { checkRateLimit, getClientIp } from '@/lib/rate-limit';

const LoginSchema = z.object({
  email: z.string().email().transform((e) => e.toLowerCase().trim()),
  password: z.string().min(1),
});

export async function POST(req: NextRequest) {
  const ip = getClientIp(req);
  const rl = await checkRateLimit('login_admin', ip);
  if (!rl.allowed) {
    return NextResponse.json(
      { error: 'Trop de tentatives. Reessayez dans quelques minutes.' },
      {
        status: 429,
        headers: { 'Retry-After': String(rl.retryAfterSec ?? 60) },
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

  const result = await db.select().from(admins).where(eq(admins.email, parsed.data.email)).limit(1);
  if (result.length === 0) {
    // Constant-time fake
    await bcrypt.compare(parsed.data.password, '$2a$12$invalidinvalidinvalidinvalidinvalidinvalidinvalidinvalidi');
    return NextResponse.json({ error: 'Identifiants invalides.' }, { status: 401 });
  }

  const admin = result[0];
  const passwordOk = await verifyPassword(parsed.data.password, admin.passwordHash);
  if (!passwordOk) {
    return NextResponse.json({ error: 'Identifiants invalides.' }, { status: 401 });
  }

  const userAgent = req.headers.get('user-agent') || undefined;

  const requiresMfa = admin.totpEnabled;
  const { token, expiresAt } = await createAdminSession({
    adminId: admin.id,
    ip,
    userAgent,
    mfaVerified: !requiresMfa,
  });
  setAdminCookie(token, expiresAt);

  await db.insert(auditLogs).values({
    actorType: 'admin',
    actorId: admin.id,
    action: 'admin_login',
    ip: ip ?? null,
    userAgent,
  });

  return NextResponse.json({ success: true, requiresMfa });
}
