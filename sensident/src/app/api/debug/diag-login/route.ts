import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db/client';
import { practitioners } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { getClientIp } from '@/lib/rate-limit';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  const log: string[] = [];
  try {
    log.push(`step 1: env AUTH_SECRET=${!!process.env.AUTH_SECRET} DB_DIALECT=${(process.env.DATABASE_URL||'').startsWith('postgres')?'pg':'sqlite'}`);
    log.push(`step 2: ip=${getClientIp(req)}`);
    const all = await db.select({ id: practitioners.id, email: practitioners.email, totpEnabled: practitioners.totpEnabled }).from(practitioners).limit(5);
    log.push(`step 3: select ok count=${all.length} emails=${all.map(p=>p.email).join(',')}`);
    if (all.length === 0) {
      return NextResponse.json({ ok: false, log, msg: 'no practitioners in DB' });
    }
    return NextResponse.json({ ok: true, log, sample: all[0] });
  } catch (e: any) {
    log.push(`ERR: ${e.message} stack=${e.stack?.substring(0,500)}`);
    return NextResponse.json({ ok: false, log, error: e.message, stack: e.stack?.substring(0,800) }, { status: 500 });
  }
}

export async function GET() {
  return NextResponse.json({ ok: true, msg: 'POST to /api/debug/diag-login' });
}
