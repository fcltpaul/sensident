import { NextResponse } from 'next/server';
import { withCabinetContext } from '@/db/client';
import { articles, readingSessions } from '@/db/schema';
import { eq, desc, sql, countDistinct } from 'drizzle-orm';
import { getSessionFromCookie } from '@/lib/auth';

/**
 * GET /api/library/suggestions
 * Retourne 3 articles suggérés pour l'onboarding praticien.
 * Priorité : articles les plus lus (lecture_sessions groupées par article).
 * Fallback : 3 articles validés les plus récents.
 */
export async function GET() {
  const session = await getSessionFromCookie();
  if (!session || !session.mfaVerified) {
    return NextResponse.json({ error: 'Non autorisé.' }, { status: 401 });
  }

  const enriched = await withCabinetContext(session.cabinetId, async (tx) => {
    const reads = await tx
      .select({
        articleSlug: readingSessions.articleSlug,
        reads: countDistinct(readingSessions.patientEmailHash),
      })
      .from(readingSessions)
      .groupBy(readingSessions.articleSlug)
      .orderBy(desc(sql`COUNT(DISTINCT ${readingSessions.patientEmailHash})`))
      .limit(3);

    const topSlugs = reads.map((r) => r.articleSlug).filter(Boolean) as string[];

    if (topSlugs.length > 0) {
      const top = await tx
        .select({
          slug: articles.slug,
          title: articles.title,
          excerpt: articles.excerpt,
          readingTimeMin: articles.readingTimeMin,
          category: articles.category,
        })
        .from(articles)
        .where(sql`${articles.slug} = ANY(${topSlugs})`)
        .limit(3);
      if (top.length > 0) {
        return top.map((a) => ({
          slug: a.slug,
          title: a.title,
          excerpt: a.excerpt,
          readingTimeMin: a.readingTimeMin,
          categoryCode: a.category,
        }));
      }
    }

    // Fallback : 3 articles validés les plus récents
    const recent = await tx
      .select({
        slug: articles.slug,
        title: articles.title,
        excerpt: articles.excerpt,
        readingTimeMin: articles.readingTimeMin,
        category: articles.category,
      })
      .from(articles)
      .where(eq(articles.status, 'validated'))
      .orderBy(desc(articles.createdAt))
      .limit(3);
    return recent.map((a) => ({
      slug: a.slug,
      title: a.title,
      excerpt: a.excerpt,
      readingTimeMin: a.readingTimeMin,
      categoryCode: a.category,
    }));
  });

  return NextResponse.json({ articles: enriched });
}