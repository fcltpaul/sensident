import { withCabinetContext } from '@/db/client';
import { readingSessions, patientConsents, newsletterRecipients } from '@/db/schema';
import { eq, and, gte, sql, count, countDistinct } from 'drizzle-orm';
import { getSessionFromCookie } from '@/lib/auth';
import { redirect } from 'next/navigation';

export default async function OverviewPage() {
  const session = await getSessionFromCookie();
  if (!session || !session.mfaVerified) redirect('/login');

  // KPIs du mois en cours
  const startOfMonth = new Date();
  startOfMonth.setDate(1);
  startOfMonth.setHours(0, 0, 0, 0);

  const kpis = await withCabinetContext(session.cabinetId, async (tx) => {
    const [activePatients] = await tx
      .select({ count: countDistinct(readingSessions.patientEmailHash) })
      .from(readingSessions)
      .where(and(gte(readingSessions.startedAt, startOfMonth)));

    const [totalReadTime] = await tx
      .select({ sum: sql<number>`COALESCE(SUM(${readingSessions.durationSeconds}), 0)` })
      .from(readingSessions)
      .where(gte(readingSessions.startedAt, startOfMonth));

    const [opens] = await tx
      .select({ count: sql<number>`COUNT(*)` })
      .from(newsletterRecipients)
      .where(
        and(
          gte(newsletterRecipients.sentAt, startOfMonth),
          sql`${newsletterRecipients.openedAt} IS NOT NULL`
        )
      );

    const [sends] = await tx
      .select({ count: sql<number>`COUNT(*)` })
      .from(newsletterRecipients)
      .where(gte(newsletterRecipients.sentAt, startOfMonth));

    const [confirmedPatients] = await tx
      .select({ count: sql<number>`COUNT(*)` })
      .from(patientConsents)
      .where(
        and(
          sql`${patientConsents.confirmedAt} IS NOT NULL`,
          gte(patientConsents.confirmedAt!, startOfMonth)
        )
      );

    return {
      activePatients: activePatients?.count ?? 0,
      totalReadMinutes: Math.round((totalReadTime?.sum ?? 0) / 60),
      openRate: sends?.count ? Math.round((opens?.count ?? 0) / sends.count * 100) : 0,
      newPatients: confirmedPatients?.count ?? 0,
    };
  });

  return (
    <div className="space-y-6 p-6 md:p-8">
      <div>
        <h1 className="text-2xl font-bold">Vue d'ensemble</h1>
        <p className="text-sm text-muted-foreground">Mois en cours · {new Date().toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' })}</p>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
        <KpiCard label="Patients actifs" value={kpis.activePatients.toString()} />
        <KpiCard label="Nouveaux patients" value={kpis.newPatients.toString()} />
        <KpiCard label="Taux d'ouverture" value={`${kpis.openRate}%`} />
        <KpiCard label="Minutes lues" value={kpis.totalReadMinutes.toString()} />
      </div>

      <div className="rounded-lg border border-border p-6">
        <h2 className="text-sm font-semibold">Bienvenue sur Sensident</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Pour commencer, generez un lien d'invitation depuis l'onglet Newsletter, ou
          configurez votre bloc contact depuis l'onglet Contact.
        </p>
      </div>
    </div>
  );
}

function KpiCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-border bg-background p-4">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="mt-1 text-2xl font-bold">{value}</p>
    </div>
  );
}
