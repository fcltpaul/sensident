import { NextResponse } from 'next/server';
import { db } from '@/db/client';
import { practitioners, cabinets } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { createSession, setSessionCookie } from '@/lib/auth';

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
    // Test 1: practitioner
    const [p] = await db.select().from(practitioners).where(eq(practitioners.email, 'demo@sensident.fr')).limit(1);
    result.practitionerFound = !!p;
    result.practitionerId = p?.id;
    result.cabinetId = p?.cabinetId;

    // Test 2: cabinet lookup
    const [c] = await db.select().from(cabinets).where(eq(cabinets.slug, 'demo-francois-thibault')).limit(1);
    result.cabinetFound = !!c;
    result.cabinetIdFromLookup = c?.id;

    // Test 3: createSession
    if (p) {
      try {
        // Try to call createSession step by step
        const crypto = await import('node:crypto');
        const token = crypto.randomBytes(32).toString('base64url');
        result.tokenType = typeof token;
        result.tokenLength = token.length;
        result.tokenSample = token.slice(0, 10);
        const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
        result.tokenHashType = typeof tokenHash;
        result.tokenHashLength = tokenHash.length;
        try {
          const id = crypto.randomUUID();
          await db.insert(require('@/db/schema').practitionerSessions).values({
            id,
            practitionerId: p.id,
            cabinetId: p.cabinetId,
            tokenHash,
            mfaVerified: true,
            ip: 'debug',
            userAgent: 'debug',
            expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
          });
          result.sessionInserted = true;
        } catch (e: any) {
          result.errors.push(`session insert: ${e.message}`);
          result.sessionError = e.message;
        }
      } catch (e: any) {
        result.errors.push(`crypto: ${e.message}`);
      }
    }
  } catch (e: any) {
    result.errors.push(`outer: ${e.message}`);
  }

  return NextResponse.json(result, { status: result.errors.length > 0 ? 500 : 200 });
}
