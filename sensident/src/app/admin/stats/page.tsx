import { db } from '@/db/client';
import {
  articles,
  cabinets,
  cabinetLibraryArticles,
  patientReactions,
  readingSessions,
  patientConsents,
} from '@/db/schema';
import { count, sql, eq, inArray, desc, and } from 'drizzle-orm';
import { getAdminSession } from '@/lib/admin-auth';
import { redirect } from 'next/navigation';
import { AdminStats } from './admin-stats';

export default async function AdminStatsPage() {
  const session = await getAdminSession();
  if (!session || !session.mfaVerified) redirect('/admin-auth/login');

  // 1. Global KPIs
  const [[cabinetCount], [patientCount], [reactionCount], [readingCount]] = await Promise.all([
    db.select({ total: count() }).from(cabinets),
    db.select({ total: count() }).from(patientConsents).where(sql`${patientConsents.confirmedAt} IS NOT NULL`),
    db.select({ total: count() }).from(patientReactions),
    db.select({ total: count() }).from(readingSessions),
  ]);

  // 2. Top articles by aggregated score (up - down across all cabinets)
  const topArticles = await db
    .select({
      slug: articles.slug,
      title: articles.title,
      // pre-counts from reactions per article
    })
    .from(articles)
    .orderBy(desc(articles.createdAt))
    .limit(20);

  const articleSlugs = topArticles.map((a) => a.slug);

  // Reaction counts per article (global)
  const globalReactions = articleSlugs.length > 0
    ? await db
        .select({
          articleId: patientReactions.articleId,
          up: sql<number>`COUNT(*) FILTER (WHERE ${patientReactions.reaction} = 'up')`,
          down: sql<number>`COUNT(*) FILTER (WHERE ${patientReactions.reaction} = 'down')`,
        })
        .from(patientReactions)
        .where(inArray(patientReactions.articleId, articleSlugs))
        .groupBy(patientReactions.articleId)
    : [];

  const reactionMap = new Map<string, { up: number; down: number }>(
    globalReactions.map((r) => [r.articleId, { up: Number(r.up), down: Number(r.down) }])
  );

  // Reading counts per article (global)
  const globalReads = articleSlugs.length > 0
    ? await db
        .select({
          articleId: readingSessions.articleSlug,
          total: sql<number>`COUNT(*)`,
        })
        .from(readingSessions)
        .where(inArray(readingSessions.articleSlug, articleSlugs))
        .groupBy(readingSessions.articleSlug)
    : [];

  const readingMap = new Map<string, number>(
    globalReads.map((r) => [r.articleId, Number(r.total)])
  );

  // Visibility count per article (how many cabinets have it visible)
  const visibilityCounts = articleSlugs.length > 0
    ? await db
        .select({
          articleId: cabinetLibraryArticles.articleId,
          visible: sql<number>`COUNT(*) FILTER (WHERE ${cabinetLibraryArticles.isVisible} = true)`,
          total: sql<number>`COUNT(*)`,
        })
        .from(cabinetLibraryArticles)
        .where(inArray(cabinetLibraryArticles.articleId, articleSlugs))
        .groupBy(cabinetLibraryArticles.articleId)
    : [];

  const visibilityMap = new Map<string, { visible: number; total: number }>(
    visibilityCounts.map((r) => [r.articleId, { visible: Number(r.visible), total: Number(r.total) }])
  );

  // Score: up - down, sort desc
  const scoredArticles = articleSlugs
    .map((slug) => {
      const reactions = reactionMap.get(slug) ?? { up: 0, down: 0 };
      const reads = readingMap.get(slug) ?? 0;
      const vis = visibilityMap.get(slug) ?? { visible: 0, total: 0 };
      const article = topArticles.find((a) => a.slug === slug)!;
      return {
        slug,
        title: article.title,
        up: reactions.up,
        down: reactions.down,
        score: reactions.up - reactions.down,
        reads,
        visibility: vis.visible,
      };
    })
    .sort((a, b) => b.score - a.score)
    .slice(0, 10);

  // 3. Engagement ratios
  const totalPatients = Number(patientCount?.total ?? 0);
  const totalReactions = Number(reactionCount?.total ?? 0);
  const totalReads = Number(readingCount?.total ?? 0);

  const activationRate = totalPatients > 0
    ? Math.round((totalReads / totalPatients) * 100)
    : 0;
  const reactionRate = totalReads > 0
    ? Math.round((totalReactions / totalReads) * 100)
    : 0;

  // 4. Cabinets with activity data for drill-down
  const allCabinets = await db
    .select({
      id: cabinets.id,
      name: cabinets.name,
      slug: cabinets.slug,
      createdAt: cabinets.createdAt,
    })
    .from(cabinets)
    .orderBy(desc(cabinets.createdAt));

  // Per-cabinet stats
  const cabinetStats: Array<{
    id: string;
    name: string;
    slug: string;
    createdAt: Date;
    patients: number;
    articlesVisible: number;
    reads: number;
    reactions: number;
    score: number;
    activationRate: number;
  }> = [];
  for (const cab of allCabinets) {
    const [cabPatients] = await db
      .select({ total: count() })
      .from(patientConsents)
      .where(and(eq(patientConsents.cabinetId, cab.id), sql`${patientConsents.confirmedAt} IS NOT NULL`));

    const [cabArticles] = await db
      .select({ total: count() })
      .from(cabinetLibraryArticles)
      .where(and(eq(cabinetLibraryArticles.cabinetId, cab.id), eq(cabinetLibraryArticles.isVisible, true)));

    const [cabReads] = await db
      .select({ total: count() })
      .from(readingSessions)
      .where(eq(readingSessions.cabinetId, cab.id));

    const [cabReactions] = await db
      .select({ total: count() })
      .from(patientReactions)
      .where(eq(patientReactions.cabinetId, cab.id));

    const cabReactionCount = Number(cabReactions?.total ?? 0);
    const cabReadCount = Number(cabReads?.total ?? 0);

    cabinetStats.push({
      id: cab.id,
      name: cab.name,
      slug: cab.slug,
      createdAt: new Date(cab.createdAt!),
      patients: Number(cabPatients?.total ?? 0),
      articlesVisible: Number(cabArticles?.total ?? 0),
      reads: cabReadCount,
      reactions: cabReactionCount,
      score: cabReactionCount - Math.floor(cabReadCount * 0.5), // heuristic
      activationRate: cabReadCount > 0 && Number(cabPatients?.total ?? 0) > 0
        ? Math.round((cabReadCount / Number(cabPatients?.total ?? 1)) * 100)
        : 0,
    } as typeof cabinetStats[0]);
  }

  // Sort cabinets by engagement score desc
  cabinetStats.sort((a, b) => b.score - a.score);

  return (
    <AdminStats
      globalStats={{
        cabinets: Number(cabinetCount?.total ?? 0),
        patients: Number(patientCount?.total ?? 0),
        reactions: totalReactions,
        reads: totalReads,
        activationRate,
        reactionRate,
      }}
      topArticles={scoredArticles}
      cabinets={cabinetStats}
    />
  );
}
