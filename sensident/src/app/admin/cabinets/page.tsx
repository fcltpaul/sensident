import { db } from '@/db/client';
import { cabinets, practitioners, patientConsents, newsletterSends } from '@/db/schema';
import { count, desc, eq, sql } from 'drizzle-orm';
import { getAdminSession } from '@/lib/admin-auth';
import { redirect } from 'next/navigation';

export default async function CabinetsPage() {
  const session = await getAdminSession();
  if (!session || !session.mfaVerified) redirect('/admin-auth/login');

  // Liste des cabinets avec leur propriÃ©taire et nb de patients
  const list = await db.execute(sql`
    SELECT
      c.id, c.slug, c.name, c.created_at,
      p.email as practitioner_email,
      p.totp_enabled as mfa_enabled,
      (SELECT COUNT(*) FROM patient_consents pc WHERE pc.cabinet_id = c.id AND pc.confirmed_at IS NOT NULL) AS confirmed_patients,
      (SELECT COUNT(*) FROM newsletter_sends ns WHERE ns.cabinet_id = c.id) AS sends_count
    FROM cabinets c
    LEFT JOIN practitioners p ON p.cabinet_id = c.id AND p.role = 'owner'
    ORDER BY c.created_at DESC
    LIMIT 100
  `);

  return (
    <div className="space-y-6 p-6 md:p-8">
      <div>
        <h1 className="text-2xl font-bold">Cabinets</h1>
        <p className="text-sm text-muted-foreground">Tous les cabinets inscrits sur la plateforme.</p>
      </div>

      <div className="rounded-lg border border-border bg-background">
        <table className="w-full text-sm">
          <thead className="border-b border-border bg-muted/50 text-left text-xs uppercase tracking-wider text-muted-foreground">
            <tr>
              <th className="px-4 py-3">Cabinet</th>
              <th className="px-4 py-3">Praticien</th>
              <th className="px-4 py-3">MFA</th>
              <th className="px-4 py-3">Patients</th>
              <th className="px-4 py-3">Newsletters</th>
              <th className="px-4 py-3">Inscrit le</th>
            </tr>
          </thead>
          <tbody>
            {(list as any[]).map((row: any) => (
              <tr key={row.id} className="border-b border-border last:border-0">
                <td className="px-4 py-3">
                  <div className="font-medium">{row.name}</div>
                  <div className="text-xs text-muted-foreground">/c/{row.slug}</div>
                </td>
                <td className="px-4 py-3 text-muted-foreground">{row.practitioner_email ?? 'â€”'}</td>
                <td className="px-4 py-3">{row.mfa_enabled ? 'âœ“' : 'âœ—'}</td>
                <td className="px-4 py-3">{row.confirmed_patients}</td>
                <td className="px-4 py-3">{row.sends_count}</td>
                <td className="px-4 py-3 text-muted-foreground">
                  {new Date(row.created_at * 1000).toLocaleDateString('fr-FR')}
                </td>
              </tr>
            ))}
            {(list as any[]).length === 0 && (
              <tr><td colSpan={6} className="px-4 py-8 text-center text-muted-foreground">Aucun cabinet inscrit.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
