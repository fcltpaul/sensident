/**
 * Sensident — /dashboard/scheduled
 *
 * Liste les newsletters programmées (status='scheduled' ET scheduledAt > now())
 * du cabinet du praticien connecté. Source : table `newsletter_sends` du tenant.
 *
 * Réutilise `UpcomingNewslettersTable` (composant partagé avec
 * `/demo/practitioner`) pour éviter toute duplication de logique de rendu.
 *
 * Fix 05/07/2026 (boucle 4.1) :
 * - En PostgreSQL (prod), on utilise `rawSqlClient` avec cast `cabinet_id::text`
 *   pour contourner le drift schema Drizzle (declare uuid) vs BDD reelle (text).
 *   Cf. routes dashboard-stats et invite-tokens pour le meme pattern.
 * - En SQLite (dev), chemin Drizzle inchange.
 */
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { CalendarClock, BookOpen } from 'lucide-react';
import { db, DB_DIALECT, rawSqlClient } from '@/db/client';
import { newsletterSends, newsletterRecipients, articles } from '@/db/schema';
import { and, eq, gt, inArray, sql, asc } from 'drizzle-orm';
import { getSessionFromCookie } from '@/lib/auth';
import {
  UpcomingNewslettersTable,
  type UpcomingNewsletterRow,
} from '@/components/upcoming-newsletters-table';
import { UpcomingNewslettersInteractive } from '@/components/upcoming-newsletters-interactive';
import { loadCabinetCadence } from '@/lib/newsletter-cascade';

export const dynamic = 'force-dynamic';
export const metadata = {
  title: 'Prochaines newsletters — Sensident',
};

async function getScheduledNewslettersPg(cabinetId: string): Promise<UpcomingNewsletterRow[]> {
  // 1) Sends programmés (status='scheduled' ET scheduledAt > now)
  const sends = await rawSqlClient<
    Array<{
      id: string;
      article_slug: string | null;
      scheduled_at: string | null;
      status: string;
    }>
  >`
    SELECT id, article_slug, scheduled_at, status
    FROM newsletter_sends
    WHERE cabinet_id::text = ${cabinetId}::text
      AND status = 'scheduled'
      AND scheduled_at > NOW()
    ORDER BY scheduled_at ASC
    LIMIT 50
  `;

  if (sends.length === 0) return [];

  // 2) Compte destinataires groupé par send_id
  const sendIds = sends.map((s) => s.id);
  const recipientCounts = await rawSqlClient<
    Array<{ send_id: string; count: number }>
  >`
    SELECT send_id::text AS send_id, count(*)::int AS count
    FROM newsletter_recipients
    WHERE send_id = ANY(${sendIds}::text[])
    GROUP BY send_id
  `;
  const recipientMap = new Map<string, number>(
    recipientCounts.map((r) => [r.send_id, Number(r.count ?? 0)])
  );

  // 3) Titres d'articles
  const articleSlugs = Array.from(
    new Set(sends.map((s) => s.article_slug).filter((s): s is string => Boolean(s)))
  );
  let articleMap = new Map<string, string>();
  if (articleSlugs.length > 0) {
    const articleRows = await rawSqlClient<
      Array<{ slug: string; title: string }>
    >`SELECT slug, title FROM articles WHERE slug = ANY(${articleSlugs}::text[])`;
    articleMap = new Map(articleRows.map((a) => [a.slug, a.title]));
  }

  return sends.map((s) => ({
    id: s.id,
    subject: '',
    articleTitle: (s.article_slug && articleMap.get(s.article_slug)) || s.article_slug || '—',
    scheduledAt: s.scheduled_at ? new Date(s.scheduled_at) : null,
    status: 'scheduled' as const,
    recipientCount: recipientMap.get(s.id) ?? 0,
  }));
}

async function getScheduledNewslettersSqlite(cabinetId: string): Promise<UpcomingNewsletterRow[]> {
  const now = new Date();

  const sends = await db
    .select({
      id: newsletterSends.id,
      articleSlug: newsletterSends.articleSlug,
      scheduledAt: newsletterSends.scheduledAt,
      status: newsletterSends.status,
    })
    .from(newsletterSends)
    .where(
      and(
        eq(newsletterSends.cabinetId, cabinetId),
        eq(newsletterSends.status, 'scheduled'),
        gt(newsletterSends.scheduledAt, now)
      )
    )
    .orderBy(asc(newsletterSends.scheduledAt))
    .limit(50);

  if (sends.length === 0) return [];

  const sendIds = sends.map((s) => s.id);
  const recipientCounts = await db
    .select({
      sendId: newsletterRecipients.sendId,
      count: sql<number>`count(*)`,
    })
    .from(newsletterRecipients)
    .where(inArray(newsletterRecipients.sendId, sendIds))
    .groupBy(newsletterRecipients.sendId);

  const recipientMap = new Map<string, number>(
    recipientCounts.map((r) => [r.sendId, Number(r.count ?? 0)])
  );

  const articleSlugs = Array.from(
    new Set(sends.map((s) => s.articleSlug).filter((s): s is string => Boolean(s)))
  );
  const articleRows = articleSlugs.length
    ? await db
        .select({ slug: articles.slug, title: articles.title })
        .from(articles)
        .where(inArray(articles.slug, articleSlugs as string[]))
    : [];
  const articleMap = new Map<string, string>(articleRows.map((a) => [a.slug, a.title]));

  return sends.map((s) => ({
    id: s.id,
    subject: '',
    articleTitle: (s.articleSlug && articleMap.get(s.articleSlug)) || s.articleSlug || '—',
    scheduledAt: s.scheduledAt,
    status: 'scheduled' as const,
    recipientCount: recipientMap.get(s.id) ?? 0,
  }));
}

async function getScheduledNewsletters(cabinetId: string): Promise<UpcomingNewsletterRow[]> {
  if (DB_DIALECT === 'postgresql') return getScheduledNewslettersPg(cabinetId);
  return getScheduledNewslettersSqlite(cabinetId);
}

export default async function ScheduledNewslettersPage() {
  const session = await getSessionFromCookie();
  if (!session || !session.mfaVerified) redirect('/login');

  const [rows, cadence] = await Promise.all([
    getScheduledNewsletters(session.cabinetId),
    loadCabinetCadence(session.cabinetId),
  ]);

  return (
    <div className="mx-auto max-w-4xl p-6 md:p-8 space-y-6">
      <header className="flex items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <CalendarClock className="h-5 w-5 text-blue-700" />
            <h1 className="text-xl font-semibold">Prochaines newsletters</h1>
          </div>
          <p className="mt-1 text-sm text-muted-foreground">
            Newsletters programmées (envoi futur) pour votre cabinet.
          </p>
        </div>
      </header>

      <section className="rounded-xl border border-border bg-card p-5">
        {rows.length === 0 ? (
          <EmptyState />
        ) : (
          // Vue interactive (drag-and-drop) cote praticien pour pouvoir
          // reordonner/replanifier les NL programmees.
          // On passe la cadence du cabinet en prop pour que la preview
          // de cascade (pendant le drag) reflete exactement ce que le
          // serveur appliquera.
          <UpcomingNewslettersInteractive
            rows={rows.map((r) => ({
              id: r.id,
              articleTitle: r.articleTitle,
              scheduledAt: r.scheduledAt instanceof Date ? r.scheduledAt.toISOString() : (r.scheduledAt ?? ''),
              recipientCount: r.recipientCount,
            }))}
            cadence={cadence}
          />
        )}
      </section>
    </div>
  );
}

function EmptyState() {
  return (
    <div className="flex flex-col items-center text-center py-8 space-y-3">
      <CalendarClock className="h-8 w-8 text-muted-foreground" />
      <p className="text-sm text-muted-foreground">Aucune newsletter programmée</p>
      <Link
        href="/dashboard/library"
        className="inline-flex items-center gap-2 rounded-md bg-primary px-3 py-2 text-sm font-medium text-primary-foreground hover:opacity-90 transition"
      >
        <BookOpen className="h-4 w-4" />
        Programmer depuis la bibliothèque
      </Link>
    </div>
  );
}
