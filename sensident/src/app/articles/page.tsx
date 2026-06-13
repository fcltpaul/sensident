import Link from 'next/link';
import { db } from '@/db/client';
import { articles, categories } from '@/db/schema';
import { eq, asc } from 'drizzle-orm';
import { ArticlesFilters } from './articles-filters';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Articles prévention bucco-dentaire — Sensident',
  description: "Catalogue d'articles de prévention validés par des chirurgiens-dentistes.",
};

export const revalidate = 3600;

export default async function ArticlesIndexPage() {
  const validatedArticles = await db
    .select({
      id: articles.id,
      slug: articles.slug,
      title: articles.title,
      excerpt: articles.excerpt,
      category: articles.category,
      readingTimeMin: articles.readingTimeMin,
    })
    .from(articles)
    .where(eq(articles.status, 'validated'))
    .orderBy(asc(articles.category), asc(articles.title));

  const allCategories = await db
    .select({ code: categories.code, name: categories.name })
    .from(categories)
    .orderBy(asc(categories.position));

  return (
    <main className="min-h-screen bg-background">
      <section className="border-b border-border">
        <div className="mx-auto max-w-5xl px-6 py-8 md:py-10">
          <p className="text-sm text-muted-foreground mb-1">
            <Link href="/" className="hover:text-foreground">← Sensident</Link>
          </p>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight">
            {validatedArticles.length} articles de prévention
          </h1>
          <p className="mt-1.5 text-sm text-muted-foreground">
            Validés par un comité scientifique de chirurgiens-dentistes.
          </p>
        </div>
      </section>

      <section className="mx-auto max-w-5xl px-6 py-6">
        <ArticlesFilters articles={validatedArticles} categories={allCategories} />
      </section>
    </main>
  );
}
