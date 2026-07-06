import { db, DB_DIALECT, rawSqlClient, withCabinetContext } from '@/db/client';
import { articles, cabinetLibraryArticles, patientReactions, readingSessions, patientConsents, categories, articleCategories } from '@/db/schema';
import { eq, and, desc, inArray, sql } from 'drizzle-orm';
import { getSessionFromCookie } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { DentistLibrary } from './dentist-library';

interface LibraryRow {
  slug: string;
  title: string;
  excerpt: string;
  categoryCode: string;
  readingTimeMin: number;
  isVisible: boolean;
  isPinned: boolean;
  pinOrder: number;
}

interface ReactionCountRow {
  articleId: string;
  upCount: number | string;
  downCount: number | string;
}

interface ReadingCountRow {
  articleId: string;
  count: number | string;
}

interface PatientRow {
  emailEncrypted: string | null;
  emailHash: string;
  confirmedAt: string | Date;
}

interface CategoryRow {
  id: string;
  code: string;
  name: string;
  icon: string | null;
  color: string | null;
}

async function loadLibrary(cabinetId: string): Promise<LibraryRow[]> {
  if (DB_DIALECT === 'postgresql') {
    // raw SQL pour contourner la dette Neon (cabinet_id uuid vs text)
    const rows = await rawSqlClient<LibraryRow[]>`
      SELECT
        a.slug,
        a.title,
        a.excerpt,
        a.category AS "categoryCode",
        a.reading_time_min AS "readingTimeMin",
        cla.is_visible AS "isVisible",
        cla.is_pinned AS "isPinned",
        cla.pin_order AS "pinOrder"
      FROM cabinet_library_articles cla
      INNER JOIN articles a ON a.slug = cla.article_id
      WHERE cla.cabinet_id::text = ${cabinetId}::text
      ORDER BY cla.is_pinned DESC, a.created_at DESC
    `;
    return rows;
  }
  return db
    .select({
      slug: articles.slug,
      title: articles.title,
      excerpt: articles.excerpt,
      categoryCode: articles.category,
      readingTimeMin: articles.readingTimeMin,
      isVisible: cabinetLibraryArticles.isVisible,
      isPinned: cabinetLibraryArticles.isPinned,
      pinOrder: cabinetLibraryArticles.pinOrder,
    })
    .from(cabinetLibraryArticles)
    .innerJoin(articles, eq(articles.slug, cabinetLibraryArticles.articleId))
    .where(eq(cabinetLibraryArticles.cabinetId, cabinetId))
    .orderBy(desc(cabinetLibraryArticles.isPinned), desc(articles.createdAt));
}

async function loadReactionCounts(articleSlugs: string[]): Promise<ReactionCountRow[]> {
  if (articleSlugs.length === 0) return [];
  if (DB_DIALECT === 'postgresql') {
    return rawSqlClient<ReactionCountRow[]>`
      SELECT article_id AS "articleId",
             COUNT(*) FILTER (WHERE reaction = 'up') AS "upCount",
             COUNT(*) FILTER (WHERE reaction = 'down') AS "downCount"
      FROM patient_reactions
      WHERE article_id = ANY(${articleSlugs}::text[])
      GROUP BY article_id
    `;
  }
  return db
    .select({
      articleId: patientReactions.articleId,
      upCount: sql<number>`COUNT(*) FILTER (WHERE ${patientReactions.reaction} = 'up')`,
      downCount: sql<number>`COUNT(*) FILTER (WHERE ${patientReactions.reaction} = 'down')`,
    })
    .from(patientReactions)
    .where(inArray(patientReactions.articleId, articleSlugs))
    .groupBy(patientReactions.articleId);
}

async function loadReadingCounts(cabinetId: string, articleSlugs: string[]): Promise<ReadingCountRow[]> {
  if (articleSlugs.length === 0) return [];
  if (DB_DIALECT === 'postgresql') {
    return rawSqlClient<ReadingCountRow[]>`
      SELECT article_slug AS "articleId", COUNT(*) AS count
      FROM reading_sessions
      WHERE cabinet_id::text = ${cabinetId}::text
        AND article_slug = ANY(${articleSlugs}::text[])
      GROUP BY article_slug
    `;
  }
  return db
    .select({
      articleId: readingSessions.articleSlug,
      count: sql<number>`COUNT(*)`,
    })
    .from(readingSessions)
    .where(
      and(
        eq(readingSessions.cabinetId, cabinetId),
        inArray(readingSessions.articleSlug, articleSlugs),
      ),
    )
    .groupBy(readingSessions.articleSlug);
}

/**
 * Liste UNIQUEMENT les patients du cabinet courant (fix P0 multi-tenant).
 * Avant cette session, le filtre cabinet_id était absent → Paul voyait
 * tous les patients de tous les cabinets qui avaient confirmé.
 */
async function loadPatients(cabinetId: string): Promise<PatientRow[]> {
  if (DB_DIALECT === 'postgresql') {
    return rawSqlClient<PatientRow[]>`
      SELECT email_encrypted AS "emailEncrypted",
             email_hash AS "emailHash",
             confirmed_at AS "confirmedAt"
      FROM patient_consents
      WHERE cabinet_id::text = ${cabinetId}::text
        AND confirmed_at IS NOT NULL
    `;
  }
  return db
    .select({
      emailEncrypted: patientConsents.emailEncrypted,
      emailHash: patientConsents.emailHash,
      confirmedAt: patientConsents.confirmedAt,
    })
    .from(patientConsents)
    .where(
      and(
        eq(patientConsents.cabinetId, cabinetId),
        sql`${patientConsents.confirmedAt} IS NOT NULL`,
      ),
    );
}

async function loadCategories(): Promise<CategoryRow[]> {
  if (DB_DIALECT === 'postgresql') {
    return rawSqlClient<CategoryRow[]>`
      SELECT DISTINCT c.id, c.code, c.name, c.icon, c.color
      FROM categories c
      INNER JOIN article_categories ac ON ac.category_id = c.id
    `;
  }
  return db
    .selectDistinct({
      id: categories.id,
      code: categories.code,
      name: categories.name,
      icon: categories.icon,
      color: categories.color,
    })
    .from(categories)
    .innerJoin(articleCategories, eq(articleCategories.categoryId, categories.id));
}

export default async function DentistLibraryPage() {
  const session = await getSessionFromCookie();
  if (!session || !session.mfaVerified) redirect('/login');

  // Toutes les requêtes sont scopées par session.cabinetId (P0 multi-tenant fix).
  const [libraryEntries, patients, catList] = await Promise.all([
    loadLibrary(session.cabinetId),
    loadPatients(session.cabinetId),
    loadCategories(),
  ]);

  const articleSlugs = libraryEntries.map((a) => a.slug);
  const [reactionCounts, readingCounts] = await Promise.all([
    loadReactionCounts(articleSlugs),
    loadReadingCounts(session.cabinetId, articleSlugs),
  ]);

  const reactionMap = new Map<string, { up: number; down: number }>(
    reactionCounts.map((r) => [r.articleId, { up: Number(r.upCount), down: Number(r.downCount) }]),
  );
  const readingMap = new Map<string, number>(
    readingCounts.map((r) => [r.articleId, Number(r.count)]),
  );

  const articlesWithStats = libraryEntries.map((a) => {
    const reactions = reactionMap.get(a.slug) ?? { up: 0, down: 0 };
    return {
      slug: a.slug,
      title: a.title,
      excerpt: a.excerpt,
      categoryCode: a.categoryCode,
      readingTimeMin: a.readingTimeMin,
      isVisible: a.isVisible,
      isPinned: a.isPinned,
      pinOrder: a.pinOrder,
      upCount: reactions.up,
      downCount: reactions.down,
      readingCount: readingMap.get(a.slug) || 0,
      sentCount: 0,
      lastSentAt: null,
    };
  });

  const patientsForClient = patients.map((p) => ({
    email: p.emailEncrypted || '(email crypte)',
    emailHash: p.emailHash,
    confirmedAt: p.confirmedAt instanceof Date ? p.confirmedAt.toISOString() : p.confirmedAt,
  }));

  return (
    <DentistLibrary
      cabinetId={session.cabinetId}
      initialArticles={articlesWithStats}
      initialCategories={catList.map((c) => ({
        id: c.id,
        code: c.code,
        name: c.name,
        icon: c.icon ?? '',
        color: c.color ?? '',
      }))}
      initialPatients={patientsForClient}
    />
  );
}