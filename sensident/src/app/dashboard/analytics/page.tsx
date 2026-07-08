import { db, DB_DIALECT, rawSqlClient } from '@/db/client';
import { D, DS } from '@/db/date-helper';
import { readingSessions, newsletterRecipients, newsletterSends, articles } from '@/db/schema';
import { eq, and, sql, count, countDistinct, desc } from 'drizzle-orm';
import { getSessionFromCookie } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { ThresholdValue } from '@/components/threshold-value';
import { getCabinetPlan, hasFeature } from '@/lib/features';
import { UpgradeBanner } from '@/components/upgrade-banner';
import { EmptyState } from '@/components/dashboard/empty-state';
import { BarChart3 } from 'lucide-react';
import { logServerError } from '@/lib/server-log';

const ANON_THRESHOLD = 5;

interface CountRow { count: number | string }
interface FunnelRow {
  sent: number | string;
  opened: number | string;
  clicked: number | string;
}

interface ArticleStat {
  slug: string;
  title: string | null;
  medianDuration: number | string;
  views: number | string;
  readers: number | string;
  completed: number | string;
}

interface HeatmapRow { hour: number | string; count: number | string }

async function countReadersThisMonth(cabinetId: string, sinceD: any): Promise<number> {
  if (DB_DIALECT === 'postgresql') {
    // IMPORTANT : sinceD est passe via le helper DS() par le caller
    // (string ISO + cast timestamptz). PAS D() (objet sql Drizzle).
    const rows = await rawSqlClient<CountRow[]>`
      SELECT COUNT(DISTINCT patient_email_hash)::int AS count
      FROM reading_sessions
      WHERE cabinet_id::text = ${cabinetId}::text
        AND started_at >= ${sinceD}
    `;
    return Number(rows[0]?.count ?? 0);
  }
  const [r] = await db
    .select({ count: countDistinct(readingSessions.patientEmailHash) })
    .from(readingSessions)
    .where(
      and(
        eq(readingSessions.cabinetId, cabinetId),
        sql`${readingSessions.startedAt} >= ${sinceD}`,
      ),
    );
  return Number(r?.count ?? 0);
}

async function funnelThisMonth(cabinetId: string, sinceD: any): Promise<FunnelRow> {
  if (DB_DIALECT === 'postgresql') {
    const rows = await rawSqlClient<FunnelRow[]>`
      SELECT
        COUNT(*)::int AS sent,
        COUNT(*) FILTER (WHERE opened_at IS NOT NULL)::int AS opened,
        COUNT(*) FILTER (WHERE clicked_at IS NOT NULL)::int AS clicked
      FROM newsletter_recipients
      WHERE cabinet_id::text = ${cabinetId}::text
        AND sent_at >= ${sinceD}
    `;
    return rows[0] ?? { sent: 0, opened: 0, clicked: 0 };
  }
  const [r] = await db
    .select({
      sent: count(),
      opened: sql<number>`COUNT(CASE WHEN ${newsletterRecipients.openedAt} IS NOT NULL THEN 1 END)`,
      clicked: sql<number>`COUNT(CASE WHEN ${newsletterRecipients.clickedAt} IS NOT NULL THEN 1 END)`,
    })
    .from(newsletterRecipients)
    .where(
      and(
        eq(newsletterRecipients.cabinetId, cabinetId),
        sql`${newsletterRecipients.sentAt} >= ${sinceD}`,
      ),
    );
  return {
    sent: Number(r?.sent ?? 0),
    opened: Number(r?.opened ?? 0),
    clicked: Number(r?.clicked ?? 0),
  };
}

async function articleStatsThisMonth(cabinetId: string, sinceD: any): Promise<ArticleStat[]> {
  if (DB_DIALECT === 'postgresql') {
    return rawSqlClient<ArticleStat[]>`
      SELECT
        rs.article_slug AS slug,
        a.title,
        COALESCE(ROUND(AVG(rs.duration_seconds)), 0)::int AS "medianDuration",
        COUNT(*)::int AS views,
        COUNT(DISTINCT rs.patient_email_hash)::int AS readers,
        COUNT(*) FILTER (WHERE rs.completed = 1)::int AS completed
      FROM reading_sessions rs
      LEFT JOIN articles a ON a.slug = rs.article_slug
      WHERE rs.cabinet_id::text = ${cabinetId}::text
        AND rs.started_at >= ${sinceD}
      GROUP BY rs.article_slug, a.title
      ORDER BY COUNT(*) DESC
      LIMIT 10
    `;
  }
  const rows = await db
    .select({
      slug: readingSessions.articleSlug,
      title: articles.title,
      medianDuration: sql<number>`COALESCE(ROUND(AVG(${readingSessions.durationSeconds})), 0)`,
      views: count(),
      readers: countDistinct(readingSessions.patientEmailHash),
      completed: sql<number>`COUNT(CASE WHEN ${readingSessions.completed} = 1 THEN 1 END)`,
    })
    .from(readingSessions)
    .leftJoin(articles, eq(articles.slug, readingSessions.articleSlug))
    .where(
      and(
        eq(readingSessions.cabinetId, cabinetId),
        sql`${readingSessions.startedAt} >= ${sinceD}`,
      ),
    )
    .groupBy(readingSessions.articleSlug, articles.title)
    .orderBy(desc(count()))
    .limit(10);
  return rows.map((r) => ({
    slug: r.slug,
    title: r.title ?? null,
    medianDuration: Number(r.medianDuration ?? 0),
    views: Number(r.views ?? 0),
    readers: Number(r.readers ?? 0),
    completed: Number(r.completed ?? 0),
  }));
}

async function heatmapThisMonth(cabinetId: string, sinceD: any): Promise<HeatmapRow[]> {
  if (DB_DIALECT === 'postgresql') {
    return rawSqlClient<HeatmapRow[]>`
      SELECT EXTRACT(HOUR FROM started_at)::int AS hour, COUNT(*)::int AS count
      FROM reading_sessions
      WHERE cabinet_id::text = ${cabinetId}::text
        AND started_at >= ${sinceD}
      GROUP BY EXTRACT(HOUR FROM started_at)
      ORDER BY 1
    `;
  }
  return db
    .select({
      hour: sql<number>`CAST(EXTRACT(HOUR FROM ${readingSessions.startedAt}) AS INTEGER)`,
      count: count(),
    })
    .from(readingSessions)
    .where(
      and(
        eq(readingSessions.cabinetId, cabinetId),
        sql`${readingSessions.startedAt} >= ${sinceD}`,
      ),
    )
    .groupBy(sql`EXTRACT(HOUR FROM ${readingSessions.startedAt})`)
    .orderBy(sql`1`)
    .then((rows) => rows.map((r) => ({ hour: Number(r.hour), count: Number(r.count) })));
}

export default async function AnalyticsPage() {
  const session = await getSessionFromCookie();
  if (!session || !session.mfaVerified) redirect('/login');

  return (
    <AnalyticsBody
      cabinetId={session.cabinetId}
      practitionerId={session.practitionerId}
    />
  );
}

async function AnalyticsBody({
  cabinetId,
  practitionerId,
}: {
  cabinetId: string;
  practitionerId: string;
}) {
  let plan: Awaited<ReturnType<typeof getCabinetPlan>>;
  try {
    plan = await getCabinetPlan(cabinetId);
  } catch (err) {
    logServerError(err, { context: 'analytics:getCabinetPlan', cabinetId, practitionerId });
    throw err;
  }
  const isFullAnalytics = hasFeature(plan, 'analytics');

  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  // DS() : string ISO + cast timestamptz, compatible rawSqlClient postgres-js.
  // Ne PAS utiliser D() ici (objet sql Drizzle -> TypeError sur postgres-js).
  const startOfMonthDS = DS(startOfMonth);

  let distinctReaders: number;
  let funnel: Awaited<ReturnType<typeof funnelThisMonth>>;
  let articleStats: Awaited<ReturnType<typeof articleStatsThisMonth>>;
  let heatmap: Awaited<ReturnType<typeof heatmapThisMonth>>;
  try {
    distinctReaders = await countReadersThisMonth(cabinetId, startOfMonthDS);
    funnel = await funnelThisMonth(cabinetId, startOfMonthDS);
  } catch (err) {
    logServerError(err, { context: 'analytics:queries:funnel', cabinetId, practitionerId });
    throw err;
  }
  const meetsThreshold = distinctReaders >= ANON_THRESHOLD;
  try {
    articleStats = meetsThreshold
      ? await articleStatsThisMonth(cabinetId, startOfMonthDS)
      : [];
    heatmap = meetsThreshold
      ? await heatmapThisMonth(cabinetId, startOfMonthDS)
      : [];
  } catch (err) {
    logServerError(err, { context: 'analytics:queries:top', cabinetId, practitionerId });
    throw err;
  }

  const heatmapData = Array.from({ length: 24 }, (_, h) => ({
    hour: h,
    count: heatmap.find((x) => Number(x.hour) === h)?.count ?? 0,
  }));
  const maxHeat = Math.max(1, ...heatmapData.map((h) => Number(h.count)));

  return (
    <div className="space-y-6 p-6 md:p-8">
      <div>
        <h1 className="text-2xl font-bold">Analytics</h1>
        <p className="text-sm text-muted-foreground">
          Mois en cours · {now.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' })}
        </p>
      </div>

      {(funnel?.sent ?? 0) === 0 && distinctReaders === 0 && (
        <EmptyState
          icon={BarChart3}
          title="Vos premiers indicateurs arriveront sous 24-48h"
          description="Une fois votre première newsletter envoyée et lue par vos patients, l'entonnoir, la heatmap horaire et le top articles apparaîtront automatiquement."
          primary={{ label: 'Composer ma première newsletter', href: '/dashboard/library' }}
          secondary={{ label: 'Inviter un patient', href: '/dashboard/invitation' }}
        />
      )}

      {!isFullAnalytics && (
        <UpgradeBanner
          feature="analytics"
          currentPlan={plan}
          requiredPlan="pro"
          title="Analytics completes reservees au plan Pro"
          description="En Free, vous voyez uniquement les KPIs essentiels. Passez en Pro pour acceder a l'entonnoir detaille, la heatmap horaire et la segmentation des lecteurs."
        />
      )}

      <div className="rounded-lg border border-border bg-background p-6">
        <h2 className="text-sm font-semibold">Entonnoir newsletters</h2>
        <p className="text-xs text-muted-foreground">De l'envoi a la lecture complete</p>
        <div className="mt-4 space-y-3">
          <FunnelBar label="Envoyés" value={Number(funnel?.sent ?? 0)} max={Number(funnel?.sent ?? 1)} color="bg-slate-500" />
          <FunnelBar
            label="Ouverts"
            value={Number(funnel?.opened ?? 0)}
            max={Number(funnel?.sent ?? 1)}
            color="bg-blue-500"
            sub={`${funnel?.sent ? Math.round((Number(funnel?.opened ?? 0) / Number(funnel.sent)) * 100) : 0}%`}
          />
          <FunnelBar
            label="Cliqués (article)"
            value={Number(funnel?.clicked ?? 0)}
            max={Number(funnel?.sent ?? 1)}
            color="bg-accent"
            sub={`${funnel?.sent ? Math.round((Number(funnel?.clicked ?? 0) / Number(funnel.sent)) * 100) : 0}%`}
          />
          <FunnelBar
            label="Lectures complètes (90%+)"
            value={meetsThreshold ? articleStats.reduce((s, a) => s + Number(a.completed), 0) : undefined}
            max={Number(funnel?.sent ?? 1)}
            color="bg-green-500"
            sub={meetsThreshold && funnel?.sent ? `${Math.round((articleStats.reduce((s, a) => s + Number(a.completed), 0) / Number(funnel.sent)) * 100)}%` : undefined}
          />
        </div>
      </div>

      <div className="rounded-lg border border-border bg-background p-6">
        <h2 className="text-sm font-semibold">Top articles (par lectures)</h2>
        {!meetsThreshold ? (
          <p className="mt-3 text-sm text-muted-foreground">
            <ThresholdValue value={distinctReaders} /> — Données non affichées (moins de {ANON_THRESHOLD} patients actifs ce mois-ci).
          </p>
        ) : articleStats.length === 0 ? (
          <p className="mt-3 text-sm text-muted-foreground">Aucune lecture ce mois-ci.</p>
        ) : (
          <table className="mt-3 w-full text-sm">
            <thead className="text-left text-xs uppercase tracking-wider text-muted-foreground">
              <tr>
                <th className="py-2">Article</th>
                <th className="py-2">Lectures</th>
                <th className="py-2">Complétées</th>
                <th className="py-2">Durée moy.</th>
              </tr>
            </thead>
            <tbody>
              {articleStats
                .filter((a) => Number(a.readers ?? 0) >= ANON_THRESHOLD)
                .map((a) => (
                  <tr key={a.slug} className="border-t border-border">
                    <td className="py-2">{a.title ?? a.slug}</td>
                    <td className="py-2">{Number(a.views)}</td>
                    <td className="py-2">{Number(a.completed)} ({Number(a.views) ? Math.round((Number(a.completed) / Number(a.views)) * 100) : 0}%)</td>
                    <td className="py-2">{Math.round(Number(a.medianDuration) / 60)} min</td>
                  </tr>
                ))}
            </tbody>
          </table>
        )}
      </div>

      <div className="rounded-lg border border-border bg-background p-6">
        <h2 className="text-sm font-semibold">Heatmap horaire des lectures</h2>
        <p className="text-xs text-muted-foreground">A quelles heures vos patients lisent</p>
        {!meetsThreshold ? (
          <p className="mt-3 text-sm text-muted-foreground">
            <ThresholdValue value={distinctReaders} /> — Données non affichées (moins de {ANON_THRESHOLD} patients actifs ce mois-ci).
          </p>
        ) : (
          <div className="mt-4 flex h-32 items-end gap-1">
            {heatmapData.map((h) => (
              <div key={h.hour} className="flex flex-1 flex-col items-center">
                <div
                  className="w-full rounded-t bg-accent"
                  style={{ height: `${(Number(h.count) / maxHeat) * 100}%`, minHeight: Number(h.count) > 0 ? '4px' : '0' }}
                  title={`${h.hour}h: ${h.count} lecture(s)`}
                />
                <span className="mt-1 text-[10px] text-muted-foreground">{h.hour}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function FunnelBar({ label, value, max, color, sub }: { label: string; value: number | undefined; max: number; color: string; sub?: string }) {
  const v = value ?? 0;
  const pct = max > 0 ? (v / max) * 100 : 0;
  return (
    <div>
      <div className="flex items-center justify-between text-sm">
        <span>{label}</span>
        <span className="text-muted-foreground">
          {value == null ? (
            <ThresholdValue value={value ?? null} />
          ) : (
            <>{v}{sub && <span className="ml-2">({sub})</span>}</>
          )}
        </span>
      </div>
      <div className="mt-1 h-2 w-full rounded-full bg-muted">
        <div className={`h-2 rounded-full ${color}`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}