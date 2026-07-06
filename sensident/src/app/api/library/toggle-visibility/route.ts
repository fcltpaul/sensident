import { NextRequest, NextResponse } from 'next/server';
import { db, DB_DIALECT, rawSqlClient } from '@/db/client';
import { cabinetLibraryArticles } from '@/db/schema';
import { eq, and } from 'drizzle-orm';
import { getSessionFromCookie } from '@/lib/auth';
import crypto from 'node:crypto';

/**
 * POST /api/library/toggle-visibility
 *
 * Toggle is_visible sur un lien cabinet-article.
 * Si le lien n'existe pas, on le crée visible.
 *
 * Fix 2026-07-07 : rawSqlClient côté Neon (dette cabinet_id uuid vs text).
 * Avant, le `withCabinetContext` ne faisait pas de vraie transaction et
 * l'UPDATE échouait silencieusement côté Neon.
 */

interface ExistingRow {
  id: string;
  is_visible: boolean;
}

export async function POST(request: NextRequest) {
  const session = await getSessionFromCookie();
  if (!session || !session.mfaVerified) {
    return NextResponse.json({ error: 'Non authorise' }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  const articleSlug = body?.articleSlug;
  if (!articleSlug || typeof articleSlug !== 'string') {
    return NextResponse.json({ error: 'articleSlug requis' }, { status: 400 });
  }

  if (DB_DIALECT === 'postgresql') {
    const existing = await rawSqlClient<ExistingRow[]>`
      SELECT id, is_visible FROM cabinet_library_articles
      WHERE cabinet_id::text = ${session.cabinetId}::text
        AND article_id = ${articleSlug}
      LIMIT 1
    `;

    if (existing[0]) {
      const newVisible = !existing[0].is_visible;
      await rawSqlClient`
        UPDATE cabinet_library_articles
        SET is_visible = ${newVisible},
            updated_at = NOW()
        WHERE id::text = ${existing[0].id}::text
      `;
      return NextResponse.json({ ok: true, isVisible: newVisible });
    }

    const newId = crypto.randomUUID();
    await rawSqlClient`
      INSERT INTO cabinet_library_articles
        (id, cabinet_id, article_id, is_visible, is_pinned, pin_order, created_at, updated_at)
      VALUES (
        ${newId}::text,
        ${session.cabinetId}::text,
        ${articleSlug},
        true,
        false,
        0,
        NOW(),
        NOW()
      )
    `;
    return NextResponse.json({ ok: true, isVisible: true });
  }

  // SQLite (dev)
  const existing = await db
    .select()
    .from(cabinetLibraryArticles)
    .where(
      and(
        eq(cabinetLibraryArticles.cabinetId, session.cabinetId),
        eq(cabinetLibraryArticles.articleId, articleSlug),
      ),
    )
    .limit(1);

  if (existing[0]) {
    const newVisible = !existing[0].isVisible;
    await db
      .update(cabinetLibraryArticles)
      .set({ isVisible: newVisible, updatedAt: new Date() })
      .where(eq(cabinetLibraryArticles.id, existing[0].id));
    return NextResponse.json({ ok: true, isVisible: newVisible });
  }

  await db.insert(cabinetLibraryArticles).values({
    cabinetId: session.cabinetId,
    articleId: articleSlug,
    isVisible: true,
    isPinned: false,
    pinOrder: 0,
  });
  return NextResponse.json({ ok: true, isVisible: true });
}