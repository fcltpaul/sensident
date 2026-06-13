import { db, rawSqlClient } from '@/db/client';
import { articles, cabinets, practitioners, auditLogs, patientConsents } from '@/db/schema';
import { getAdminSession } from '@/lib/admin-auth';
import { redirect } from 'next/navigation';
import Link from 'next/link';

export default async function AdminHome() {
  const session = await getAdminSession();
  if (!session || !session.mfaVerified) redirect('/admin-auth/login');

  // Bypass Drizzle for these queries (Drizzle + postgres-js crashes on
  // count(sql`CASE WHEN ...`) in PG mode)
  const articleStats = (await rawSqlClient`
    SELECT COUNT(*) as total,
           COUNT(CASE WHEN status = 'validated' THEN 1 END) as validated,
           COUNT(CASE WHEN status = 'draft' THEN 1 END) as drafts
    FROM articles
  `)[0] as { total: number; validated: number; drafts: number };

  const cabinetStats = (await rawSqlClient`
    SELECT COUNT(*) as total FROM cabinets
  `)[0] as { total: number };

  const practitionerStats = (await rawSqlClient`
    SELECT COUNT(*) as total,
           COUNT(CASE WHEN totp_enabled = 1 THEN 1 END) as mfa_enabled
    FROM practitioners
  `)[0] as { total: number; mfa_enabled: number };

  const patientStats = (await rawSqlClient`
    SELECT COUNT(*) as total,
           COUNT(CASE WHEN confirmed_at IS NOT NULL THEN 1 END) as confirmed
    FROM patient_consents
  `)[0] as { total: number; confirmed: number };

  const auditCount = (await rawSqlClient`
    SELECT COUNT(*) as total FROM audit_logs
  `)[0] as { total: number };

  return (
    <div className="space-y-6 p-6 md:p-8">
      <div>
        <h1 className="text-2xl font-bold">Tableau de bord admin</h1>
        <p className="text-sm text-muted-foreground">Vue d'ensemble de la plateforme Sensident</p>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
        <KpiCard
          label="Articles"
          value={String(articleStats?.total ?? 0)}
          sub={`${articleStats?.validated ?? 0} validés · ${articleStats?.drafts ?? 0} brouillons`}
          href="/admin/articles"
        />
        <KpiCard
          label="Cabinets"
          value={String(cabinetStats?.total ?? 0)}
          sub="Inscrits"
          href="/admin/cabinets"
        />
        <KpiCard
          label="Praticiens"
          value={String(practitionerStats?.total ?? 0)}
          sub={`${practitionerStats?.mfa_enabled ?? 0} avec MFA`}
        />
        <KpiCard
          label="Patients"
          value={String(patientStats?.total ?? 0)}
          sub={`${patientStats?.confirmed ?? 0} opt-in confirmé`}
        />
      </div>

      <div className="rounded-lg border border-border bg-background p-6">
        <h2 className="text-sm font-semibold">Activité récente</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          {auditCount?.total ?? 0} événements d'audit enregistrés. Consulter l'onglet "Audit logs" pour le détail.
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
