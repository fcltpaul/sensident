import { notFound } from 'next/navigation';
import { db, DB_DIALECT, rawSqlClient } from '@/db/client';
import { cabinets, articles, cabinetLibraryArticles, categories, articleCategories } from '@/db/schema';
import { eq, and, desc, inArray } from 'drizzle-orm';
import { PatientLibrary } from './patient-library';

// 2026-07-13 19h40 (Tartrinator) : meme dette Neon que /bibliotheque/[articleSlug].
// cabinet_library_articles.cabinet_id est en text en Neon prod -> Drizzle INNER JOIN
// avec eq(uuid, uuid) renvoie 0 rows -> liste articles vide -> page cassée.
// Fix : raw SQL Neon avec cast ::text, branche SQLite via Drizzle (dev).

export default async function BibliothequePage({ params }: { params: { slug: string } }) {
  const cab = (await db.select().from(cabinets).where(eq(cabinets.slug, params.slug)).limit(1))[0];
  if (!cab) notFound();

  // 1. Visible article slugs (branche PG via raw SQL a cause de la dette cabinet_id)
  let articleSlugs: string[] = [];
  if (DB_DIALECT === 'postgresql') {
    const rows = await rawSqlClient<Array<{ article_id: string }>>`
      SELECT article_id::text AS article_id
      FROM cabinet_library_articles
      WHERE cabinet_id::text = ${cab.id}::text
        AND is_visible = true
    `;
    articleSlugs = rows.map((r) => r.article_id);
  } else {
    const rows = await db
      .select({ articleId: cabinetLibraryArticles.articleId })
      .from(cabinetLibraryArticles)
      .where(
        and(
          eq(cabinetLibraryArticles.cabinetId, cab.id),
          eq(cabinetLibraryArticles.isVisible, true),
        ),
      );
    articleSlugs = rows.map((r) => r.articleId);
  }

  let articleList: any[] = [];
  let categoryList: any[] = [];

  if (articleSlugs.length > 0) {
    if (DB_DIALECT === 'postgresql') {
      // Raw SQL Neon : articles + cabinet library join (cast ::text obligatoire)
      const rows = await rawSqlClient<Array<{
        slug: string;
        title: string;
        excerpt: string | null;
        categoryCode: string | null;
        readingTimeMin: number | null;
        createdAt: Date;
        isPinned: boolean;
        isVisible: boolean;
        publishedAt: Date;
      }>>`
        SELECT
          a.slug::text                                AS slug,
          a.title                                     AS title,
          a.excerpt                                   AS excerpt,
          a.category                                  AS "categoryCode",
          a.reading_time_min                          AS "readingTimeMin",
          a.created_at                                AS "createdAt",
          cla.is_pinned                               AS "isPinned",
          cla.is_visible                              AS "isVisible",
          a.created_at                                AS "publishedAt"
        FROM articles a
        INNER JOIN cabinet_library_articles cla
          ON cla.article_id::text = a.slug::text
         AND cla.cabinet_id::text = ${cab.id}::text
        WHERE a.slug = ANY(${articleSlugs}::text[])
        ORDER BY cla.is_pinned DESC, a.created_at DESC
      `;
      articleList = rows;

      // Categories for filter
      const catRows = await rawSqlClient<Array<{
        id: string;
        code: string;
        name: string;
        icon: string | null;
        color: string | null;
      }>>`
        SELECT DISTINCT c.id::text AS id, c.code, c.name, c.icon, c.color
        FROM categories c
        INNER JOIN article_categories ac ON ac.category_id::text = c.id::text
        INNER JOIN articles a ON a.slug::text = ac.article_slug::text
        WHERE a.slug = ANY(${articleSlugs}::text[])
      `;
      categoryList = catRows;
    } else {
      // SQLite dev
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
            eq(cabinetLibraryArticles.cabinetId, cab.id),
          ),
        )
        .where(inArray(articles.slug, articleSlugs))
        .orderBy(desc(cabinetLibraryArticles.isPinned), desc(articles.createdAt));

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
  }

  // Serialize dates for client
  const serializedArticles = articleList.map((a) => ({
    ...a,
    createdAt: a.createdAt instanceof Date ? a.createdAt.toISOString() : a.createdAt ?? null,
    publishedAt:
      a.publishedAt instanceof Date ? a.publishedAt.toISOString() : a.publishedAt ?? null,
  }));

  return (
    <PatientLibrary
      cabinet={{ name: cab.name, slug: cab.slug }}
      initialArticles={serializedArticles}
      initialCategories={categoryList}
    />
  );
}