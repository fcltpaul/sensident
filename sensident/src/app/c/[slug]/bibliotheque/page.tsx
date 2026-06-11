import { notFound } from 'next/navigation';
import { db } from '@/db/client';
import { cabinets, articles, cabinetLibraryArticles, categories, articleCategories } from '@/db/schema';
import { eq, and, desc, inArray, sql } from 'drizzle-orm';
import { PatientLibrary } from './patient-library';

export default async function BibliothequePage({ params }: { params: { slug: string } }) {
  const cab = (await db.select().from(cabinets).where(eq(cabinets.slug, params.slug)).limit(1))[0];
  if (!cab) notFound();

  // Articles visibles par ce cabinet
  const visibleRows = await db
    .select({ articleId: cabinetLibraryArticles.articleId })
    .from(cabinetLibraryArticles)
    .where(
      and(
        eq(cabinetLibraryArticles.cabinetId, cab.id),
        eq(cabinetLibraryArticles.isVisible, true)
      )
    );

  const articleSlugs = visibleRows.map((r) => r.articleId);

  let articleList: any[] = [];
  let categoryList: any[] = [];

  if (articleSlugs.length > 0) {
    // Articles with cabinet library status
    articleList = await db
      .select({
        slug: articles.slug,
        title: articles.title,
        excerpt: articles.excerpt,
        categoryCode: articles.category,
        readingTimeMin: articles.readingTimeMin,
        createdAt: articles.createdAt,
        isPinned: cabinetLibraryArticles.isPinned,
        isVisible: cabinetLibraryArticles.isVisible,
        publishedAt: articles.createdAt,
      })
      .from(articles)
      .innerJoin(
        cabinetLibraryArticles,
        and(
          eq(cabinetLibraryArticles.articleId, articles.slug),
          eq(cabinetLibraryArticles.cabinetId, cab.id)
        )
      )
      .where(inArray(articles.slug, articleSlugs))
      .orderBy(desc(cabinetLibraryArticles.isPinned), desc(articles.createdAt));

    // Categories for filter
    categoryList = await db
      .selectDistinct({
        id: categories.id,
        code: categories.code,
        name: categories.name,
        icon: categories.icon,
        color: categories.color,
      })
      .from(categories)
      .innerJoin(articleCategories, eq(articleCategories.categoryId, categories.id))
      .innerJoin(articles, eq(articles.slug, articleCategories.articleSlug))
      .where(inArray(articles.slug, articleSlugs));
  }

  // Serialize dates for client
  const serializedArticles = articleList.map((a) => ({
    ...a,
    createdAt: a.createdAt?.toISOString() ?? null,
    publishedAt: a.publishedAt?.toISOString() ?? null,
  }));

  return (
    <PatientLibrary
      cabinet={{ name: cab.name, slug: cab.slug }}
      initialArticles={serializedArticles}
      initialCategories={categoryList}
    />
  );
}
