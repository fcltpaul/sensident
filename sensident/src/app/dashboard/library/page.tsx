import { withCabinetContext } from '@/db/client';
import { articles, cabinetLibraryArticles, patientReactions, readingSessions, patientConsents, categories, articleCategories } from '@/db/schema';
import { eq, and, desc, inArray, sql } from 'drizzle-orm';
import { getSessionFromCookie } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { DentistLibrary } from './dentist-library';

export default async function DentistLibraryPage() {
  const session = await getSessionFromCookie();
  if (!session || !session.mfaVerified) redirect('/login');

  const data = await withCabinetContext(session.cabinetId, async (tx) => {
    // All library entries for this cabinet
    const libraryEntries = await tx
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
      .orderBy(desc(cabinetLibraryArticles.isPinned), desc(articles.createdAt));

    const articleSlugs = libraryEntries.map((a) => a.slug);

    // Reaction counts per article for this cabinet
    const reactionCounts = articleSlugs.length > 0
      ? await tx
          .select({
            articleId: patientReactions.articleId,
            upCount: sql<number>`COUNT(*) FILTER (WHERE ${patientReactions.reaction} = 'up')`,
            downCount: sql<number>`COUNT(*) FILTER (WHERE ${patientReactions.reaction} = 'down')`,
          })
          .from(patientReactions)
          .where(inArray(patientReactions.articleId, articleSlugs))
          .groupBy(patientReactions.articleId)
      : [];

    const reactionMap = new Map<string, { up: number; down: number }>(reactionCounts.map((r) => [r.articleId, { up: Number(r.upCount), down: Number(r.downCount) }]));

    // Reading counts per article for this cabinet
    const readingCounts = articleSlugs.length > 0
      ? await tx
          .select({
            articleId: readingSessions.articleSlug,
            count: sql<number>`COUNT(*)`,
          })
          .from(readingSessions)
          .where(inArray(readingSessions.articleSlug, articleSlugs))
          .groupBy(readingSessions.articleSlug)
      : [];

    const readingMap = new Map<string, number>(readingCounts.map((r) => [r.articleId, Number(r.count)]));

    // Confirmed patients for this cabinet
    const patients = await tx
      .select({
        emailEncrypted: patientConsents.emailEncrypted,
        emailHash: patientConsents.emailHash,
        confirmedAt: patientConsents.confirmedAt,
      })
      .from(patientConsents)
      .where(sql`${patientConsents.confirmedAt} IS NOT NULL`)

    // Categories
    const catList = await tx
      .selectDistinct({
        id: categories.id,
        code: categories.code,
        name: categories.name,
        icon: categories.icon,
        color: categories.color,
      })
      .from(categories)
      .innerJoin(articleCategories, eq(articleCategories.categoryId, categories.id));

    return { libraryEntries, reactionMap, readingMap, patients, catList };
  });

  const articlesWithStats = data.libraryEntries.map((a) => {
    const reactions = data.reactionMap.get(a.slug) ?? { up: 0, down: 0 };
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
      readingCount: data.readingMap.get(a.slug) || 0,
      sentCount: 0,
      lastSentAt: null,
    };
  });

  // Map emailEncrypted to email for the client component
  const patients = data.patients.map((p) => ({
    email: p.emailEncrypted || '(email crypte)',
    emailHash: p.emailHash,
    confirmedAt: p.confirmedAt,
  }));

  return (
    <DentistLibrary
      cabinetId={session.cabinetId}
      initialArticles={articlesWithStats}
      initialCategories={data.catList}
      initialPatients={patients}
    />
  );
}
