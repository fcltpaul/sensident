import { db } from '@/db/client';
import { readingSessions, newsletterRecipients, newsletterSends, articles } from '@/db/schema';
import { eq, and, gte, sql, count, countDistinct, desc } from 'drizzle-orm';
import { getSessionFromCookie } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { ThresholdValue } from '@/components/threshold-value';
import { getCabinetPlan, hasFeature } from '@/lib/features';
import { UpgradeBanner } from '@/components/upgrade-banner';

const ANON_THRESHOLD = 5;

export default async function AnalyticsPage() {
  const session = await getSessionFromCookie();
  if (!session || !session.mfaVerified) redirect('/login');

  const plan = await getCabinetPlan(session.cabinetId);
  const isFullAnalytics = hasFeature(plan, 'analytics');

  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

  // Indice de seuil RGPD : nombre de patients uniques ayant lu ce mois-ci
  const [readerCount] = await db
    .select({ count: countDistinct(readingSessions.patientEmailHash) })
    .from(readingSessions)
    .where(
      and(
        eq(readingSessions.cabinetId, session.cabinetId),
        gte(readingSessions.startedAt, startOfMonth)
      )
    );
  const distinctReaders = readerCount?.count ?? 0;
  const meetsThreshold = distinctReaders >= ANON_THRESHOLD;

  // Entonnoir : emails envoyes -> ouverts -> cliques -> lectures completes
  const [funnel] = await db
    .select({
      sent: count(),
      opened: sql<number>`COUNT(CASE WHEN ${newsletterRecipients.openedAt} IS NOT NULL THEN 1 END)`,
      clicked: sql<number>`COUNT(CASE WHEN ${newsletterRecipients.clickedAt} IS NOT NULL THEN 1 END)`,
    })
    .from(newsletterRecipients)
    .where(
      and(
        eq(newsletterRecipients.cabinetId, session.cabinetId),
        gte(newsletterRecipients.sentAt, startOfMonth)
      )
    );

  // Duree mediane par article (avec count distinct patients pour seuil par article)
  const articleStats = meetsThreshold
    ? await db
        .select({
          slug: readingSessions.articleSlug,
          title: articles.title,
          median_duration: sql<number>`COALESCE(ROUND(AVG(${readingSessions.durationSeconds})), 0)`,
          views: count(),
          readers: countDistinct(readingSessions.patientEmailHash),
          completed: sql<number>`COUNT(CASE WHEN ${readingSessions.completed} = 1 THEN 1 END)`,
        })
        .from(readingSessions)
        .leftJoin(articles, eq(articles.slug, readingSessions.articleSlug))
        .where(
          and(
            eq(readingSessions.cabinetId, session.cabinetId),
            gte(readingSessions.startedAt, startOfMonth)
          )
        )
        .groupBy(readingSessions.articleSlug, articles.title)
        .orderBy(desc(count()))
        .limit(10)
    : [];

  // Heatmap horaire des lectures (seulement si seuil atteint)
  const heatmap = meetsThreshold
    ? await db
        .select({
          hour: sql<number>`CAST(strftime('%H', datetime(${readingSessions.startedAt}, 'unixepoch')) AS INTEGER)`,
          count: count(),
        })
        .from(readingSessions)
        .where(
          and(
            eq(readingSessions.cabinetId, session.cabinetId),
            gte(readingSessions.startedAt, startOfMonth)
          )
        )
        .groupBy(sql`strftime('%H', datetime(${readingSessions.startedAt}, 'unixepoch'))`)
        .orderBy(sql`1`)
    : [];

  // Max 24 heures, initialise a 0
  const heatmapData = Array.from({ length: 24 }, (_, h) => ({
    hour: h,
    count: heatmap.find((x) => x.hour === h)?.count ?? 0,
  }));
  const maxHeat = Math.max(1, ...heatmapData.map((h) => h.count));

  return (
    <div className="space-y-6 p-6 md:p-8">
      <div>
        <h1 className="text-2xl font-bold">Analytics</h1>
        <p className="text-sm text-muted-foreground">
          Mois en cours · {now.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' })}
        </p>
      </div>

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
          <FunnelBar label="Envoyés" value={funnel?.sent ?? 0} max={funnel?.sent ?? 1} color="bg-slate-500" />
          <FunnelBar
            label="Ouverts"
            value={funnel?.opened ?? 0}
            max={funnel?.sent ?? 1}
            color="bg-blue-500"
            sub={`${funnel?.sent ? Math.round(((funnel?.opened ?? 0) / funnel.sent) * 100) : 0}%`}
          />
          <FunnelBar
            label="Cliqués (article)"
            value={funnel?.clicked ?? 0}
            max={funnel?.sent ?? 1}
            color="bg-accent"
            sub={`${funnel?.sent ? Math.round(((funnel?.clicked ?? 0) / funnel.sent) * 100) : 0}%`}
          />
          <FunnelBar
            label="Lectures complètes (90%+)"
            value={meetsThreshold ? articleStats.reduce((s, a) => s + a.completed, 0) : undefined}
            max={funnel?.sent ?? 1}
            color="bg-green-500"
            sub={meetsThreshold && funnel?.sent ? `${Math.round((articleStats.reduce((s, a) => s + a.completed, 0) / funnel.sent) * 100)}%` : undefined}
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
                .filter((a) => (a.readers ?? 0) >= ANON_THRESHOLD)
                .map((a) => (
                  <tr key={a.slug} className="border-t border-border">
                    <td className="py-2">{a.title ?? a.slug}</td>
                    <td className="py-2">{a.views}</td>
                    <td className="py-2">{a.completed} ({a.views ? Math.round((a.completed / a.views) * 100) : 0}%)</td>
                    <td className="py-2">{Math.round(a.median_duration / 60)} min</td>
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
                  style={{ height: `${(h.count / maxHeat) * 100}%`, minHeight: h.count > 0 ? '4px' : '0' }}
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
