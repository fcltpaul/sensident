import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  const log: string[] = [];
  try {
    const { db, DB_DIALECT, rawSqlClient } = await import('@/db/client');
    const { practitioners, cabinets, auditLogs, cabinetSubscriptions } = await import('@/db/schema');
    const { eq } = await import('drizzle-orm');
    const bcrypt = await import('bcryptjs');
    const otplib = await import('otplib');
    const { createSession } = await import('@/lib/auth');
    const { checkRateLimit, getClientIp } = await import('@/lib/rate-limit');
    const crypto = await import('node:crypto');

    log.push(`step 1: env ok DB_DIALECT=${DB_DIALECT}`);
    const ip = getClientIp(req);
    const body = await req.json();
    log.push(`step 2: body parsed`);

    // rl first (mimic signup)
    const rl = await checkRateLimit('login_practitioner', ip);
    log.push(`step 3: rl allowed=${rl.allowed}`);

    // existing email
    const existingEmail = await db.select({ id: practitioners.id }).from(practitioners).where(eq(practitioners.email, body.email)).limit(1);
    log.push(`step 4: existingEmail count=${existingEmail.length}`);
    if (existingEmail.length > 0) return NextResponse.json({ ok: false, log, err: 'email already exists' }, { status: 409 });

    const existingSlug = await db.select({ id: cabinets.id }).from(cabinets).where(eq(cabinets.slug, body.slug)).limit(1);
    log.push(`step 5: existingSlug count=${existingSlug.length}`);

    // cabinet insert Drizzle
    log.push(`step 6: db.insert(cabinets) Drizzle`);
    const [cabinet] = await db.insert(cabinets).values({ name: body.cabinetName, slug: body.slug }).returning();
    log.push(`step 7: cabinet inserted id=${cabinet.id}`);

    const passwordHash = await bcrypt.hash(body.password, 12);
    const totpSecret = otplib.authenticator.generateSecret();
    log.push(`step 8: pwd hash + totp secret`);

    log.push(`step 9: db.insert(practitioners) Drizzle`);
    const [practitioner] = await db.insert(practitioners).values({
      cabinetId: cabinet.id,
      email: body.email,
      name: body.email,
      passwordHash,
      totpSecret,
      totpEnabled: false,
    }).returning();
    log.push(`step 10: practitioner inserted id=${practitioner.id}`);

    log.push(`step 11: db.insert(cabinetSubscriptions) Drizzle`);
    await db.insert(cabinetSubscriptions).values({
      cabinetId: cabinet.id,
      plan: 'free',
      status: 'active',
    });
    log.push(`step 12: subscription ok`);

    log.push(`step 13: db.insert(auditLogs) Drizzle`);
    await db.insert(auditLogs).values({
      actorType: 'practitioner',
      actorId: practitioner.id,
      cabinetId: cabinet.id,
      action: 'signup',
      targetType: 'cabinet',
      targetId: cabinet.id,
    });
    log.push(`step 14: audit ok`);

    log.push(`step 15: createSession`);
    const { token, expiresAt } = await createSession({
      practitionerId: practitioner.id,
      cabinetId: cabinet.id,
      ip,
      mfaVerified: false,
    });
    log.push(`step 16: session token=${token.substring(0,8)}...`);

    return NextResponse.json({ ok: true, log, cabinetId: cabinet.id, practitionerId: practitioner.id });
  } catch (e: any) {
    log.push(`OUTER ERR: ${e.message}`);
    log.push(`STACK: ${(e.stack||'').substring(0,1000)}`);
    return NextResponse.json({ ok: false, log, error: e.message, stack: (e.stack||'').substring(0,1500) }, { status: 500 });
  }
}
