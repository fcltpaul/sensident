/**
 * Sensident — Cron keep-alive Neon (anti scale-to-zero)
 *
 * Appelé toutes les 4 minutes par Vercel Cron (gratuit) ou GitHub Actions
 * pour éviter que Neon (free tier) ne se mette en pause après 5 min d'inactivité.
 *
 * Sécurité : header Authorization: Bearer ${CRON_SECRET}
 * En dev : si CRON_SECRET absent, accepter quand même (pour smoke test local).
 */
import { NextRequest, NextResponse } from 'next/server';
import { db, DB_DIALECT } from '@/db/client';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET(req: NextRequest) {
  const authHeader = req.headers.get('authorization') || '';
  const expected = process.env.CRON_SECRET;

  if (expected && authHeader !== `Bearer ${expected}`) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  try {
    const start = Date.now();
    const sessionClient = (db as any).session.client;

    if (DB_DIALECT === 'postgresql') {
      // postgres-js : unsafe(sql, params?)
      const r = await sessionClient.unsafe('SELECT 1 AS ok');
      return NextResponse.json({
        ok: true,
        ts: new Date().toISOString(),
        duration_ms: Date.now() - start,
        dialect: DB_DIALECT,
        rows: Array.isArray(r) ? r.length : 0,
      });
    } else {
      // libsql : execute(sql)
      const r = await sessionClient.execute('SELECT 1 AS ok');
      return NextResponse.json({
        ok: true,
        ts: new Date().toISOString(),
        duration_ms: Date.now() - start,
        dialect: DB_DIALECT,
        rows: r.rows?.length ?? 0,
      });
    }
  } catch (e: any) {
    return NextResponse.json(
      { ok: false, error: e?.message || 'db error', ts: new Date().toISOString() },
      { status: 500 }
    );
  }
}
