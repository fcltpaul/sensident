import { db } from '@/db/client';
import { D } from '@/db/date-helper';
import { patientConsents, readingSessions, newsletterRecipients } from '@/db/schema';
import { eq, and, gte, sql, count, countDistinct, desc, isNotNull, isNull } from 'drizzle-orm';
import { getSessionFromCookie } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { ThresholdValue } from '@/components/threshold-value';
import { getCabinetPlan, hasFeature } from '@/lib/features';
import { UpgradeBanner } from '@/components/upgrade-banner';
import { EmptyState } from '@/components/dashboard/empty-state';
import { Users } from 'lucide-react';

const ANON_THRESHOLD = 5;

export default async function EngagementPage() {
  const session = await getSessionFromCookie();
  if (!session || !session.mfaVerified) redirect('/login');

  const plan = await getCabinetPlan(session.cabinetId);
  const hasEngagement = hasFeature(plan, 'engagement');

  const now = new Date();
  const oneMonthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  const twoMonthsAgo = new Date(now.getTime() - 60 * 24 * 60 * 60 * 1000);
  const threeMonthsAgo = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
  const oneMonthAgoD = D(oneMonthAgo);
  const twoMonthsAgoD = D(twoMonthsAgo);
  const threeMonthsAgoD = D(threeMonthsAgo);

  // Total patients opt-in
  const [totalStats] = await db
    .select({ total: count(), unsubscribed: sql<number>`COUNT(CASE WHEN ${patientConsents.unsubscribedAt} IS NOT NULL THEN 1 END)` })
    .from(patientConsents)
    .where(
      and(
        eq(patientConsents.cabinetId, session.cabinetId),
        isNotNull(patientConsents.confirmedAt)
      )
    );

  // Rétention M0/M+1/M+2
  const [m0] = await db
    .select({ count: countDistinct(readingSessions.patientEmailHash) })
    .from(readingSessions)
    .where(
      and(
        eq(readingSessions.cabinetId, session.cabinetId),
        sql`${readingSessions.startedAt} >= ${oneMonthAgoD}`
      )
    );

  const [m1] = await db
    .select({ count: countDistinct(readingSessions.patientEmailHash) })
    .from(readingSessions)
    .where(
      and(
        eq(readingSessions.cabinetId, session.cabinetId),
        sql`${readingSessions.startedAt} >= ${twoMonthsAgoD}`,
        sql`${readingSessions.startedAt} < ${oneMonthAgoD}`
      )
    );

  const [m2] = await db
    .select({ count: countDistinct(readingSessions.patientEmailHash) })
    .from(readingSessions)
    .where(
      and(
        eq(readingSessions.cabinetId, session.cabinetId),
        sql`${readingSessions.startedAt} >= ${threeMonthsAgoD}`,
        sql`${readingSessions.startedAt} < ${twoMonthsAgoD}`
      )
    );

  // Segmentation déterministe (régles métier transparentes)
  const [regulars] = await db
    .select({ count: countDistinct(readingSessions.patientEmailHash) })
    .from(readingSessions)
    .where(
      and(
        eq(readingSessions.cabinetId, session.cabinetId),
        sql`${readingSessions.startedAt} >= ${oneMonthAgoD}`
      )
    );

  // Patients confirmés totaux (pour le calcul %)
  const [confirmedTotal] = await db
    .select({ count: count() })
    .from(patientConsents)
    .where(
      and(
        eq(patientConsents.cabinetId, session.cabinetId),
        isNotNull(patientConsents.confirmedAt),
        isNull(patientConsents.unsubscribedAt)
      )
    );

  // Taux de désabonnement
  const unsubRate = totalStats?.total ? ((totalStats?.unsubscribed ?? 0) / totalStats.total) * 100 : 0;

  // Vérifications de seuil par cohorte
  const m0Count = m0?.count ?? 0;
  const m1Count = m1?.count ?? 0;
  const m2Count = m2?.count ?? 0;
  const regularsCount = regulars?.count ?? 0;
  const confirmedCount = confirmedTotal?.count ?? 0;
  const unsubCount = totalStats?.unsubscribed ?? 0;

  const totalOptIns = totalStats?.total ?? 0;

  return (
    <div className="space-y-6 p-6 md:p-8">
      <div>
        <h1 className="text-2xl font-bold">Engagement</h1>
        <p className="text-sm text-muted-foreground">Rétention et segmentation de vos patients</p>
      </div>

      {totalOptIns === 0 && (
        <EmptyState
          icon={Users}
          title="Pas encore de données d'engagement"
          description="Les statistiques apparaîtront dès que vos patients ouvriront leurs newsletters. Pour l'instant, invitez vos premiers patients pour démarrer."
          primary={{ label: 'Inviter un patient', href: '/dashboard/invitation' }}
        />
      )}

      {!hasEngagement && (
        <UpgradeBanner
          feature="engagement"
          currentPlan={plan}
          requiredPlan="pro"
          title="Engagement patient reserve au plan Pro"
          description="L'analyse de retention M0/M+1/M+2 et la segmentation des lecteurs sont des fonctionnalites Pro. Passez au plan superieur pour suivre le comportement de vos patients dans le temps."
        />
      )}

      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <KpiCard
          label="Total patients"
          value={(totalOptIns).toString()}
          sub={`${unsubCount} desabonnes`}
        />
        <KpiCard
          label="Patients actifs (M0)"
          value={<ThresholdValue value={m0Count} />}
          sub="sur les 30 derniers jours"
        />
        <KpiCard label="Taux de desabonnement" value={`${unsubRate.toFixed(1)}%`} sub="cumul depuis le debut" />
      </div>

      <div className="rounded-lg border border-border bg-background p-6">
        <h2 className="text-sm font-semibold">Rétention</h2>
        <p className="mt-1 text-xs text-muted-foreground">Combien de patients actifs sur chaque période de 30 jours</p>
        <div className="mt-4 space-y-3">
          <RetentionBar label="Mois en cours (M0)" value={m0Count} max={confirmedCount} color="bg-green-500" />
          <RetentionBar label="Mois précédent (M-1)" value={m1Count} max={confirmedCount} color="bg-blue-500" />
          <RetentionBar label="M-2" value={m2Count} max={confirmedCount} color="bg-slate-400" />
        </div>
        <p className="mt-4 text-xs text-muted-foreground">
          {m1Count >= ANON_THRESHOLD && m0Count >= ANON_THRESHOLD ? (
            <>
              Tendance M-1 vers M0 :{' '}
              <span className={m0Count >= m1Count ? 'text-green-700 font-semibold' : 'text-amber-700 font-semibold'}>
                {m0Count >= m1Count ? '+' : ''}
                {(((m0Count - m1Count) / m1Count) * 100).toFixed(0)}%
              </span>
            </>
          ) : (
            'Pas assez de données pour calculer une tendance.'
          )}
        </p>
      </div>

      <div className="rounded-lg border border-border bg-background p-6">
        <h2 className="text-sm font-semibold">Segmentation déterministe</h2>
        <p className="mt-1 text-xs text-muted-foreground">Pas d'algorithme : règles métier transparentes</p>
        <div className="mt-4 space-y-3">
          <SegmentCard
            label="Réguliers"
            count={regularsCount}
            total={confirmedCount}
            definition="Au moins 1 lecture sur les 30 derniers jours"
            color="bg-green-500"
          />
          <SegmentCard
            label="Occasionnels"
            count={Math.max(0, confirmedCount - regularsCount - unsubCount)}
            total={confirmedCount}
            definition="Inscrits mais aucune lecture ce mois-ci"
            color="bg-amber-500"
          />
          <SegmentCard
            label="Désabonnés"
            count={unsubCount}
            total={totalOptIns}
            definition="Ont demandé à ne plus recevoir de newsletters"
            color="bg-red-500"
          />
        </div>
      </div>
    </div>
  );
}

function KpiCard({ label, value, sub }: { label: string; value: string | React.ReactNode; sub?: string }) {
  return (
    <div className="rounded-lg border border-border bg-background p-4">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="mt-1 text-2xl font-bold">{value}</p>
      {sub && <p className="mt-1 text-xs text-muted-foreground">{sub}</p>}
    </div>
  );
}

function RetentionBar({ label, value, max, color }: { label: string; value: number; max: number; color: string }) {
  const meetsThreshold = value >= ANON_THRESHOLD;
  const pct = max > 0 && meetsThreshold ? (value / max) * 100 : 0;
  return (
    <div>
      <div className="flex items-center justify-between text-sm">
        <span>{label}</span>
        <span className="text-muted-foreground">
          <ThresholdValue value={value} /> patients
        </span>
      </div>
      <div className="mt-1 h-3 w-full rounded-full bg-muted">
        <div className={`h-3 rounded-full ${color}`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

function SegmentCard({ label, count, total, definition, color }: { label: string; count: number; total: number; definition: string; color: string }) {
  const meetsThreshold = total >= ANON_THRESHOLD;
  const pct = meetsThreshold && total > 0 ? (count / total) * 100 : 0;
  return (
    <div className="rounded-md border border-border p-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className={`h-2 w-2 rounded-full ${color}`} />
          <span className="text-sm font-medium">{label}</span>
        </div>
        <span className="text-sm">
          {meetsThreshold ? (
            <>{count} ({pct.toFixed(0)}%)</>
          ) : (
            <ThresholdValue value={total} />
          )}
        </span>
      </div>
      <p className="mt-1 text-xs text-muted-foreground">{definition}</p>
    </div>
  );
}
