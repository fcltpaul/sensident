import Link from 'next/link';
import { withCabinetContext } from '@/db/client';
import { D } from '@/db/date-helper';
import {
  readingSessions,
  patientConsents,
  newsletterRecipients,
  newsletterSends,
  articles,
  cabinets,
} from '@/db/schema';
import { eq, and, gte, sql, count, countDistinct, desc } from 'drizzle-orm';
import { getSessionFromCookie } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { ThresholdValue } from '@/components/threshold-value';
import { ArrowRight, Send, UserPlus, BookOpen, TrendingUp, AlertCircle, CheckCircle2 } from 'lucide-react';

export default async function OverviewPage() {
  const session = await getSessionFromCookie();
  if (!session || !session.mfaVerified) redirect('/login');

  // KPIs du mois en cours
  const startOfMonth = new Date();
  startOfMonth.setDate(1);
  startOfMonth.setHours(0, 0, 0, 0);
  const startOfMonthD = D(startOfMonth);

  // 30 jours glissants pour "activité récente"
  const last30 = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  const last30D = D(last30);

  const data = await withCabinetContext(session.cabinetId, async (tx) => {
    const [activePatients] = await tx
      .select({ count: countDistinct(readingSessions.patientEmailHash) })
      .from(readingSessions)
      .where(sql`${readingSessions.startedAt} >= ${startOfMonthD}`);

    const [totalReadTime] = await tx
      .select({ sum: sql<number>`COALESCE(SUM(${readingSessions.durationSeconds}), 0)` })
      .from(readingSessions)
      .where(sql`${readingSessions.startedAt} >= ${startOfMonthD}`);

    const [opens] = await tx
      .select({ count: sql<number>`COUNT(*)` })
      .from(newsletterRecipients)
      .where(
        and(
          sql`${newsletterRecipients.sentAt} >= ${startOfMonthD}`,
          sql`${newsletterRecipients.openedAt} IS NOT NULL`
        )
      );

    const [sends] = await tx
      .select({ count: sql<number>`COUNT(*)` })
      .from(newsletterRecipients)
      .where(sql`${newsletterRecipients.sentAt} >= ${startOfMonthD}`);

    const [confirmedPatients] = await tx
      .select({ count: sql<number>`COUNT(*)` })
      .from(patientConsents)
      .where(
        and(
          sql`${patientConsents.confirmedAt} IS NOT NULL`,
          sql`${patientConsents.confirmedAt} >= ${startOfMonthD}`
        )
      );

    const [totalPatients] = await tx
      .select({ count: sql<number>`COUNT(*)` })
      .from(patientConsents)
      .where(
        and(
          sql`${patientConsents.confirmedAt} IS NOT NULL`,
          sql`${patientConsents.unsubscribedAt} IS NULL`
        )
      );

    // Newsletter du mois en cours
    const [monthSends] = await tx
      .select({ count: sql<number>`COUNT(*)` })
      .from(newsletterSends)
      .where(
        and(
          eq(newsletterSends.cabinetId, session.cabinetId),
          gte(newsletterSends.sentAt, startOfMonth)
        )
      );

    // Dernière newsletter envoyée
    const [lastSend] = await tx
      .select({
        id: newsletterSends.id,
        sentAt: newsletterSends.sentAt,
        subject: newsletterSends.subject,
        recipients: sql<number>`(
          SELECT COUNT(*) FROM newsletter_recipients
          WHERE newsletter_recipients.send_id = ${newsletterSends.id}
        )`,
        opens: sql<number>`(
          SELECT COUNT(*) FROM newsletter_recipients
          WHERE newsletter_recipients.send_id = ${newsletterSends.id}
            AND newsletter_recipients.opened_at IS NOT NULL
        )`,
      })
      .from(newsletterSends)
      .where(eq(newsletterSends.cabinetId, session.cabinetId))
      .orderBy(desc(newsletterSends.sentAt))
      .limit(1);

    // Top 5 articles du mois
    const topArticles = await tx
      .select({
        slug: readingSessions.articleSlug,
        title: articles.title,
        readers: countDistinct(readingSessions.patientEmailHash),
        views: sql<number>`COUNT(*)`,
      })
      .from(readingSessions)
      .innerJoin(articles, eq(articles.slug, readingSessions.articleSlug))
      .where(gte(readingSessions.startedAt, startOfMonth))
      .groupBy(readingSessions.articleSlug, articles.title)
      .orderBy(sql`COUNT(*) DESC`)
      .limit(5);

    // Activité récente (30j) — agrégée par jour
    const dailyActivity = await tx
      .select({
        day: sql<string>`to_char(${readingSessions.startedAt}, 'YYYY-MM-DD')`,
        count: sql<number>`COUNT(*)`,
      })
      .from(readingSessions)
      .where(gte(readingSessions.startedAt, last30D))
      .groupBy(sql`to_char(${readingSessions.startedAt}, 'YYYY-MM-DD')`)
      .orderBy(sql`to_char(${readingSessions.startedAt}, 'YYYY-MM-DD')`);

    // Nouveaux patients sur 7 jours
    const [newPatients7d] = await tx
      .select({ count: sql<number>`COUNT(*)` })
      .from(patientConsents)
      .where(
        and(
          sql`${patientConsents.confirmedAt} IS NOT NULL`,
          gte(patientConsents.confirmedAt, D(new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)))
        )
      );

    const distinctReaders = activePatients?.count ?? 0;

    return {
      activePatients: distinctReaders,
      totalReadMinutes: Math.round((totalReadTime?.sum ?? 0) / 60),
      openRate: sends?.count ? Math.round((opens?.count ?? 0) / sends.count * 100) : 0,
      newPatients: confirmedPatients?.count ?? 0,
      newPatients7d: Number(newPatients7d?.count ?? 0),
      totalPatients: Number(totalPatients?.count ?? 0),
      monthSends: Number(monthSends?.count ?? 0),
      lastSend: lastSend
        ? {
            sentAt: lastSend.sentAt,
            subject: lastSend.subject,
            recipients: Number(lastSend.recipients ?? 0),
            opens: Number(lastSend.opens ?? 0),
          }
        : null,
      topArticles: topArticles.map((a) => ({
        slug: a.slug,
        title: a.title,
        readers: Number(a.readers ?? 0),
        views: Number(a.views ?? 0),
      })),
      dailyActivity: dailyActivity.map((d) => ({ day: d.day, count: Number(d.count ?? 0) })),
      meetsThreshold: distinctReaders >= 5,
    };
  });

  // Cabinet slug for invite link
  const [cab] = await withCabinetContext(session.cabinetId, (tx) =>
    tx.select({ slug: cabinets.slug }).from(cabinets).where(eq(cabinets.id, session.cabinetId)).limit(1)
  );

  const monthLabel = new Date().toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' });

  return (
    <div className="space-y-8 p-6 md:p-8">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Vue d'ensemble</h1>
          <p className="text-sm text-muted-foreground">Mois en cours · {monthLabel}</p>
        </div>
        {data.monthSends === 0 && (
          <Link
            href="/dashboard/newsletter"
            className="inline-flex h-9 items-center gap-1.5 rounded-md bg-primary px-3 text-sm font-medium text-primary-foreground transition hover:bg-primary/90"
          >
            <Send className="h-4 w-4" />
            Composer la newsletter du mois
          </Link>
        )}
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <KpiCard
          label="Patients actifs ce mois"
          value={<ThresholdValue value={data.activePatients} />}
          sublabel={`${data.totalPatients} au total`}
        />
        <KpiCard
          label="Nouveaux ce mois"
          value={data.newPatients.toString()}
          sublabel={data.newPatients7d > 0 ? `+${data.newPatients7d} sur 7j` : '—'}
        />
        <KpiCard
          label="Taux d'ouverture"
          value={`${data.openRate}%`}
          sublabel={data.openRate >= 50 ? 'Au-dessus de la moyenne' : data.openRate > 0 ? 'Continuez !' : 'Pas encore mesuré'}
        />
        <KpiCard
          label="Minutes lues"
          value={<ThresholdValue value={data.totalReadMinutes} />}
          sublabel="tous patients confondus"
        />
      </div>

      {/* Statut newsletter du mois + dernière NL */}
      <div className="grid gap-4 md:grid-cols-2">
        <NewsletterStatus
          monthSends={data.monthSends}
          lastSend={data.lastSend}
        />
        <ArticleRankings articles={data.topArticles} />
      </div>

      {/* Activité récente + actions rapides */}
      <div className="grid gap-4 md:grid-cols-3">
        <div className="md:col-span-2 rounded-lg border border-border bg-card p-5">
          <div className="mb-3 flex items-center justify-between">
            <div>
              <h2 className="text-sm font-semibold">Activité des 30 derniers jours</h2>
              <p className="text-xs text-muted-foreground">
                Lectures d&apos;articles par jour
              </p>
            </div>
            <Link
              href="/dashboard/analytics"
              className="inline-flex items-center gap-1 text-xs font-medium text-accent hover:underline"
            >
              Détails <ArrowRight className="h-3 w-3" />
            </Link>
          </div>
          <ActivityChart daily={data.dailyActivity} />
        </div>

        <div className="space-y-3">
          <h2 className="text-sm font-semibold">Actions rapides</h2>
          <Link
            href="/dashboard/newsletter"
            className="flex items-start gap-3 rounded-lg border border-border bg-card p-4 transition hover:border-primary/50"
          >
            <Send className="h-5 w-5 text-primary" />
            <div className="flex-1">
              <p className="text-sm font-medium">Composer une newsletter</p>
              <p className="text-xs text-muted-foreground">Article + template + envoi</p>
            </div>
            <ArrowRight className="h-4 w-4 text-muted-foreground" />
          </Link>
          <Link
            href={`/c/${cab?.slug ?? ''}/rejoindre`}
            target="_blank"
            rel="noreferrer"
            className="flex items-start gap-3 rounded-lg border border-border bg-card p-4 transition hover:border-emerald-400"
          >
            <UserPlus className="h-5 w-5 text-emerald-600" />
            <div className="flex-1">
              <p className="text-sm font-medium">Inviter un patient</p>
              <p className="text-xs text-muted-foreground">Lien ou QR code</p>
            </div>
            <ArrowRight className="h-4 w-4 text-muted-foreground" />
          </Link>
          <Link
            href="/dashboard/library"
            className="flex items-start gap-3 rounded-lg border border-border bg-card p-4 transition hover:border-amber-400"
          >
            <BookOpen className="h-5 w-5 text-amber-600" />
            <div className="flex-1">
              <p className="text-sm font-medium">Bibliothèque</p>
              <p className="text-xs text-muted-foreground">Articles validés</p>
            </div>
            <ArrowRight className="h-4 w-4 text-muted-foreground" />
          </Link>
        </div>
      </div>

      {/* Empty state pédagogique */}
      {data.activePatients === 0 && data.monthSends === 0 && (
        <div className="rounded-lg border border-dashed border-border bg-muted/20 p-6">
          <h2 className="text-sm font-semibold">Bienvenue sur Sensident</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Pour démarrer, invitez vos premiers patients avec un lien ou QR code, puis composez votre
            première newsletter. Tout est guidé.
          </p>
        </div>
      )}

      {/* Footer hint Analytics */}
      {!data.meetsThreshold && data.activePatients > 0 && (
        <div className="rounded-lg border border-border bg-muted/20 p-4 text-xs text-muted-foreground">
          <AlertCircle className="mr-1 inline h-3.5 w-3.5" />
          Les analytics détaillées s&apos;affichent à partir de 5 patients actifs (anonymat RGPD).
        </div>
      )}
    </div>
  );
}

function KpiCard({
  label,
  value,
  sublabel,
}: {
  label: string;
  value: string | React.ReactNode;
  sublabel?: string;
}) {
  return (
    <div className="rounded-lg border border-border bg-background p-4">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="mt-1 text-2xl font-bold">{value}</p>
      {sublabel && <p className="mt-0.5 text-[11px] text-muted-foreground">{sublabel}</p>}
    </div>
  );
}

function NewsletterStatus({
  monthSends,
  lastSend,
}: {
  monthSends: number;
  lastSend: { sentAt: Date | null; subject: string | null; recipients: number; opens: number } | null;
}) {
  return (
    <div className="rounded-lg border border-border bg-card p-5">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-sm font-semibold">Newsletter du mois</h2>
        {monthSends > 0 ? (
          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2 py-0.5 text-[11px] font-medium text-emerald-800">
            <CheckCircle2 className="h-3 w-3" /> Envoyée
          </span>
        ) : (
          <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 text-[11px] font-medium text-amber-800">
            <AlertCircle className="h-3 w-3" /> À faire
          </span>
        )}
      </div>
      {monthSends > 0 && lastSend ? (
        <div className="space-y-2">
          <p className="text-sm font-medium">{lastSend.subject || 'Newsletter envoyée'}</p>
          <p className="text-xs text-muted-foreground">
            Envoyée le{' '}
            {lastSend.sentAt
              ? new Date(lastSend.sentAt).toLocaleDateString('fr-FR', {
                  day: 'numeric',
                  month: 'long',
                })
              : '—'}
          </p>
          <div className="flex gap-4 pt-1 text-xs">
            <span>
              <strong>{lastSend.recipients}</strong> destinataires
            </span>
            <span>
              <strong>{lastSend.opens}</strong> ouvertures
            </span>
            <span>
              Taux{' '}
              <strong>
                {lastSend.recipients
                  ? Math.round((lastSend.opens / lastSend.recipients) * 100)
                  : 0}
                %
              </strong>
            </span>
          </div>
        </div>
      ) : (
        <div className="space-y-2">
          <p className="text-sm text-muted-foreground">
            Aucune newsletter envoyée ce mois-ci.
          </p>
          <Link
            href="/dashboard/newsletter"
            className="inline-flex h-8 items-center gap-1.5 rounded-md bg-primary px-3 text-xs font-medium text-primary-foreground"
          >
            <Send className="h-3.5 w-3.5" />
            La composer maintenant
          </Link>
        </div>
      )}
    </div>
  );
}

function ArticleRankings({
  articles,
}: {
  articles: { slug: string; title: string; readers: number; views: number }[];
}) {
  return (
    <div className="rounded-lg border border-border bg-card p-5">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-sm font-semibold">Articles les plus lus</h2>
        <Link
          href="/dashboard/analytics"
          className="inline-flex items-center gap-1 text-xs font-medium text-accent hover:underline"
        >
          Voir tout <ArrowRight className="h-3 w-3" />
        </Link>
      </div>
      {articles.length === 0 ? (
        <p className="text-sm text-muted-foreground">Aucune lecture ce mois-ci.</p>
      ) : (
        <div className="space-y-2">
          {articles.slice(0, 3).map((a, i) => (
            <div key={a.slug} className="flex items-center justify-between gap-3">
              <div className="flex min-w-0 items-center gap-2">
                <span className="text-xs font-bold text-muted-foreground">#{i + 1}</span>
                <span className="truncate text-sm">{a.title}</span>
              </div>
              <div className="flex shrink-0 items-center gap-1 text-xs text-muted-foreground">
                <TrendingUp className="h-3 w-3" />
                {a.readers}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function ActivityChart({
  daily,
}: {
  daily: { day: string; count: number }[];
}) {
  if (daily.length === 0) {
    return (
      <div className="flex h-32 items-center justify-center rounded border border-dashed border-border">
        <p className="text-sm text-muted-foreground">Aucune activité récente</p>
      </div>
    );
  }
  const max = Math.max(...daily.map((d) => d.count), 1);
  return (
    <div className="flex h-32 items-end gap-1">
      {daily.map((d) => {
        const heightPct = (d.count / max) * 100;
        return (
          <div
            key={d.day}
            className="group relative flex-1 rounded-t bg-primary/20 transition hover:bg-primary/40"
            style={{ height: `${Math.max(4, heightPct)}%` }}
            title={`${d.day}: ${d.count} lecture${d.count > 1 ? 's' : ''}`}
          >
            <div className="absolute -top-6 left-1/2 hidden -translate-x-1/2 rounded bg-foreground px-1.5 py-0.5 text-[10px] text-background group-hover:block">
              {d.count}
            </div>
          </div>
        );
      })}
    </div>
  );
}
