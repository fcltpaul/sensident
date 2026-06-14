import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const { hashPassword, generateTotpSecret, getTotpUri, generateQrCodeDataUrl, createSession, setSessionCookie, passwordMeetsPolicy } = await import('@/lib/auth');
    const { db, DB_DIALECT } = await import('@/db/client');
    const { cabinets, practitioners, cabinetSubscriptions, auditLogs } = await import('@/db/schema');
    const { eq } = await import('drizzle-orm');
    const { getClientIp, checkRateLimit } = await import('@/lib/rate-limit');
    const crypto = await import('node:crypto');

    const ip = getClientIp(req);
    const body = await req.json();
    const { email, password, cabinetName, slug } = body;

    const policy = passwordMeetsPolicy(password);
    if (!policy.ok) return NextResponse.json({ err: policy.reason }, { status: 400 });

    const existingEmail = await db.select({ id: practitioners.id }).from(practitioners).where(eq(practitioners.email, email)).limit(1);
    if (existingEmail.length > 0) return NextResponse.json({ err: 'email exists' }, { status: 409 });

    const existingSlug = await db.select({ id: cabinets.id }).from(cabinets).where(eq(cabinets.slug, slug)).limit(1);
    if (existingSlug.length > 0) return NextResponse.json({ err: 'slug exists' }, { status: 409 });

    // Mimic EXACT signup route
    const [cabinet] = await db.insert(cabinets).values({ id: crypto.randomUUID(), name: cabinetName, slug }).returning();

    const passwordHash = await hashPassword(password);
    const totpSecret = generateTotpSecret();

    const [practitioner] = await db.insert(practitioners).values({
      cabinetId: cabinet.id,
      email,
      name: email,
      passwordHash,
      totpSecret,
      totpEnabled: false,
    }).returning();

    await db.insert(cabinetSubscriptions).values({
      id: crypto.randomUUID(),
      cabinetId: cabinet.id,
      plan: 'free',
      status: 'active',
    });

    await db.insert(auditLogs).values({
      id: crypto.randomUUID(),
      actorType: 'practitioner',
      actorId: practitioner.id,
      cabinetId: cabinet.id,
      action: 'signup',
      targetType: 'cabinet',
      targetId: cabinet.id,
    });

    const { token, expiresAt } = await createSession({
      practitionerId: practitioner.id,
      cabinetId: cabinet.id,
      ip,
      mfaVerified: false,
    });
    setSessionCookie(token, expiresAt);

    const totpUri = getTotpUri(totpSecret, email);
    const qrCodeUrl = await generateQrCodeDataUrl(totpUri);

    return NextResponse.json({
      ok: true,
      cabinetId: cabinet.id,
      practitionerId: practitioner.id,
      qrCodeUrl: qrCodeUrl.substring(0, 50) + '...',
      hasCookie: true,
    });
  } catch (e: any) {
    return NextResponse.json({
      ok: false,
      error: e.message,
      stack: (e.stack||'').substring(0,2000),
    }, { status: 500 });
  }
}
