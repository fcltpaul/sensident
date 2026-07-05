import Link from 'next/link';
import { redirect } from 'next/navigation';
import { FileText, Plus } from 'lucide-react';
import { db, DB_DIALECT, rawSqlClient } from '@/db/client';
import { eq, and, desc } from 'drizzle-orm';
import { getSessionFromCookie } from '@/lib/auth';
import { newsletterSends, articles } from '@/db/schema';
import { EmptyState } from '@/components/dashboard/empty-state';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Brouillons — Sensident' };

async function getDrafts(cabinetId: string) {
  if (DB_DIALECT === 'postgresql') {
    const rows = await rawSqlClient<
      Array<{
        id: string;
        article_slug: string | null;
        subject: string;
        created_at: string;
      }>
    >`
      SELECT id::text AS id, article_slug, subject, created_at
      FROM newsletter_sends
      WHERE cabinet_id::text = ${cabinetId}::text
        AND status = 'draft'
      ORDER BY created_at DESC
      LIMIT 50
    `;
    const slugs = rows.map((r) => r.article_slug).filter((s): s is string => Boolean(s));
    let titleMap = new Map<string, string>();
    if (slugs.length > 0) {
      const ar = await rawSqlClient<Array<{ slug: string; title: string }>>`
        SELECT slug, title FROM articles WHERE slug = ANY(${slugs}::text[])
      `;
      titleMap = new Map(ar.map((a) => [a.slug, a.title]));
    }
    return rows.map((r) => ({
      id: r.id,
      articleSlug: r.article_slug,
      articleTitle: r.article_slug ? titleMap.get(r.article_slug) ?? r.article_slug : '(sans article)',
      subject: r.subject,
      createdAt: r.created_at,
    }));
  }

  const rows = await db
    .select({
      id: newsletterSends.id,
      articleSlug: newsletterSends.articleSlug,
      subject: newsletterSends.subject,
      createdAt: newsletterSends.createdAt,
    })
    .from(newsletterSends)
    .where(and(eq(newsletterSends.cabinetId, cabinetId), eq(newsletterSends.status, 'draft')))
    .orderBy(desc(newsletterSends.createdAt))
    .limit(50);

  const slugs = rows.map((r) => r.articleSlug).filter((s): s is string => Boolean(s));
  const titleMap = new Map<string, string>();
  if (slugs.length > 0) {
    const ar = await db.select({ slug: articles.slug, title: articles.title }).from(articles);
    for (const a of ar) titleMap.set(a.slug, a.title);
  }
  return rows.map((r) => ({
    id: r.id,
    articleSlug: r.articleSlug,
    articleTitle: r.articleSlug ? titleMap.get(r.articleSlug) ?? r.articleSlug : '(sans article)',
    subject: r.subject,
    createdAt: r.createdAt,
  }));
}

export default async function DraftsPage() {
  const session = await getSessionFromCookie();
  if (!session || !session.mfaVerified) redirect('/login');

  const drafts = await getDrafts(session.cabinetId);

  return (
    <div className="mx-auto max-w-3xl space-y-6 p-6 md:p-8">
      <header className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Mes brouillons</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Reprenez un brouillon la ou vous l&apos;avez laisse. Les brouillons de plus de 30 jours sont
            automatiquement supprimes.
          </p>
        </div>
        <Link
          href="/dashboard/newsletter"
          className="inline-flex items-center gap-1.5 rounded-md bg-primary px-3 py-1.5 text-sm font-semibold text-primary-foreground shadow-sm hover:opacity-95"
        >
          <Plus className="h-4 w-4" />
          Nouveau
        </Link>
      </header>

      {drafts.length === 0 ? (
        <EmptyState
          icon={FileText}
          title="Aucun brouillon en cours"
          description="Vous n'avez pas de brouillon sauvegarde. Composez votre premiere newsletter, le brouillon se sauvegarde automatiquement."
          primary={{ label: 'Composer', href: '/dashboard/newsletter' }}
        />
      ) : (
        <div className="rounded-lg border border-border bg-background">
          <ul className="divide-y divide-border">
            {drafts.map((d) => (
              <li key={d.id} className="flex items-center justify-between gap-3 p-4">
                <div className="min-w-0 flex-1">
                  <Link
                    href={`/dashboard/newsletter/compose?draftId=${d.id}`}
                    className="block text-sm font-semibold text-foreground hover:underline"
                  >
                    {d.articleTitle}
                  </Link>
                  <p className="mt-0.5 truncate text-xs text-muted-foreground">
                    Sujet : {d.subject || '(sans sujet)'}
                  </p>
                </div>
                <div className="shrink-0 text-xs text-muted-foreground">
                  {new Date(d.createdAt).toLocaleDateString('fr-FR', {
                    day: '2-digit',
                    month: 'short',
                  })}
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="rounded-lg border border-border bg-muted/20 p-4 text-xs text-muted-foreground">
        <p className="flex items-center gap-2">
          <FileText className="h-3.5 w-3.5" />
          Astuce : vos brouillons sont sauvegardes automatiquement a chaque etape du composer.
        </p>
      </div>
    </div>
  );
}