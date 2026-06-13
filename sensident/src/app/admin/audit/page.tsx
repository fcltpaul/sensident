import { db } from '@/db/client';
import { auditLogs, admins, cabinets, practitioners } from '@/db/schema';
import { desc, eq, inArray } from 'drizzle-orm';
import { getAdminSession } from '@/lib/admin-auth';
import { redirect } from 'next/navigation';

const PAGE_SIZE = 50;

export default async function AuditPage({ searchParams }: { searchParams: { page?: string; actor?: string; cabinet?: string } }) {
  const session = await getAdminSession();
  if (!session || !session.mfaVerified) redirect('/admin-auth/login');

  const page = Math.max(0, parseInt(searchParams.page ?? '0'));
  const offset = page * PAGE_SIZE;

  // Filtres
  const filters: any[] = [];
  if (searchParams.actor) filters.push(eq(auditLogs.actorType, searchParams.actor as any));
  if (searchParams.cabinet) filters.push(eq(auditLogs.cabinetId, searchParams.cabinet));

  const logs = await db
    .select()
    .from(auditLogs)
    .where(filters.length > 0 ? filters[0] : undefined)
    .orderBy(desc(auditLogs.ts))
    .limit(PAGE_SIZE)
    .offset(offset);

  // Enrichir avec les noms
  const adminIds = logs.filter((l: any) => l.actorType === 'admin').map((l: any) => l.actorId).filter(Boolean) as string[];
  const cabinetIds = logs.map((l: any) => l.cabinetId).filter(Boolean) as string[];

  const adminList = adminIds.length > 0 ? await db.select().from(admins).where(inArray(admins.id, adminIds)) : [];
  const cabinetList = cabinetIds.length > 0 ? await db.select().from(cabinets).where(inArray(cabinets.id, cabinetIds)) : [];

  return (
    <div className="space-y-6 p-6 md:p-8">
      <div>
        <h1 className="text-2xl font-bold">Audit logs</h1>
        <p className="text-sm text-muted-foreground">Tous les Ã©vÃ©nements sensibles sont tracÃ©s. Logs immuables.</p>
      </div>

      <div className="rounded-lg border border-border bg-background">
        <table className="w-full text-xs">
          <thead className="border-b border-border bg-muted/50 text-left text-xs uppercase tracking-wider text-muted-foreground">
            <tr>
              <th className="px-3 py-2">Timestamp</th>
              <th className="px-3 py-2">Acteur</th>
              <th className="px-3 py-2">Cabinet</th>
              <th className="px-3 py-2">Action</th>
              <th className="px-3 py-2">IP</th>
            </tr>
          </thead>
          <tbody>
            {logs.length === 0 && (
              <tr><td colSpan={5} className="px-3 py-8 text-center text-muted-foreground">Aucun log pour ces filtres.</td></tr>
            )}
            {logs.map((l: any) => {
              const admin = l.actorType === 'admin' ? adminList.find((a: any) => a.id === l.actorId) : null;
              const cab = l.cabinetId ? cabinetList.find((c: any) => c.id === l.cabinetId) : null;
              return (
                <tr key={l.id} className="border-b border-border last:border-0">
                  <td className="px-3 py-2 font-mono text-xs">
                    {l.ts ? (l.ts instanceof Date ? l.ts.toISOString() : new Date(l.ts).toISOString()).replace('T', ' ').slice(0, 19) : '—'}
                  </td>
                  <td className="px-3 py-2">
                    <span className="font-mono text-xs">{l.actorType}</span>
                    {admin && <span className="ml-1 text-muted-foreground">({admin.email})</span>}
                  </td>
                  <td className="px-3 py-2 text-muted-foreground">{cab?.name ?? 'â€”'}</td>
                  <td className="px-3 py-2 font-mono text-xs">{l.action}</td>
                  <td className="px-3 py-2 text-muted-foreground">{l.ip ?? 'â€”'}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div className="flex justify-between text-sm">
        <a href={`?page=${Math.max(0, page - 1)}`} className={page === 0 ? 'pointer-events-none opacity-30' : 'text-accent hover:underline'}>â† PrÃ©cÃ©dent</a>
        <span>Page {page + 1}</span>
        <a href={`?page=${page + 1}`} className={logs.length < PAGE_SIZE ? 'pointer-events-none opacity-30' : 'text-accent hover:underline'}>Suivant â†’</a>
      </div>
    </div>
  );
}
