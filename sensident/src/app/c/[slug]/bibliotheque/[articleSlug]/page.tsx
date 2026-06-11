import { notFound } from 'next/navigation';
import { db } from '@/db/client';
import { cabinets, articles, cabinetLibraryArticles } from '@/db/schema';
import { eq, and, desc, asc, sql, inArray } from 'drizzle-orm';
import { ArticleReader } from './article-reader';

export default async function ArticleDetailPage({
  params,
}: {
  params: { slug: string; articleSlug: string };
}) {
  const { slug: cabinetSlug, articleSlug } = params;

  const cab = (await db.select().from(cabinets).where(eq(cabinets.slug, cabinetSlug)).limit(1))[0];
  if (!cab) notFound();

  // Get article
  const article = await db
    .select({
      slug: articles.slug,
      title: articles.title,
      excerpt: articles.excerpt,
      categoryCode: articles.category,
      bodyMd: articles.bodyMd,
      slidesJson: articles.slidesJson,
      readingTimeMin: articles.readingTimeMin,
      isPinned: cabinetLibraryArticles.isPinned,
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
    .where(
      and(
        eq(articles.slug, articleSlug),
        eq(cabinetLibraryArticles.isVisible, true)
      )
    )
    .limit(1);

  if (article.length === 0) notFound();
  const art = article[0];

  // Get all visible articles for prev/next navigation
  const allVisible = await db
    .select({ slug: articles.slug })
    .from(articles)
    .innerJoin(
      cabinetLibraryArticles,
      and(
        eq(cabinetLibraryArticles.articleId, articles.slug),
        eq(cabinetLibraryArticles.cabinetId, cab.id)
      )
    )
    .where(eq(cabinetLibraryArticles.isVisible, true))
    .orderBy(desc(articles.createdAt));

  const currentIdx = allVisible.findIndex((a) => a.slug === articleSlug);
  const prevSlug = currentIdx > 0 ? allVisible[currentIdx - 1].slug : null;
  const nextSlug = currentIdx < allVisible.length - 1 ? allVisible[currentIdx + 1].slug : null;

  return (
    <ArticleReader
      cabinet={{ name: cab.name, slug: cab.slug }}
      article={{
        ...art,
        slidesJson: art.slidesJson as any,
        publishedAt: art.publishedAt?.toISOString() ?? null,
      }}
      patientEmailHash=""
      prevSlug={prevSlug}
      nextSlug={nextSlug}
    />
  );
}
