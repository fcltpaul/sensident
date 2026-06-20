import Link from 'next/link';
import { withCabinetContext } from '@/db/client';
import { D } from '@/db/date-helper';
import {
  readingSessions,
  patientConsents,
  newsletterRecipients,
  articles,
  newsletterSends,
  cabinets,
} from '@/db/schema';
import { eq, and, gte, sql, count, countDistinct, desc } from 'drizzle-orm';
import { getSessionFromCookie } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { ThresholdValue } from '@/components/threshold-value';
import { ArrowRight, Send, UserPlus, BarChart3, BookOpen } from 'lucide-react';

export default async function OverviewPage() {
  const session = await getSessionFromCookie();
  if (!session || !session.mfaVerified) redirect('/login');

  const startOfMonth = new Date();
  startOfMonth.setDate(1);
  startOfMonth.setHours(0, 0, 0, 0);
  const startOfMonthD = D(startOfMonth);

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

    // Newsletters envoyées ce mois (pour savoir si on a déjà fait la newsletter du mois)
    const [monthSends] = await tx
      .select({ count: sql<number>`COUNT(*)` })
      .from(newsletterSends)
      .where(
        and(
          eq(newsletterSends.cabinetId, session.cabinetId),
          gte(newsletterSends.sentAt, startOfMonth)
        )
      );

    // Top 3 articles du mois (count distinct readers)
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
      .orderBy(desc(sql`COUNT(*)`))
      .limit(3);

    const distinctReaders = activePatients?.count ?? 0;
    const meetsThreshold = distinctReaders >= 5;

    return {
      activePatients: distinctReaders,
      totalReadMinutes: Math.round((totalReadTime?.sum ?? 0) / 60),
      openRate: sends?.count ? Math.round((opens?.count ?? 0) / sends.count * 100) : 0,
      newPatients: confirmedPatients?.count ?? 0,
      monthSends: Number(monthSends?.count ?? 0),
      topArticles: topArticles.map((a) => ({
        slug: a.slug,
        title: a.title,
        readers: Number(a.readers ?? 0),
        views: Number(a.views ?? 0),
      })),
      meetsThreshold,
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
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
        <KpiCard label="Patients actifs" value={<ThresholdValue value={data.activePatients} />} />
        <KpiCard label="Nouveaux patients" value={data.newPatients.toString()} />
        <KpiCard label="Taux d'ouverture" value={`${data.openRate}%`} />
        <KpiCard label="Minutes lues" value={<ThresholdValue value={data.totalReadMinutes} />} />
      </div>

      {/* Quick actions grid */}
      <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
        <QuickAction
          href="/dashboard/newsletter"
          icon={<Send className="h-5 w-5" />}
          title="Composer une newsletter"
          description="Choisissez un article, un template, et envoyez à vos patients."
          accent="bg-primary/5 text-primary border-primary/20 hover:border-primary/50"
        />
        <QuickAction
          href={`/c/${cab?.slug ?? ''}/rejoindre`}
          icon={<UserPlus className="h-5 w-5" />}
          title="Inviter un patient"
          description="Générez un lien ou QR code à partager au fauteuil ou par email."
          accent="bg-emerald-50 text-emerald-700 border-emerald-200 hover:border-emerald-400"
          external
        />
        <QuickAction
          href="/dashboard/library"
          icon={<BookOpen className="h-5 w-5" />}
          title="Voir la bibliothèque"
          description="Articles du catalogue, validés par notre comité scientifique."
          accent="bg-amber-50 text-amber-700 border-amber-200 hover:border-amber-400"
        />
      </div>

      {/* Top articles du mois */}
      {data.topArticles.length > 0 && (
        <section className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
              Articles les plus lus ce mois
            </h2>
            <Link
              href="/dashboard/analytics"
              className="inline-flex items-center gap-1 text-xs font-medium text-accent hover:underline"
            >
              Voir les analytics <ArrowRight className="h-3 w-3" />
            </Link>
          </div>
          <div className="rounded-lg border border-border bg-card">
            {data.topArticles.map((a, i) => (
              <div
                key={a.slug}
                className={`flex items-center justify-between gap-3 px-4 py-3 ${i > 0 ? 'border-t border-border' : ''}`}
              >
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{a.title}</p>
                  <p className="text-xs text-muted-foreground">
                    {a.readers} lecteur{a.readers > 1 ? 's' : ''} · {a.views} vue{a.views > 1 ? 's' : ''}
                  </p>
                </div>
                <span className="text-xs font-semibold text-muted-foreground">#{i + 1}</span>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Empty state pédagogiques */}
      {data.activePatients === 0 && data.monthSends === 0 && (
        <div className="rounded-lg border border-dashed border-border bg-muted/20 p-6">
          <h2 className="text-sm font-semibold">Bienvenue sur Sensident</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Pour démarrer, invitez vos premiers patients avec un lien ou QR code, puis composez votre
            première newsletter. Tout est guidé.
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            <Link
              href="/dashboard/newsletter"
              className="inline-flex h-8 items-center gap-1.5 rounded-md bg-primary px-3 text-xs font-medium text-primary-foreground"
            >
              <Send className="h-3.5 w-3.5" /> Première newsletter
            </Link>
            <Link
              href={`/c/${cab?.slug ?? ''}/rejoindre`}
              target="_blank"
              rel="noreferrer"
              className="inline-flex h-8 items-center gap-1.5 rounded-md border border-border bg-background px-3 text-xs font-medium"
            >
              <UserPlus className="h-3.5 w-3.5" /> Lien d'invitation
            </Link>
          </div>
        </div>
      )}

      {/* Footer hint Analytics */}
      {!data.meetsThreshold && data.activePatients > 0 && (
        <div className="rounded-lg border border-border bg-muted/20 p-4 text-xs text-muted-foreground">
          <BarChart3 className="mr-1 inline h-3.5 w-3.5" />
          Les analytics détaillées s'affichent à partir de 5 patients actifs (anonymat RGPD).
        </div>
      )}
    </div>
  );
}

function KpiCard({ label, value }: { label: string; value: string | React.ReactNode }) {
  return (
    <div className="rounded-lg border border-border bg-background p-4">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="mt-1 text-2xl font-bold">{value}</p>
    </div>
  );
}

function QuickAction({
  href,
  icon,
  title,
  description,
  accent,
  external,
}: {
  href: string;
  icon: React.ReactNode;
  title: string;
  description: string;
  accent: string;
  external?: boolean;
}) {
  return (
    <Link
      href={href}
      target={external ? '_blank' : undefined}
      rel={external ? 'noreferrer' : undefined}
      className={`group flex items-start gap-3 rounded-lg border p-4 transition ${accent}`}
    >
      <span className="mt-0.5">{icon}</span>
      <span className="flex-1">
        <span className="block text-sm font-semibold">{title}</span>
        <span className="mt-0.5 block text-xs opacity-80">{description}</span>
      </span>
      <ArrowRight className="h-4 w-4 opacity-50 transition group-hover:translate-x-0.5 group-hover:opacity-100" />
    </Link>
  );
}
