import { NextResponse } from 'next/server';
import { db, DB_DIALECT, rawSqlClient } from '@/db/client';
import { eq, and, desc } from 'drizzle-orm';
import { getSessionFromCookie } from '@/lib/auth';
import { newsletterSends, articles } from '@/db/schema';

/**
 * GET /api/newsletter/drafts
 * Liste les brouillons de newsletter du praticien courant, avec le titre de l'article
 * si lié (pour affichage dans le widget dashboard / page drafts).
 */
export async function GET() {
  const session = await getSessionFromCookie();
  if (!session || !session.mfaVerified) {
    return NextResponse.json({ error: 'Non autorise.' }, { status: 401 });
  }

  if (DB_DIALECT === 'postgresql') {
    const rows = await rawSqlClient<
      Array<{
        id: string;
        article_slug: string | null;
        subject: string;
        custom_message: string | null;
        created_at: string;
      }>
    >`
      SELECT id::text AS id, article_slug, subject, custom_message, created_at
      FROM newsletter_sends
      WHERE cabinet_id::text = ${session.cabinetId}::text
        AND status = 'draft'
      ORDER BY created_at DESC
      LIMIT 20
    `;
    if (rows.length === 0) return NextResponse.json({ drafts: [] });

    // Resoudre les titres d'articles en une passe
    const slugs = rows.map((r) => r.article_slug).filter((s): s is string => Boolean(s));
    let articleTitleMap = new Map<string, string>();
    if (slugs.length > 0) {
      const ar = await rawSqlClient<Array<{ slug: string; title: string }>>`
        SELECT slug, title FROM articles WHERE slug = ANY(${slugs}::text[])
      `;
      articleTitleMap = new Map(ar.map((a) => [a.slug, a.title]));
    }

    return NextResponse.json({
      drafts: rows.map((r) => ({
        id: r.id,
        articleSlug: r.article_slug,
        articleTitle: r.article_slug ? articleTitleMap.get(r.article_slug) ?? r.article_slug : '(sans article)',
        subject: r.subject,
        customMessage: r.custom_message ?? '',
        createdAt: r.created_at,
      })),
    });
  }

  // SQLite
  const rows = await db
    .select({
      id: newsletterSends.id,
      articleSlug: newsletterSends.articleSlug,
      subject: newsletterSends.subject,
      customMessage: newsletterSends.customMessage,
      createdAt: newsletterSends.createdAt,
    })
    .from(newsletterSends)
    .where(
      and(
        eq(newsletterSends.cabinetId, session.cabinetId),
        eq(newsletterSends.status, 'draft')
      )
    )
    .orderBy(desc(newsletterSends.createdAt))
    .limit(20);

  if (rows.length === 0) return NextResponse.json({ drafts: [] });

  const slugs = rows.map((r) => r.articleSlug).filter((s): s is string => Boolean(s));
  const titleMap = new Map<string, string>();
  if (slugs.length > 0) {
    const ar = await db.select({ slug: articles.slug, title: articles.title }).from(articles);
    for (const a of ar) titleMap.set(a.slug, a.title);
  }

  return NextResponse.json({
    drafts: rows.map((r) => ({
      id: r.id,
      articleSlug: r.articleSlug,
      articleTitle: r.articleSlug ? titleMap.get(r.articleSlug) ?? r.articleSlug : '(sans article)',
      subject: r.subject,
      customMessage: r.customMessage ?? '',
      createdAt: r.createdAt,
    })),
  });
}