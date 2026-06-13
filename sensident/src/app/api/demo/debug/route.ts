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
        const { token, expiresAt } = await createSession({
          practitionerId: p.id,
          cabinetId: p.cabinetId,
          ip: 'debug',
          userAgent: 'debug',
          mfaVerified: true,
        });
        result.sessionCreated = true;
        result.tokenLength = token.length;
        try {
          setSessionCookie(token, expiresAt);
          result.cookieSet = true;
        } catch (e: any) {
          result.errors.push(`setSessionCookie: ${e.message}`);
        }
      } catch (e: any) {
        result.errors.push(`createSession: ${e.message}`);
        result.sessionError = e.message;
      }
    }
  } catch (e: any) {
    result.errors.push(`outer: ${e.message}`);
  }

  return NextResponse.json(result, { status: result.errors.length > 0 ? 500 : 200 });
}
