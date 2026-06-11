import { db } from '@/db/client';
import { articles } from '@/db/schema';
import { desc, eq } from 'drizzle-orm';
import { getAdminSession } from '@/lib/admin-auth';
import { redirect } from 'next/navigation';
import { ArticleActions } from './article-actions';
import Link from 'next/link';

export default async function ArticlesListPage() {
  const session = await getAdminSession();
  if (!session || !session.mfaVerified) redirect('/admin-auth/login');

  const all = await db
    .select()
    .from(articles)
    .orderBy(desc(articles.createdAt));

  const validated = all.filter((a: any) => a.status === 'validated');
  const drafts = all.filter((a: any) => a.status === 'draft');
  const archived = all.filter((a: any) => a.status === 'archived');

  return (
    <div className="space-y-6 p-6 md:p-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Articles du catalogue</h1>
          <p className="text-sm text-muted-foreground">
            {all.length} articles au total Â· {validated.length} validÃ©s Â· {drafts.length} brouillons
          </p>
        </div>
        <Link
          href="/admin/articles/new"
          className="inline-flex items-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:opacity-90"
        >
          + Nouvel article
        </Link>
      </div>

      {drafts.length > 0 && (
        <div className="rounded-lg border border-amber-300 bg-amber-50 p-4 dark:bg-amber-950/30">
          <p className="text-sm font-semibold text-amber-900 dark:text-amber-200">
            {drafts.length} article(s) en attente de validation
          </p>
          <p className="mt-1 text-xs text-amber-800 dark:text-amber-300">
            Dr Thibault : merci de relire et de valider ces articles avant publication.
          </p>
        </div>
      )}

      <div className="rounded-lg border border-border bg-background">
        <table className="w-full text-sm">
          <thead className="border-b border-border bg-muted/50 text-left text-xs uppercase tracking-wider text-muted-foreground">
            <tr>
              <th className="px-4 py-3">Titre</th>
              <th className="px-4 py-3">CatÃ©gorie</th>
              <th className="px-4 py-3">Statut</th>
              <th className="px-4 py-3">Lectures</th>
              <th className="px-4 py-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {all.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-12 text-center text-sm text-muted-foreground">
                  Aucun article. CrÃ©ez-en un pour dÃ©marrer.
                </td>
              </tr>
            )}
            {all.map((a: any) => (
              <tr key={a.slug} className="border-b border-border last:border-0 hover:bg-muted/30">
                <td className="px-4 py-3">
                  <div className="font-medium">{a.title}</div>
                  <div className="text-xs text-muted-foreground">/{a.slug}</div>
                </td>
                <td className="px-4 py-3 text-muted-foreground">{a.category}</td>
                <td className="px-4 py-3">
                  <StatusBadge status={a.status} />
                </td>
                <td className="px-4 py-3 text-muted-foreground">{a.readingTimeMin} min</td>
                <td className="px-4 py-3 text-right">
                  <ArticleActions slug={a.slug} status={a.status} role={session.role} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function StatusBadge({ status }: { status: 'draft' | 'validated' | 'archived' }) {
  const map = {
    draft: { label: 'Brouillon', class: 'bg-amber-100 text-amber-900' },
    validated: { label: 'ValidÃ©', class: 'bg-green-100 text-green-900' },
    archived: { label: 'ArchivÃ©', class: 'bg-slate-100 text-slate-600' },
  };
  const s = map[status];
  return <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${s.class}`}>{s.label}</span>;
}
