import { NextRequest, NextResponse } from 'next/server';
import { db, DB_DIALECT, rawSqlClient } from '@/db/client';
import { cabinetLibraryArticles } from '@/db/schema';
import { eq, and } from 'drizzle-orm';
import { getSessionFromCookie } from '@/lib/auth';
import crypto from 'node:crypto';

/**
 * POST /api/library/toggle-pin
 *
 * Toggle is_pinned sur un lien cabinet-article.
 *
 * Fix 2026-07-07 :
 * 1. Si le lien cabinet_library_articles n'existe pas pour ce cabinet,
 *    on le crée avec is_pinned=true (avant : on retournait ok sans rien
 *    faire → l'UI pensait que l'étoile était persistée mais elle
 *    réapparaissait après refresh = le bug rapporté par Paul).
 * 2. rawSqlClient côté Neon pour contourner la dette cabinet_id uuid vs text.
 */

interface ExistingRow {
  id: string;
  is_pinned: boolean;
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
      SELECT id, is_pinned FROM cabinet_library_articles
      WHERE cabinet_id::text = ${session.cabinetId}::text
        AND article_id = ${articleSlug}
      LIMIT 1
    `;

    if (existing[0]) {
      const newPinned = !existing[0].is_pinned;
      await rawSqlClient`
        UPDATE cabinet_library_articles
        SET is_pinned = ${newPinned},
            updated_at = NOW()
        WHERE id::text = ${existing[0].id}::text
      `;
      return NextResponse.json({ ok: true, isPinned: newPinned });
    }

    // Pas de ligne existante → on en crée une, épinglée d'office.
    const newId = crypto.randomUUID();
    await rawSqlClient`
      INSERT INTO cabinet_library_articles
        (id, cabinet_id, article_id, is_visible, is_pinned, pin_order, created_at, updated_at)
      VALUES (
        ${newId}::text,
        ${session.cabinetId}::text,
        ${articleSlug},
        true,
        true,
        0,
        NOW(),
        NOW()
      )
    `;
    return NextResponse.json({ ok: true, isPinned: true });
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
    const newPinned = !existing[0].isPinned;
    await db
      .update(cabinetLibraryArticles)
      .set({ isPinned: newPinned, updatedAt: new Date() })
      .where(eq(cabinetLibraryArticles.id, existing[0].id));
    return NextResponse.json({ ok: true, isPinned: newPinned });
  }

  // Pas de ligne → on en crée une, épinglée d'office.
  await db.insert(cabinetLibraryArticles).values({
    cabinetId: session.cabinetId,
    articleId: articleSlug,
    isVisible: true,
    isPinned: true,
    pinOrder: 0,
  });
  return NextResponse.json({ ok: true, isPinned: true });
}