import { db, DB_DIALECT, rawSqlClient } from '@/db/client';
import { newsletterSends, newsletterRecipients, patientConsents } from '@/db/schema';
import { eq, desc, and, sql, count } from 'drizzle-orm';
import { getSessionFromCookie } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { NewsletterHistory } from './newsletter-history';
import Link from 'next/link';

export const dynamic = 'force-dynamic';

interface HistoryRow {
  id: string;
  subject: string;
  status: string;
  createdAt: string | Date;
  sentAt: string | Date | null;
  articleSlug: string | null;
  recipientCount: number;
  openedCount: number;
  clickedCount: number;
}

async function getHistoryNeon(
  cabinetId: string,
  status: string | null,
  search: string | null,
): Promise<HistoryRow[]> {
  const filters: any[] = [sql`cabinet_id::text = ${cabinetId}::text`];
  if (status) filters.push(sql`status = ${status}`);
  if (search) filters.push(sql`subject ILIKE ${'%' + search + '%'}`);

  const rows = await rawSqlClient<Array<{
    id: string;
    subject: string;
    status: string;
    created_at: string;
    sent_at: string | null;
    article_slug: string | null;
  }>>`
    SELECT id::text AS id, subject, status, created_at, sent_at, article_slug
    FROM newsletter_sends
    WHERE ${filters.reduce((acc, f, i) => (i === 0 ? f : sql`${acc} AND ${f}`), sql`1=1`)}
    ORDER BY created_at DESC
    LIMIT 100
  `;

  // Stats d'ouverture/clic par envoi (batch)
  const ids = rows.map((r) => r.id);
  let stats = new Map<string, { recipients: number; opened: number; clicked: number }>();
  if (ids.length > 0) {
    const s = await rawSqlClient<Array<{
      send_id: string;
      recipients: number | string;
      opened: number | string;
      clicked: number | string;
    }>>`
      SELECT
        send_id::text AS send_id,
        COUNT(*)::int AS recipients,
        COUNT(*) FILTER (WHERE opened_at IS NOT NULL)::int AS opened,
        COUNT(*) FILTER (WHERE clicked_at IS NOT NULL)::int AS clicked
      FROM newsletter_recipients
      WHERE send_id = ANY(${ids}::text[])
      GROUP BY send_id
    `;
    stats = new Map(s.map((r) => [r.send_id, {
      recipients: Number(r.recipients),
      opened: Number(r.opened),
      clicked: Number(r.clicked),
    }]));
  }

  return rows.map((r) => {
    const st = stats.get(r.id) ?? { recipients: 0, opened: 0, clicked: 0 };
    return {
      id: r.id,
      subject: r.subject,
      status: r.status,
      createdAt: r.created_at,
      sentAt: r.sent_at,
      articleSlug: r.article_slug,
      recipientCount: st.recipients,
      openedCount: st.opened,
      clickedCount: st.clicked,
    };
  });
}

async function getHistorySqlite(
  cabinetId: string,
  status: string | null,
  search: string | null,
): Promise<HistoryRow[]> {
  const whereParts: any[] = [eq(newsletterSends.cabinetId, cabinetId)];
  if (status) whereParts.push(sql`${newsletterSends.status} = ${status}`);
  if (search) whereParts.push(sql`${newsletterSends.subject} LIKE ${'%' + search + '%'}`);

  const history = await db
    .select()
    .from(newsletterSends)
    .where(and(...whereParts))
    .orderBy(desc(newsletterSends.createdAt))
    .limit(100);

  const enriched = await Promise.all(
    history.map(async (h) => {
      const [recipCount] = await db
        .select({ count: count() })
        .from(newsletterRecipients)
        .where(eq(newsletterRecipients.sendId, h.id));
      const [openedCount] = await db
        .select({ count: count() })
        .from(newsletterRecipients)
        .where(
          and(
            eq(newsletterRecipients.sendId, h.id),
            sql`${newsletterRecipients.openedAt} IS NOT NULL`,
          ),
        );
      const [clickedCount] = await db
        .select({ count: count() })
        .from(newsletterRecipients)
        .where(
          and(
            eq(newsletterRecipients.sendId, h.id),
            sql`${newsletterRecipients.clickedAt} IS NOT NULL`,
          ),
        );
      return {
        id: h.id,
        subject: h.subject,
        status: h.status,
        createdAt: h.createdAt,
        sentAt: h.sentAt,
        articleSlug: h.articleSlug,
        recipientCount: Number(recipCount?.count ?? 0),
        openedCount: Number(openedCount?.count ?? 0),
        clickedCount: Number(clickedCount?.count ?? 0),
      };
    }),
  );
  return enriched;
}

/**
 * Page Historique des newsletters.
 *
 * 2026-07-07 12h54 (Tartrinator) — Le composer intégré a été retiré.
 * Cette page affiche désormais UNIQUEMENT l'historique des envois
 * (envoyés, brouillons, planifiés, annulés) + les filtres statut/recherche.
 * Le point d'entrée pour composer une newsletter est la Bibliothèque
 * (via la modale `NewsletterComposerModal` qui s'ouvre au clic sur
 * "Composer" dans la page bibliothèque, sans navigation).
 *
 * Routes /api ou /compose conservées :
 * - /dashboard/newsletter/compose : single-recipient (engagement, drafts)
 * - /api/newsletter/draft : auto-save brouillon
 */
export default async function NewsletterHistoryPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; q?: string }>;
}) {
  const session = await getSessionFromCookie();
  if (!session || !session.mfaVerified) redirect('/login');

  const params = await searchParams;
  const statusFilter = params.status && params.status !== 'all' ? params.status : null;
  const searchQuery = params.q?.trim() ?? null;

  // Historique avec filtres
  const history = DB_DIALECT === 'postgresql'
    ? await getHistoryNeon(session.cabinetId, statusFilter, searchQuery)
    : await getHistorySqlite(session.cabinetId, statusFilter, searchQuery);

  // Stats patients actifs
  let activeStats = { count: 0 };
  if (DB_DIALECT === 'postgresql') {
    const rows = await rawSqlClient<Array<{ count: number | string }>>`
      SELECT COUNT(*)::int AS count
      FROM patient_consents
      WHERE cabinet_id::text = ${session.cabinetId}::text
        AND confirmed_at IS NOT NULL
        AND unsubscribed_at IS NULL
    `;
    activeStats = { count: Number(rows[0]?.count ?? 0) };
  } else {
    const [r] = await db
      .select({ count: count() })
      .from(patientConsents)
      .where(
        and(
          eq(patientConsents.cabinetId, session.cabinetId),
          sql`${patientConsents.confirmedAt} IS NOT NULL`,
          sql`${patientConsents.unsubscribedAt} IS NULL`,
        ),
      );
    activeStats = { count: Number(r?.count ?? 0) };
  }

  return (
    <div className="space-y-6 p-6 md:p-8">
      <div>
        <h1 className="text-2xl font-bold">Historique des newsletters</h1>
        <p className="text-sm text-muted-foreground">
          {activeStats.count} patient(s) actif(s) · Toutes les newsletters envoyées, brouillons inclus.
        </p>
      </div>

      <div>
        <form className="flex flex-wrap items-end gap-2" method="get">
          <div>
            <label className="block text-xs text-muted-foreground" htmlFor="status-filter">Statut</label>
            <select
              id="status-filter"
              name="status"
              defaultValue={statusFilter ?? 'all'}
              className="mt-0.5 rounded-md border border-border bg-background px-2 py-1.5 text-sm"
            >
              <option value="all">Tous</option>
              <option value="draft">Brouillon</option>
              <option value="scheduled">Planifié</option>
              <option value="sending">Envoi...</option>
              <option value="sent">Envoyé</option>
              <option value="cancelled">Annulé</option>
            </select>
          </div>
          <div>
            <label className="block text-xs text-muted-foreground" htmlFor="q-filter">Sujet contient</label>
            <input
              id="q-filter"
              name="q"
              type="text"
              defaultValue={searchQuery ?? ''}
              placeholder="ex: prévention"
              className="mt-0.5 w-48 rounded-md border border-border bg-background px-2 py-1.5 text-sm"
            />
          </div>
          <button
            type="submit"
            className="rounded-md border border-border px-3 py-1.5 text-sm hover:bg-muted"
          >
            Filtrer
          </button>
          {(statusFilter || searchQuery) && (
            <Link
              href="/dashboard/newsletter"
              className="text-xs text-muted-foreground underline"
            >
              Réinitialiser
            </Link>
          )}
        </form>
      </div>

      <div>
        <NewsletterHistory history={history} />
      </div>
    </div>
  );
}