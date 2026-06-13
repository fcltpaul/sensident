import { NextResponse } from 'next/server';

export async function GET() {
  const result: any = {
    timestamp: new Date().toISOString(),
    env: {
      SENSIDENT_DEMO_MODE: process.env.SENSIDENT_DEMO_MODE,
      HAS_DATABASE_URL: !!process.env.DATABASE_URL,
    },
    errors: [] as string[],
  };

  try {
    // Reproduce the createSession flow step by step
    const crypto = await import('node:crypto');
    const { db, DB_DIALECT } = await import('@/db/client');
    const { practitioners, cabinets } = await import('@/db/schema');
    const { eq } = await import('drizzle-orm');

    const [p] = await db.select().from(practitioners).where(eq(practitioners.email, 'demo@sensident.fr')).limit(1);
    if (!p) {
      result.errors.push('Practitioner not found');
      return NextResponse.json(result, { status: 500 });
    }
    result.practitionerId = p.id;
    result.cabinetId = p.cabinetId;

    const token = crypto.randomBytes(32).toString('base64url');
    const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
    const id = crypto.randomUUID();

    if (DB_DIALECT === 'postgresql') {
      const { rawSqlClient } = await import('@/db/client');
      result.dialect = 'postgresql';
      result.rawSqlType = typeof rawSqlClient;
      result.rawSqlKeys = Object.keys(rawSqlClient || {}).slice(0, 20);
      // Try direct call
      try {
        const r = await rawSqlClient`SELECT 1 as x`;
        result.rawSqlTest1 = r;
      } catch (e: any) {
        result.rawSqlTest1Error = e.message;
      }
      try {
        const r = await rawSqlClient`INSERT INTO practitioner_sessions (id, practitioner_id, cabinet_id, token_hash, mfa_verified, ip, user_agent, expires_at, created_at, last_used_at) VALUES (${id}, ${p.id}, ${p.cabinetId}, ${tokenHash}, true, 'debug', 'debug', ${expiresAt}, now(), now()) RETURNING id`;
        result.rawSqlInsertOk = true;
        result.rawSqlInsertResult = r[0]?.id;
      } catch (e: any) {
        result.errors.push(`raw insert: ${e.message}`);
        result.rawSqlInsertError = e.message;
      }
    } else {
      result.dialect = 'sqlite';
    }

    // Test setSessionCookie
    try {
      const { setSessionCookie } = await import('@/lib/auth');
      setSessionCookie(token, expiresAt);
      result.setCookieOk = true;
    } catch (e: any) {
      result.errors.push(`setSessionCookie: ${e.message}`);
    }
  } catch (e: any) {
    result.errors.push(`outer: ${e.message}`);
  }

  return NextResponse.json(result, { status: result.errors.length > 0 ? 500 : 200 });
}
