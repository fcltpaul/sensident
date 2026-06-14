import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const { rawSqlClient } = await import('@/db/client');
    // Clean all rate_limits for my IP
    const result = await rawSqlClient`DELETE FROM rate_limits`;
    return NextResponse.json({ ok: true, result });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e.message }, { status: 500 });
  }
}

export async function GET() {
  return new Response('POST only', { status: 405 });
}
