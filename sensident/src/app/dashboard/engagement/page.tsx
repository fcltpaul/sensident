import { db, DB_DIALECT, rawSqlClient } from '@/db/client';
import { D, DS } from '@/db/date-helper';
import { patientConsents, readingSessions } from '@/db/schema';
import { eq, and, isNotNull, isNull, count, countDistinct, sql } from 'drizzle-orm';
import { getSessionFromCookie } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { ThresholdValue } from '@/components/threshold-value';
import { getCabinetPlan, hasFeature } from '@/lib/features';
import { UpgradeBanner } from '@/components/upgrade-banner';
import { EmptyState } from '@/components/dashboard/empty-state';
import { Users } from 'lucide-react';
import Link from 'next/link';
import { logServerError } from '@/lib/server-log';

const ANON_THRESHOLD = 5;

interface CountRow { count: number | string }
interface TotalRow {
  total: number | string;
  unsubscribed: number | string;
}

async function countTotalOptIns(cabinetId: string): Promise<TotalRow> {
  if (DB_DIALECT === 'postgresql') {
    const rows = await rawSqlClient<TotalRow[]>`
      SELECT
        COUNT(*)::int AS total,
        COUNT(*) FILTER (WHERE unsubscribed_at IS NOT NULL)::int AS unsubscribed
      FROM patient_consents
      WHERE cabinet_id::text = ${cabinetId}::text
        AND confirmed_at IS NOT NULL
    `;
    return rows[0] ?? { total: 0, unsubscribed: 0 };
  }
  const [row] = await db
    .select({
      total: count(),
      unsubscribed: sql<number>`COUNT(CASE WHEN ${patientConsents.unsubscribedAt} IS NOT NULL THEN 1 END)`,
    })
    .from(patientConsents)
    .where(
      and(
        eq(patientConsents.cabinetId, cabinetId),
        isNotNull(patientConsents.confirmedAt),
      ),
    );
  return {
    total: Number(row?.total ?? 0),
    unsubscribed: Number(row?.unsubscribed ?? 0),
  };
}

async function countActiveReaders(cabinetId: string, since: Date, until?: Date): Promise<number> {
  const sinceD = D(since);
  if (DB_DIALECT === 'postgresql') {
    // IMPORTANT : utiliser DS() (= string ISO + cast timestamptz) ici,
    // PAS D() (= objet sql Drizzle), car rawSqlClient = postgres-js
    // direct qui crash sur les objets SQL (cf. fix 08/07/2026).
    const sinceS = DS(since);
    const untilS = until ? DS(until) : null;
    if (untilS) {
      const rows = await rawSqlClient<CountRow[]>`
        SELECT COUNT(DISTINCT patient_email_hash)::int AS count
        FROM reading_sessions
        WHERE cabinet_id::text = ${cabinetId}::text
          AND started_at >= ${sinceS}::timestamptz
          AND started_at < ${untilS}::timestamptz
      `;
      return Number(rows[0]?.count ?? 0);
    }
    const rows = await rawSqlClient<CountRow[]>`
      SELECT COUNT(DISTINCT patient_email_hash)::int AS count
      FROM reading_sessions
      WHERE cabinet_id::text = ${cabinetId}::text
        AND started_at >= ${sinceS}::timestamptz
    `;
    return Number(rows[0]?.count ?? 0);
  }
  const whereParts: any[] = [
    eq(readingSessions.cabinetId, cabinetId),
    sql`${readingSessions.startedAt} >= ${sinceD}`,
  ];
  if (until) {
    const untilD = D(until);
    whereParts.push(sql`${readingSessions.startedAt} < ${untilD}`);
  }
  const [row] = await db
    .select({ count: countDistinct(readingSessions.patientEmailHash) })
    .from(readingSessions)
    .where(and(...whereParts));
  return Number(row?.count ?? 0);
}

interface PatientActivityRow {
  emailHash: string;
  emailEncrypted: string | null;
  confirmedAt: string | Date | null;
  unsubscribedAt: string | Date | null;
  readingCount: number | string | null;
  lastReadAt: string | Date | null;
}

/**
 * Liste des patients du cabinet avec activité (nb lectures + dernière lecture).
 * Données anonymisées (emailEncrypted uniquement, hash pour le ciblage).
 * Fix 2026-07-07 : ajouté à la demande de Paul pour qu'il puisse suivre
 * l'activité patient par patient et lui envoyer un article/newsletter.
 */
async function listPatientsWithActivity(cabinetId: string): Promise<PatientActivityRow[]> {
  if (DB_DIALECT === 'postgresql') {
    return rawSqlClient<PatientActivityRow[]>`
      SELECT
        pc.email_hash AS "emailHash",
        pc.email_encrypted AS "emailEncrypted",
        pc.confirmed_at AS "confirmedAt",
        pc.unsubscribed_at AS "unsubscribedAt",
        COALESCE(rs.cnt, 0)::int AS "readingCount",
        rs.last AS "lastReadAt"
      FROM patient_consents pc
      LEFT JOIN (
        SELECT patient_email_hash, COUNT(*) AS cnt, MAX(started_at) AS last
        FROM reading_sessions
        WHERE cabinet_id::text = ${cabinetId}::text
        GROUP BY patient_email_hash
      ) rs ON rs.patient_email_hash = pc.email_hash
      WHERE pc.cabinet_id::text = ${cabinetId}::text
        AND pc.confirmed_at IS NOT NULL
      ORDER BY rs.last DESC NULLS LAST, pc.confirmed_at DESC
      LIMIT 100
    `;
  }
  // SQLite (dev) — pas critique, fallback simple
  const { patientConsents: pc } = await import('@/db/schema');
  const rows = await db
    .select({
      emailHash: pc.emailHash,
      emailEncrypted: pc.emailEncrypted,
      confirmedAt: pc.confirmedAt,
      unsubscribedAt: pc.unsubscribedAt,
    })
    .from(pc)
    .where(eq(pc.cabinetId, cabinetId));
  return rows.map((r) => ({
    emailHash: r.emailHash,
    emailEncrypted: r.emailEncrypted,
    confirmedAt: r.confirmedAt,
    unsubscribedAt: r.unsubscribedAt,
    readingCount: 0,
    lastReadAt: null,
  }));
}

async function countConfirmed(cabinetId: string): Promise<number> {
  if (DB_DIALECT === 'postgresql') {
    const rows = await rawSqlClient<CountRow[]>`
      SELECT COUNT(*)::int AS count
      FROM patient_consents
      WHERE cabinet_id::text = ${cabinetId}::text
        AND confirmed_at IS NOT NULL
        AND unsubscribed_at IS NULL
    `;
    return Number(rows[0]?.count ?? 0);
  }
  const [row] = await db
    .select({ count: count() })
    .from(patientConsents)
    .where(
      and(
        eq(patientConsents.cabinetId, cabinetId),
        isNotNull(patientConsents.confirmedAt),
        isNull(patientConsents.unsubscribedAt),
      ),
    );
  return Number(row?.count ?? 0);
}

export default async function EngagementPage() {
  const session = await getSessionFromCookie();
  if (!session || !session.mfaVerified) redirect('/login');

  return (
    <EngagementBody
      cabinetId={session.cabinetId}
      practitionerId={session.practitionerId}
    />
  );
}

async function EngagementBody({
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
    logServerError(err, { context: 'engagement:getCabinetPlan', cabinetId, practitionerId });
    throw err;
  }
  const hasEngagement = hasFeature(plan, 'engagement');

  const now = new Date();
  const oneMonthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  const twoMonthsAgo = new Date(now.getTime() - 60 * 24 * 60 * 60 * 1000);
  const threeMonthsAgo = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);

  let totalStats: Awaited<ReturnType<typeof countTotalOptIns>>;
  let m0Count: number;
  let m1Count: number;
  let m2Count: number;
  let regularsCount: number;
  let confirmedCount: number;
  let patientsList: Awaited<ReturnType<typeof listPatientsWithActivity>>;
  try {
    [totalStats, m0Count, m1Count, m2Count, regularsCount, confirmedCount, patientsList] = await Promise.all([
      countTotalOptIns(cabinetId),
      countActiveReaders(cabinetId, oneMonthAgo),
      countActiveReaders(cabinetId, twoMonthsAgo, oneMonthAgo),
      countActiveReaders(cabinetId, threeMonthsAgo, twoMonthsAgo),
      countActiveReaders(cabinetId, oneMonthAgo),
      countConfirmed(cabinetId),
      listPatientsWithActivity(cabinetId),
    ]);
  } catch (err) {
    logServerError(err, { context: 'engagement:queries', cabinetId, practitionerId });
    throw err;
  }

  const totalOptIns = Number(totalStats.total);
  const unsubCount = Number(totalStats.unsubscribed);
  const unsubRate = totalOptIns ? (unsubCount / totalOptIns) * 100 : 0;

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
          value={totalOptIns.toString()}
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

      <div className="rounded-lg border border-border bg-background p-6">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 className="text-sm font-semibold">Mes patients</h2>
            <p className="mt-1 text-xs text-muted-foreground">
              Liste de vos patients confirmés. Cliquez sur un patient pour lui envoyer un article ou ouvrir sa fiche.
              Les identités restent anonymisées (email masqué).
            </p>
          </div>
          <span className="text-xs text-muted-foreground">
            {patientsList.length} patient{patientsList.length > 1 ? 's' : ''}
          </span>
        </div>

        {patientsList.length === 0 ? (
          <div className="mt-6 rounded-md border border-dashed border-border p-8 text-center text-xs text-muted-foreground">
            Aucun patient confirmé pour le moment.
          </div>
        ) : (
          <div className="mt-4 overflow-x-auto rounded-md border border-border">
            <table className="w-full text-sm">
              <thead className="bg-muted/50 text-left text-xs uppercase tracking-wider text-muted-foreground">
                <tr>
                  <th className="px-3 py-2">Patient</th>
                  <th className="px-3 py-2">Inscription</th>
                  <th className="px-3 py-2 text-center">Lectures</th>
                  <th className="px-3 py-2">Dernière lecture</th>
                  <th className="px-3 py-2 text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {patientsList.map((p) => {
                  const isUnsub = !!p.unsubscribedAt;
                  const masked = p.emailEncrypted
                    ? maskEmailFromBase64(p.emailEncrypted)
                    : '(email crypte)';
                  return (
                    <tr key={p.emailHash} className="border-t border-border">
                      <td className="px-3 py-2">
                        <div className="font-medium">{masked}</div>
                        {isUnsub && (
                          <div className="text-xs text-red-600">désabonné</div>
                        )}
                      </td>
                      <td className="px-3 py-2 text-xs text-muted-foreground">
                        {p.confirmedAt
                          ? new Date(p.confirmedAt).toLocaleDateString('fr-FR', {
                              day: '2-digit',
                              month: 'short',
                              year: '2-digit',
                            })
                          : '—'}
                      </td>
                      <td className="px-3 py-2 text-center">
                        {Number(p.readingCount ?? 0)}
                      </td>
                      <td className="px-3 py-2 text-xs text-muted-foreground">
                        {p.lastReadAt
                          ? new Date(p.lastReadAt).toLocaleDateString('fr-FR', {
                              day: '2-digit',
                              month: 'short',
                            })
                          : '—'}
                      </td>
                      <td className="px-3 py-2 text-right">
                        <div className="inline-flex gap-1">
                          <Link
                            href={`/dashboard/library?patientHash=${encodeURIComponent(p.emailHash)}`}
                            className="rounded-md border border-border px-2 py-1 text-xs hover:bg-muted"
                            title="Envoyer un article à ce patient"
                          >
                            Article
                          </Link>
                          <Link
                            href={`/dashboard/newsletter/compose?patientHash=${encodeURIComponent(p.emailHash)}`}
                            className="rounded-md border border-border px-2 py-1 text-xs hover:bg-muted"
                            title="Composer une newsletter ciblée"
                          >
                            Newsletter
                          </Link>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
        <p className="mt-3 text-xs text-muted-foreground">
          Astuce : pour cibler un patient, les liens pré-remplissent le composer
          newsletter ou la bibliothèque. Les emails restent anonymisés en BDD.
        </p>
      </div>
    </div>
  );
}

function maskEmailFromBase64(b64: string): string {
  // emailEncrypted en BDD est du base64 d'un email en clair.
  // Avant ce fix, on traitait le base64 comme un email => affichage moche
  // (cG***@ au lieu de pa***@gmail.com).
  let decoded = '';
  try {
    decoded = Buffer.from(b64, 'base64').toString('utf-8').trim();
  } catch {
    return '(email crypte)';
  }
  const atIdx = decoded.indexOf('@');
  if (atIdx <= 1) return '(email crypte)';
  const local = decoded.substring(0, atIdx);
  const domain = decoded.substring(atIdx + 1);
  const maskedLocal = local.length <= 2 ? local[0] + '***' : local.substring(0, 2) + '***';
  return `${maskedLocal}@${domain}`;
}

// Conserve pour compat (fallback si jamais un email en clair etait passe).
function maskEmail(email: string): string {
  const [user, domain] = email.split('@');
  if (!domain) return email;
  if (user.length <= 2) return `${user[0]}***@${domain}`;
  return `${user.slice(0, 2)}***@${domain}`;
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