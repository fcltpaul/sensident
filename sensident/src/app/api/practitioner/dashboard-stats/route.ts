import { NextResponse } from 'next/server';
import { db, DB_DIALECT, rawSqlClient } from '@/db/client';
import { newsletterSends } from '@/db/schema';
import { and, eq, gte, sql } from 'drizzle-orm';
import { getSessionFromCookie } from '@/lib/auth';

/**
 * GET /api/practitioner/dashboard-stats
 * Retourne les compteurs affichés en badge dans la sidebar :
 * - scheduledNewsletters: nombre de NL programmées à venir
 *
 * Appel client (sidebar mount). 1 query, hors layout server-side → safe.
 */
export async function GET() {
  const session = await getSessionFromCookie();
  if (!session || !session.mfaVerified) {
    return NextResponse.json({ error: 'Non autorisé.' }, { status: 401 });
  }

  try {
    if (DB_DIALECT === 'postgresql') {
      const nowIso = new Date().toISOString();
      // Échapper la colonne cabinet_id via raw SQL (cast ::text, pattern fixé 14/06)
      const rows = await rawSqlClient<{ count: string }[]>`
        SELECT COUNT(*)::int AS count
        FROM newsletter_sends
        WHERE cabinet_id::text = ${session.cabinetId}::text
          AND status = 'scheduled'
          AND scheduled_at >= ${nowIso}::timestamptz
      `;
      const scheduled = rows.length > 0 ? Number(rows[0]!.count) : 0;
      return NextResponse.json({ scheduledNewsletters: scheduled });
    }

    // SQLite (dev) — Drizzle fonctionne ici
    const now = new Date();
    const arr = await db
      .select({ count: sql<number>`count(*)` })
      .from(newsletterSends)
      .where(
        and(
          eq(newsletterSends.cabinetId, session.cabinetId),
          eq(newsletterSends.status, 'scheduled'),
          gte(newsletterSends.scheduledAt, now)
        )
      );
    return NextResponse.json({ scheduledNewsletters: arr[0]?.count ?? 0 });
  } catch (err) {
    console.error('[dashboard-stats] error', err);
    // En cas d'erreur, retourner 0 plutôt que crasher la sidebar
    return NextResponse.json({ scheduledNewsletters: 0, error: 'stats_unavailable' });
  }
}
