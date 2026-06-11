import { db } from '@/db/client';
import { readingSessions, newsletterRecipients, newsletterSends, articles } from '@/db/schema';
import { eq, and, gte, sql, count, countDistinct, desc } from 'drizzle-orm';
import { getSessionFromCookie } from '@/lib/auth';
import { redirect } from 'next/navigation';

export default async function AnalyticsPage() {
  const session = await getSessionFromCookie();
  if (!session || !session.mfaVerified) redirect('/login');

  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

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

  // Duree mediane par article
  const articleStats = await db
    .select({
      slug: readingSessions.articleSlug,
      title: articles.title,
      median_duration: sql<number>`COALESCE(ROUND(AVG(${readingSessions.durationSeconds})), 0)`,
      views: count(),
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
    .limit(10);

  // Heatmap horaire des lectures
  const heatmap = await db
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
    .orderBy(sql`1`);

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
            value={articleStats.reduce((s, a) => s + a.completed, 0)}
            max={funnel?.sent ?? 1}
            color="bg-green-500"
            sub={`${funnel?.sent ? Math.round((articleStats.reduce((s, a) => s + a.completed, 0) / funnel.sent) * 100) : 0}%`}
          />
        </div>
      </div>

      <div className="rounded-lg border border-border bg-background p-6">
        <h2 className="text-sm font-semibold">Top articles (par lectures)</h2>
        {articleStats.length === 0 ? (
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
              {articleStats.map((a) => (
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
      </div>
    </div>
  );
}

function FunnelBar({ label, value, max, color, sub }: { label: string; value: number; max: number; color: string; sub?: string }) {
  const pct = max > 0 ? (value / max) * 100 : 0;
  return (
    <div>
      <div className="flex items-center justify-between text-sm">
        <span>{label}</span>
        <span className="text-muted-foreground">{value} {sub && <span className="ml-2">({sub})</span>}</span>
      </div>
      <div className="mt-1 h-2 w-full rounded-full bg-muted">
        <div className={`h-2 rounded-full ${color}`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}
