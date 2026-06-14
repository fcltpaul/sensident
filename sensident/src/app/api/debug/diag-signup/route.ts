import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  const log: string[] = [];
  try {
    const { db, DB_DIALECT, rawSqlClient } = await import('@/db/client');
    const { practitioners, cabinets, practitionerSessions, auditLogs, rateLimits } = await import('@/db/schema');
    const { eq } = await import('drizzle-orm');
    const bcrypt = await import('bcryptjs');
    const otplib = await import('otplib');
    const { getClientIp, checkRateLimit } = await import('@/lib/rate-limit');
    const crypto = await import('node:crypto');

    log.push(`step 1: env ok`);
    const ip = getClientIp(req);
    log.push(`step 2: ip=${ip}`);

    const body = await req.json();
    log.push(`step 3: body parsed keys=${Object.keys(body).join(',')}`);

    // bcrypt hash cost 12 (mimic signup)
    const t0 = Date.now();
    const hash = await bcrypt.hash(body.password || 'Test1234!AaBb', 12);
    log.push(`step 4: bcrypt hash ${Date.now()-t0}ms`);

    // TOTP secret gen
    const totpSecret = otplib.authenticator.generateSecret();
    log.push(`step 5: TOTP secret generated`);

    // cabinet insert (Drizzle)
    const newCabId = crypto.randomUUID();
    log.push(`step 6: will insert cabinet id=${newCabId}`);
    try {
      if (DB_DIALECT === 'postgresql') {
        await rawSqlClient`INSERT INTO cabinets (id, name, slug, created_at) VALUES (${newCabId}::uuid, ${body.cabinetName || 'Test'}, ${body.slug || 'test-fix-prod-2'}, now())`;
      } else {
        await db.insert(cabinets).values({ id: newCabId, name: body.cabinetName || 'Test', slug: body.slug || 'test-fix-prod-2' });
      }
      log.push(`step 7: cabinet inserted ok`);
    } catch (e: any) {
      log.push(`step 7 ERR: ${e.message}`);
      throw e;
    }

    // practitioner insert
    const newPid = crypto.randomUUID();
    log.push(`step 8: will insert practitioner id=${newPid}`);
    try {
      if (DB_DIALECT === 'postgresql') {
        await rawSqlClient`INSERT INTO practitioners (id, cabinet_id, email, password_hash, totp_secret, totp_enabled, created_at) VALUES (${newPid}::uuid, ${newCabId}::uuid, ${body.email}, ${hash}, ${totpSecret}, false, now())`;
      } else {
        await db.insert(practitioners).values({ id: newPid, cabinetId: newCabId, email: body.email, passwordHash: hash, totpSecret, totpEnabled: false });
      }
      log.push(`step 9: practitioner inserted ok`);
    } catch (e: any) {
      log.push(`step 8 ERR: ${e.message}`);
      throw e;
    }

    return NextResponse.json({ ok: true, log, newCabId, newPid, totpSecret });
  } catch (e: any) {
    log.push(`OUTER ERR: ${e.message}`);
    log.push(`STACK: ${(e.stack||'').substring(0,1000)}`);
    return NextResponse.json({ ok: false, log, error: e.message, stack: (e.stack||'').substring(0,1500) }, { status: 500 });
  }
}
