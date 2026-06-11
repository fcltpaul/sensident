import { db } from '@/db/client';
import { articles } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { notFound, redirect } from 'next/navigation';
import { getAdminSession } from '@/lib/admin-auth';
import { ArticleEditor } from '../editor';

export default async function EditArticlePage({ params }: { params: { slug: string } }) {
  const session = await getAdminSession();
  if (!session || !session.mfaVerified) redirect('/admin/login');

  const result = await db.select().from(articles).where(eq(articles.slug, params.slug)).limit(1);
  if (result.length === 0) notFound();

  return (
    <div className="space-y-6 p-6 md:p-8">
      <div>
        <h1 className="text-2xl font-bold">Éditer l'article</h1>
        <p className="text-sm text-muted-foreground">
          Statut actuel : <span className="font-mono">{result[0].status}</span>
          {result[0].status === 'validated' && ' (les modifications repasseront l\'article en brouillon après sauvegarde)'}
        </p>
      </div>
      <ArticleEditor article={result[0]} />
    </div>
  );
}
