import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db/client';
import { practitioners, practitionerSessions, auditLogs, rateLimits } from '@/db/schema';
import { eq, and, gt } from 'drizzle-orm';
import { authenticateLogin, createSession, setSessionCookie } from '@/lib/auth';
import { checkRateLimit, getClientIp } from '@/lib/rate-limit';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  const log: string[] = [];
  try {
    const ip = getClientIp(req);
    log.push(`step 1: ip=${ip}`);
    const rl = await checkRateLimit('login_practitioner', ip);
    log.push(`step 2: rateLimit allowed=${rl.allowed}`);
    const result = await db
      .select()
      .from(practitioners)
      .where(eq(practitioners.email, 'inexistant@x.fr'))
      .limit(1);
    log.push(`step 3: select full row ok count=${result.length}`);
    if (result.length === 0) {
      // fake bcrypt to simulate
      const bcrypt = await import('bcryptjs');
      await bcrypt.compare('Test1234!Aa', '$2a$12$invalidinvalidinvalidinvalidinvalidinvalidinvalidinvalidi');
      log.push(`step 4: bcrypt fake verify ok`);
      return NextResponse.json({ ok: true, log, msg: 'would 401 here' });
    }
    const p = result[0];
    log.push(`step 4: found practitioner email=${p.email} totpEnabled=${p.totpEnabled}`);
    const { token, expiresAt } = await createSession({
      practitionerId: p.id,
      cabinetId: p.cabinetId,
      ip,
      mfaVerified: !p.totpEnabled,
    });
    log.push(`step 5: createSession ok token=${token.substring(0,8)}...`);
    await db.insert(auditLogs).values({
      actorType: 'practitioner',
      actorId: p.id,
      cabinetId: p.cabinetId,
      action: 'login_password_ok',
    });
    log.push(`step 6: auditLogs insert ok`);
    return NextResponse.json({ ok: true, log });
  } catch (e: any) {
    log.push(`ERR: ${e.message}`);
    log.push(`STACK: ${(e.stack||'').substring(0,800)}`);
    return NextResponse.json({ ok: false, log, error: e.message, stack: (e.stack||'').substring(0,1500) }, { status: 500 });
  }
}
