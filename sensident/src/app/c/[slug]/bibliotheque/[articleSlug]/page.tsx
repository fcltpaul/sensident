import { notFound } from 'next/navigation';
import { db, DB_DIALECT, rawSqlClient } from '@/db/client';
import { cabinets, articles, cabinetLibraryArticles } from '@/db/schema';
import { eq, and, desc } from 'drizzle-orm';
import { ArticleReader } from './article-reader';

// 2026-07-13 19h40 (Tartrinator) : Paul a remonte un 404 sur /c/[slug]/bibliotheque/[articleSlug]
// apres que le patient ait clique sur le lien de confirmation d'opt-in.
// Cause : dette Neon documentee en MEMORY.md - cabinet_library_articles.cabinet_id
// est en text en Neon prod (pas en uuid comme dans schema.pg.ts). Drizzle envoie
// une comparaison uuid = uuid qui ne matche pas la colonne text -> 0 rows ->
// notFound() -> 404.
// Fix : on lit la table en raw SQL Neon (cast ::text) puis on retombe sur
// Drizzle en SQLite dev. Meme pattern que /api/library/quick-send et autres
// routes deja fixees.
type ArticleRow = {
  slug: string;
  title: string;
  excerpt: string | null;
  categoryCode: string | null;
  bodyMd: string;
  slidesJson: string | null;
  readingTimeMin: number | null;
  isPinned: boolean;
  publishedAt: Date | null;
};

type ArticleSlugRow = { slug: string };

export default async function ArticleDetailPage({
  params,
}: {
  params: { slug: string; articleSlug: string };
}) {
  const { slug: cabinetSlug, articleSlug } = params;

  // 1. Load cabinet (slug-only lookup, OK en drizzle Drizzle car cabinets.slug est text).
  const cab = (await db.select().from(cabinets).where(eq(cabinets.slug, cabinetSlug)).limit(1))[0];
  if (!cab) notFound();

  // 2. Article detail. Branche PG en raw SQL pour contourner la dette
  //    cabinet_id uuid vs text. Branche SQLite en Drizzle (dev).
  let rows: ArticleRow[] = [];
  if (DB_DIALECT === 'postgresql') {
    rows = await rawSqlClient<ArticleRow[]>`
      SELECT
        a.slug::text                                       AS slug,
        a.title                                            AS title,
        a.excerpt                                          AS excerpt,
        a.category                                         AS "categoryCode",
        a.body_md                                          AS "bodyMd",
        a.slides_json::text                                AS "slidesJson",
        a.reading_time_min                                 AS "readingTimeMin",
        cla.is_pinned                                      AS "isPinned",
        a.created_at                                       AS "publishedAt"
      FROM articles a
      INNER JOIN cabinet_library_articles cla
        ON cla.article_id::text = a.slug::text
       AND cla.cabinet_id::text = ${cab.id}::text
      WHERE a.slug = ${articleSlug}
        AND cla.is_visible = true
      LIMIT 1
    `;
  } else {
    const drizzleRows = await db
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
          eq(cabinetLibraryArticles.cabinetId, cab.id),
        ),
      )
      .where(
        and(eq(articles.slug, articleSlug), eq(cabinetLibraryArticles.isVisible, true)),
      )
      .limit(1);
    rows = drizzleRows as ArticleRow[];
  }

  if (rows.length === 0) notFound();
  const art = rows[0];

  // 3. Visible articles list (prev/next nav). Meme pattern raw SQL / Drizzle.
  let allVisible: ArticleSlugRow[] = [];
  if (DB_DIALECT === 'postgresql') {
    allVisible = await rawSqlClient<ArticleSlugRow[]>`
      SELECT a.slug::text AS slug
      FROM articles a
      INNER JOIN cabinet_library_articles cla
        ON cla.article_id::text = a.slug::text
       AND cla.cabinet_id::text = ${cab.id}::text
      WHERE cla.is_visible = true
      ORDER BY a.created_at DESC
    `;
  } else {
    allVisible = await db
      .select({ slug: articles.slug })
      .from(articles)
      .innerJoin(
        cabinetLibraryArticles,
        and(
          eq(cabinetLibraryArticles.articleId, articles.slug),
          eq(cabinetLibraryArticles.cabinetId, cab.id),
        ),
      )
      .where(eq(cabinetLibraryArticles.isVisible, true))
      .orderBy(desc(articles.createdAt));
  }

  const currentIdx = allVisible.findIndex((a) => a.slug === articleSlug);
  const prevSlug = currentIdx > 0 ? allVisible[currentIdx - 1].slug : null;
  const nextSlug = currentIdx < allVisible.length - 1 ? allVisible[currentIdx + 1].slug : null;

  return (
    <ArticleReader
      cabinet={{ name: cab.name, slug: cab.slug }}
      article={{
        slug: art.slug,
        title: art.title,
        excerpt: art.excerpt ?? '',
        categoryCode: art.categoryCode ?? '',
        bodyMd: art.bodyMd,
        slidesJson: (art.slidesJson as any) ?? [],
        readingTimeMin: art.readingTimeMin ?? 0,
        isPinned: art.isPinned,
        publishedAt: art.publishedAt?.toISOString() ?? null,
      }}
      patientEmailHash=""
      prevSlug={prevSlug}
      nextSlug={nextSlug}
    />
  );
}