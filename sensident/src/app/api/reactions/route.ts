import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db/client';
import { patientReactions } from '@/db/schema';
import { and, eq, sql } from 'drizzle-orm';

/**
 * POST /api/reactions
 *
 * Creer ou mettre a jour la reaction d'un patient sur un article.
 * Body: { articleId, cabinetId, patientEmailHash, reaction: 'up' | 'down' }
 * Si reaction = null (ou different) => supprime la reaction existante.
 */
export async function POST(request: NextRequest) {
  try {
    const { articleId, cabinetId, patientEmailHash, reaction } = await request.json();

    if (!articleId || !cabinetId || !patientEmailHash) {
      return NextResponse.json({ error: 'missing required fields' }, { status: 400 });
    }

    if (reaction && !['up', 'down'].includes(reaction)) {
      return NextResponse.json({ error: 'invalid reaction (up/down)' }, { status: 400 });
    }

    // Upsert : si reaction fournie, on insere ou met a jour ; si null, on supprime
    if (reaction) {
      await db
        .insert(patientReactions)
        .values({
          id: crypto.randomUUID(),
          articleId,
          cabinetId,
          patientEmailHash,
          reaction,
        })
        .onConflictDoUpdate({
          target: [
            patientReactions.articleId,
            patientReactions.cabinetId,
            patientReactions.patientEmailHash,
          ],
          set: { reaction },
        });
    } else {
      await db
        .delete(patientReactions)
        .where(
          and(
            eq(patientReactions.articleId, articleId),
            eq(patientReactions.cabinetId, cabinetId),
            eq(patientReactions.patientEmailHash, patientEmailHash)
          )
        );
    }

    // Renvoyer les compteurs mis a jour
    const counts = await getReactionCounts(articleId, cabinetId);
    return NextResponse.json({ success: true, ...counts });
  } catch (error) {
    console.error('POST /api/reactions error:', error);
    return NextResponse.json({ error: 'internal server error' }, { status: 500 });
  }
}

/**
 * GET /api/reactions?articleId=X&cabinetId=Y
 *
 * Renvoie les compteurs de reactions pour un article dans un cabinet.
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const articleId = searchParams.get('articleId');
  const cabinetId = searchParams.get('cabinetId');

  if (!articleId || !cabinetId) {
    return NextResponse.json({ error: 'missing articleId or cabinetId' }, { status: 400 });
  }

  const counts = await getReactionCounts(articleId, cabinetId);
  return NextResponse.json(counts);
}

async function getReactionCounts(articleId: string, cabinetId: string) {
  const rows = await db
    .select({
      reaction: patientReactions.reaction,
      count: sql<number>`count(*)`.mapWith(Number),
    })
    .from(patientReactions)
    .where(
      and(
        eq(patientReactions.articleId, articleId),
        eq(patientReactions.cabinetId, cabinetId)
      )
    )
    .groupBy(patientReactions.reaction);

  const up = rows.find((r) => r.reaction === 'up')?.count ?? 0;
  const down = rows.find((r) => r.reaction === 'down')?.count ?? 0;
  return { up, down, total: up + down };
}
