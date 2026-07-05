import { Mail, Link2, BookOpen, Users, Sparkles } from 'lucide-react';
import { withCabinetContext } from '@/db/client';
import { D } from '@/db/date-helper';
import { readingSessions, patientConsents, newsletterRecipients } from '@/db/schema';
import { eq, and, gte, sql, count, countDistinct } from 'drizzle-orm';
import { getSessionFromCookie } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { ThresholdValue } from '@/components/threshold-value';
import { EmptyState } from '@/components/dashboard/empty-state';

export default async function OverviewPage() {
  const session = await getSessionFromCookie();
  if (!session || !session.mfaVerified) redirect('/login');

  // KPIs du mois en cours
  const startOfMonth = new Date();
  startOfMonth.setDate(1);
  startOfMonth.setHours(0, 0, 0, 0);
  const startOfMonthD = D(startOfMonth);

  const kpis = await withCabinetContext(session.cabinetId, async (tx) => {
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

    const distinctReaders = activePatients?.count ?? 0;

    return {
      activePatients: distinctReaders,
      totalReadMinutes: Math.round((totalReadTime?.sum ?? 0) / 60),
      openRate: sends?.count ? Math.round(((opens?.count ?? 0) / sends.count) * 100) : 0,
      newPatients: confirmedPatients?.count ?? 0,
      hasAnySends: (sends?.count ?? 0) > 0,
      meetsThreshold: distinctReaders >= 5,
    };
  });

  const isFreshCabinet = kpis.activePatients === 0 && kpis.newPatients === 0;
  const isEmptyNewsletter = !kpis.hasAnySends;

  return (
    <div className="space-y-6 p-6 md:p-8">
      <div>
        <h1 className="text-2xl font-bold">Vue d&apos;ensemble</h1>
        <p className="text-sm text-muted-foreground">
          Mois en cours ·{' '}
          {new Date().toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' })}
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
        <KpiCard label="Patients actifs" value={<ThresholdValue value={kpis.activePatients} />} />
        <KpiCard label="Nouveaux patients" value={kpis.newPatients.toString()} />
        <KpiCard label="Taux d'ouverture" value={`${kpis.openRate}%`} />
        <KpiCard label="Minutes lues" value={<ThresholdValue value={kpis.totalReadMinutes} />} />
      </div>

      {!kpis.meetsThreshold && kpis.activePatients > 0 && (
        <div className="rounded-md border border-amber-300 bg-amber-50 px-4 py-3 text-xs text-amber-900">
          🔒 Anonymat respecté : vos statistiques s&apos;affichent à partir de{' '}
          <strong>5 patients</strong>. Pour l&apos;instant, certains compteurs sont
          masqués.
        </div>
      )}

      {/* Onboarding premier lancement */}
      {isFreshCabinet && (
        <EmptyState
          icon={Sparkles}
          title="Bienvenue sur Sensident !"
          description="Démarrez en 2 minutes : invitez vos premiers patients, puis envoyez votre première newsletter de prévention."
          primary={{ label: 'Inviter un patient', href: '/dashboard/invitation' }}
          secondary={{ label: 'Composer une newsletter', href: '/dashboard/library' }}
          hint="Vous pouvez faire les deux dans l'ordre que vous préférez."
        />
      )}

      {/* Cabinet existant mais aucune newsletter envoyée */}
      {!isFreshCabinet && isEmptyNewsletter && (
        <EmptyState
          icon={Mail}
          title="Envoyez votre première newsletter"
          description="Choisissez un article dans le catalogue Sensident (10 articles validés par notre comité scientifique) et envoyez-le à vos patients en 2 minutes."
          primary={{ label: 'Parcourir les articles', href: '/dashboard/library' }}
        />
      )}

      {/* Cabinet actif, NL envoyée : bloc d'activité normale */}
      {!isFreshCabinet && !isEmptyNewsletter && (
        <div className="rounded-lg border border-border bg-background p-6">
          <h2 className="text-sm font-semibold">Activité du mois</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Vos statistiques s&apos;affichent en temps réel à mesure que vos patients
            ouvrent et lisent vos newsletters.
          </p>
          <div className="mt-4 flex flex-wrap gap-2">
            <a
              href="/dashboard/library"
              className="inline-flex items-center gap-1.5 rounded-md bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground hover:opacity-95"
            >
              <BookOpen className="h-3.5 w-3.5" />
              Nouvelle newsletter
            </a>
            <a
              href="/dashboard/invitation"
              className="inline-flex items-center gap-1.5 rounded-md border border-border bg-background px-3 py-1.5 text-xs font-medium hover:bg-muted"
            >
              <Link2 className="h-3.5 w-3.5" />
              Inviter un patient
            </a>
            <a
              href="/dashboard/engagement"
              className="inline-flex items-center gap-1.5 rounded-md border border-border bg-background px-3 py-1.5 text-xs font-medium hover:bg-muted"
            >
              <Users className="h-3.5 w-3.5" />
              Engagement détaillé
            </a>
          </div>
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