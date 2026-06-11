import { notFound } from 'next/navigation';
import { db } from '@/db/client';
import { cabinets, articles } from '@/db/schema';
import { eq, and } from 'drizzle-orm';
import { ArticleReader } from './article-reader';
import crypto from 'node:crypto';

interface PageProps {
  params: { slug: string };
  searchParams: { from?: string; sid?: string; c?: string };
}

export default async function ArticlePage({ params, searchParams }: PageProps) {
  const { slug } = params;
  const { from, sid, c: cabinetSlug } = searchParams;

  // 1. Trouver l'article
  const result = await db
    .select()
    .from(articles)
    .where(and(eq(articles.slug, slug), eq(articles.status, 'validated')))
    .limit(1);

  if (result.length === 0) notFound();
  const article = result[0];

  // 2. Si on vient d'un lien newsletter, on log
  if (from === 'newsletter' && sid) {
    // TODO: log d'ouverture newsletter
  }

  // 3. Generer un session_id pour le tracking (JS heartbeat)
  const sessionId = crypto.randomBytes(16).toString('hex');
  const source = from === 'newsletter' ? 'newsletter' : (from === 'site' ? 'site' : 'direct');

  // 3b. Resoudre le cabinet_id depuis le slug (lecture depuis la landing patient)
  let cabinetId: string | null = null;
  if (cabinetSlug) {
    const cabRes = await db.select({ id: cabinets.id }).from(cabinets).where(eq(cabinets.slug, cabinetSlug)).limit(1);
    if (cabRes.length > 0) cabinetId = cabRes[0].id;
  }

  // 4. Audit log lecture (anonyme, pas de cabinet_id)
  // Pour le MVP, on skip -- le tracking est en JS, plus précis

  return (
    <main className="min-h-screen bg-background">
      <div className="mx-auto max-w-2xl px-4 py-8">
        <ArticleReader
          article={{
            slug: article.slug,
            title: article.title,
            excerpt: article.excerpt,
            bodyMd: article.bodyMd,
            slidesJson: article.slidesJson as any,
            readingTimeMin: article.readingTimeMin,
            category: article.category,
          }}
          sessionId={sessionId}
          source={source}
          cabinetId={cabinetId}
        />
      </div>
    </main>
  );
}
