import { NextResponse } from 'next/server';
import { db } from '@/db/client';
import { practitioners } from '@/db/schema';
import { eq } from 'drizzle-orm';

export async function GET() {
  const result: any = {
    timestamp: new Date().toISOString(),
    env: {
      SENSIDENT_DEMO_MODE: process.env.SENSIDENT_DEMO_MODE,
      HAS_DATABASE_URL: !!process.env.DATABASE_URL,
      DATABASE_URL_START: process.env.DATABASE_URL?.slice(0, 20),
      DATABASE_URL_FULL: process.env.DATABASE_URL,
    },
    errors: [] as string[],
  };

  try {
    const r = await db.select().from(practitioners).where(eq(practitioners.email, 'demo@sensident.fr')).limit(1);
    result.practitionerFound = r.length > 0;
    result.practitionerId = r[0]?.id;
  } catch (e: any) {
    result.errors.push(`practitioner query: ${e.message}`);
  }

  return NextResponse.json(result, { status: result.errors.length > 0 ? 500 : 200 });
}
