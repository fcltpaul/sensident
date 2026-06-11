import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { db } from '@/db/client';
import { admins, auditLogs } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { getAdminSession, createAdminSession, setAdminCookie, destroyAdminSession, verifyTotp } from '@/lib/admin-auth';

const MfaSchema = z.object({ totpCode: z.string().regex(/^\d{6}$/) });

export async function POST(req: NextRequest) {
  let body;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'JSON invalide.' }, { status: 400 });
  }

  const parsed = MfaSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: 'Code invalide.' }, { status: 400 });
  }

  const session = await getAdminSession();
  if (!session) {
    return NextResponse.json({ error: 'Session expirée.' }, { status: 401 });
  }

  const admin = (await db.select().from(admins).where(eq(admins.id, session.adminId)).limit(1))[0];
  if (!admin || !admin.totpSecret) {
    return NextResponse.json({ error: 'MFA non configuré.' }, { status: 400 });
  }

  if (!verifyTotp(admin.totpSecret, parsed.data.totpCode)) {
    return NextResponse.json({ error: 'Code incorrect.' }, { status: 400 });
  }

  if (!admin.totpEnabled) {
    await db.update(admins).set({ totpEnabled: true }).where(eq(admins.id, admin.id));
  }

  // Refresh session with mfaVerified = true
  const ip = req.headers.get('x-forwarded-for') || req.ip || undefined;
  const userAgent = req.headers.get('user-agent') || undefined;
  await destroyAdminSession();
  const { token, expiresAt } = await createAdminSession({
    adminId: admin.id,
    ip,
    userAgent,
    mfaVerified: true,
  });
  setAdminCookie(token, expiresAt);

  await db.insert(auditLogs).values({
    actorType: 'admin',
    actorId: admin.id,
    action: 'admin_mfa_ok',
    ip: ip ?? null,
    userAgent,
  });

  return NextResponse.json({ success: true });
}
