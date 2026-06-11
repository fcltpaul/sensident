import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db/client';
import { articles, articleCategories, categories, cabinetLibraryArticles, readingSessions } from '@/db/schema';
import { eq, and, inArray, sql, desc } from 'drizzle-orm';

/**
 * GET /api/c/[slug]/bibliotheque
 *
 * Renvoie les articles de la bibliotheque d'un cabinet.
 * Query params: filter (categorie), published (bool), search (texte)
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { slug: string } }
) {
  const { slug } = params;
  const { searchParams } = new URL(request.url);
  const filterCategory = searchParams.get('categorie');
  const publishedOnly = searchParams.get('publie') === 'true';
  const search = searchParams.get('recherche')?.toLowerCase();

  // Articles visibles par ce cabinet
  const visibleRows = await db
    .select({ articleId: cabinetLibraryArticles.articleId })
    .from(cabinetLibraryArticles)
    .where(
      and(
        eq(cabinetLibraryArticles.cabinetId, slug),
        eq(cabinetLibraryArticles.isVisible, true)
      )
    );

  if (visibleRows.length === 0) {
    return NextResponse.json({ articles: [], categories: [] });
  }

  const articleSlugs = visibleRows.map((r) => r.articleId);

  // Build query on articles
  const conditions = [inArray(articles.slug, articleSlugs)];

  if (search) {
    conditions.push(
      sql`(LOWER(${articles.title}) LIKE ${'%' + search + '%'} OR LOWER(${articles.excerpt}) LIKE ${'%' + search + '%'})`
    );
  }

  if (filterCategory && filterCategory !== 'all') {
    // Filter by category via article_categories
    const catArticles = await db
      .select({ articleSlug: articleCategories.articleSlug })
      .from(articleCategories)
      .where(eq(articleCategories.categoryId, filterCategory));
    const catSlugs = catArticles.map((r) => r.articleSlug);
    conditions.push(inArray(articles.slug, catSlugs));
  }

  // Get articles with pinned status and published dates
  const articleList = await db
    .select({
      slug: articles.slug,
      title: articles.title,
      excerpt: articles.excerpt,
      categoryCode: articles.category,
      readingTimeMin: articles.readingTimeMin,
      createdAt: articles.createdAt,
      isPinned: cabinetLibraryArticles.isPinned,
      isVisible: cabinetLibraryArticles.isVisible,
      publishedAt: articles.createdAt, // fallback - will get real send date from newsletter_sends
    })
    .from(articles)
    .innerJoin(
      cabinetLibraryArticles,
      and(
        eq(cabinetLibraryArticles.articleId, articles.slug),
        eq(cabinetLibraryArticles.cabinetId, slug)
      )
    )
    .where(and(...conditions))
    .orderBy(desc(cabinetLibraryArticles.isPinned), desc(articles.createdAt));

  // Get categories for filter
  const catList = await db
    .selectDistinct({
      id: categories.id,
      code: categories.code,
      name: categories.name,
      icon: categories.icon,
      color: categories.color,
    })
    .from(categories)
    .innerJoin(
      articleCategories,
      eq(articleCategories.categoryId, categories.id)
    )
    .innerJoin(
      articles,
      eq(articles.slug, articleCategories.articleSlug)
    )
    .where(inArray(articles.slug, articleSlugs));

  return NextResponse.json({
    articles: articleList,
    categories: catList,
  });
}
