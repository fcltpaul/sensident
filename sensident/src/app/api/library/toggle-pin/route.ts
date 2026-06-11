import { NextRequest, NextResponse } from 'next/server';
import { db, withCabinetContext } from '@/db/client';
import { cabinetLibraryArticles } from '@/db/schema';
import { eq, and } from 'drizzle-orm';
import { getSessionFromCookie } from '@/lib/auth';

/**
 * POST /api/library/toggle-pin
 * Toggle is_pinned on a cabinet-article link
 */
export async function POST(request: NextRequest) {
  const session = await getSessionFromCookie();
  if (!session || !session.mfaVerified) {
    return NextResponse.json({ error: 'Non authorise' }, { status: 401 });
  }

  const { articleSlug } = await request.json();
  if (!articleSlug) {
    return NextResponse.json({ error: 'articleSlug requis' }, { status: 400 });
  }

  await withCabinetContext(session.cabinetId, async (tx) => {
    const existing = await tx
      .select()
      .from(cabinetLibraryArticles)
      .where(
        and(
          eq(cabinetLibraryArticles.cabinetId, session.cabinetId),
          eq(cabinetLibraryArticles.articleId, articleSlug)
        )
      )
      .limit(1);

    if (existing.length > 0) {
      await tx
        .update(cabinetLibraryArticles)
        .set({ isPinned: !existing[0].isPinned, updatedAt: new Date() })
        .where(eq(cabinetLibraryArticles.id, existing[0].id));
    }
  });

  return NextResponse.json({ ok: true });
}
