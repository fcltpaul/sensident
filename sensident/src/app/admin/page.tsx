import { db } from '@/db/client';
import { articles, cabinets, practitioners, auditLogs, patientConsents } from '@/db/schema';
import { count, countDistinct, sql, eq } from 'drizzle-orm';
import { getAdminSession } from '@/lib/admin-auth';
import { redirect } from 'next/navigation';
import Link from 'next/link';

export default async function AdminHome() {
  const session = await getAdminSession();
  if (!session || !session.mfaVerified) redirect('/admin-auth/login');

  const [articleStats] = await db
    .select({
      total: count(),
      validated: count(sql`CASE WHEN status = 'validated' THEN 1 END`),
      drafts: count(sql`CASE WHEN status = 'draft' THEN 1 END`),
    })
    .from(articles);

  const [cabinetStats] = await db
    .select({ total: count() })
    .from(cabinets);

  const [practitionerStats] = await db
    .select({
      total: count(),
      mfaEnabled: count(sql`CASE WHEN totp_enabled = 1 THEN 1 END`),
    })
    .from(practitioners);

  const [patientStats] = await db
    .select({
      total: count(),
      confirmed: count(sql`CASE WHEN confirmed_at IS NOT NULL THEN 1 END`),
    })
    .from(patientConsents);

  const [auditCount] = await db
    .select({ total: count() })
    .from(auditLogs);

  return (
    <div className="space-y-6 p-6 md:p-8">
      <div>
        <h1 className="text-2xl font-bold">Tableau de bord admin</h1>
        <p className="text-sm text-muted-foreground">Vue d'ensemble de la plateforme Sensident</p>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
        <KpiCard
          label="Articles"
          value={articleStats?.total?.toString() ?? '0'}
          sub={`${articleStats?.validated ?? 0} validÃ©s Â· ${articleStats?.drafts ?? 0} brouillons`}
          href="/admin/articles"
        />
        <KpiCard
          label="Cabinets"
          value={cabinetStats?.total?.toString() ?? '0'}
          sub="Inscrits"
          href="/admin/cabinets"
        />
        <KpiCard
          label="Praticiens"
          value={practitionerStats?.total?.toString() ?? '0'}
          sub={`${practitionerStats?.mfaEnabled ?? 0} avec MFA`}
        />
        <KpiCard
          label="Patients"
          value={patientStats?.total?.toString() ?? '0'}
          sub={`${patientStats?.confirmed ?? 0} opt-in confirmÃ©`}
        />
      </div>

      <div className="rounded-lg border border-border bg-background p-6">
        <h2 className="text-sm font-semibold">ActivitÃ© rÃ©cente</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          {auditCount?.total ?? 0} Ã©vÃ©nements d'audit enregistrÃ©s. Consulter l'onglet "Audit logs" pour le dÃ©tail.
        </p>
      </div>
    </div>
  );
}

function KpiCard({ label, value, sub, href }: { label: string; value: string; sub?: string; href?: string }) {
  const content = (
    <div className="rounded-lg border border-border bg-background p-4">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="mt-1 text-2xl font-bold">{value}</p>
      {sub && <p className="mt-1 text-xs text-muted-foreground">{sub}</p>}
    </div>
  );
  return href ? <Link href={href}>{content}</Link> : content;
}
