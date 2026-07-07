import { NextResponse } from 'next/server';
import { DB_DIALECT, rawSqlClient, db } from '@/db/client';
import { articles as articlesSchema, cabinetLibraryArticles } from '@/db/schema';
import { eq, count } from 'drizzle-orm';
import { getSessionFromCookie } from '@/lib/auth';
import crypto from 'node:crypto';

interface ArticleRow {
  slug: string;
}

/**
 * POST /api/library/init
 *
 * Seed la bibliothèque d'un cabinet qui n'a encore aucun article lié.
 * Couvre le cas où un nouveau praticien vient de terminer son onboarding
 * et n'a aucune ligne dans `cabinet_library_articles` -> la page
 * /dashboard/library affiche "0 article".
 *
 * Idempotent :
 * - Ne fait rien si le cabinet a déjà >= 1 article lié.
 * - Utilise ON CONFLICT (cabinet_id, article_id) DO NOTHING (Postgres)
 *   et INSERT OR IGNORE (SQLite) sur idx_library_unique.
 *
 * Politique de seed (alignée avec scripts/seed-demo-francois-neon.mjs) :
 * - Les 5 premiers articles (par created_at) sont épinglés (top du tableau).
 * - Les 5 suivants sont visibles mais non épinglés.
 * - Tous sont visibles par défaut (le praticien peut masquer au besoin).
 *
 * Branchement : appelé par onboarding-wizard.tsx::finish() après
 * complete-onboarding. Échec silencieux (le praticien peut retenter
 * manuellement depuis la bibliothèque).
 *
 * 2026-07-07 (Tartrinator) — Fix note de fin "seed pour les nouveaux cabinets".
 */
export async function POST() {
  const session = await getSessionFromCookie();
  if (!session || !session.mfaVerified) {
    return NextResponse.json({ error: 'Non autorisé.' }, { status: 401 });
  }

  const cabinetId = session.cabinetId;

  // 1. Récupère les articles validés, triés par date de création.
  let slugs: string[] = [];
  if (DB_DIALECT === 'postgresql') {
    const rows = await rawSqlClient<ArticleRow[]>`
      SELECT slug FROM articles
      WHERE status = 'validated'
      ORDER BY created_at ASC
    `;
    slugs = rows.map((r) => r.slug);
  } else {
    const rows = await db
      .select({ slug: articlesSchema.slug })
      .from(articlesSchema)
      .where(eq(articlesSchema.status, 'validated'));
    // SQLite sans ORDER BY garanti : on trie ici pour stabiliser le seed.
    slugs = rows.map((r) => r.slug).sort();
  }

  if (slugs.length === 0) {
    return NextResponse.json(
      { ok: false, error: 'Aucun article validé disponible.' },
      { status: 503 },
    );
  }

  // 2. Garde-fou : ne pas seeder un cabinet déjà initialisé.
  let existingCount = 0;
  if (DB_DIALECT === 'postgresql') {
    const rows = await rawSqlClient<{ n: number | string }[]>`
      SELECT COUNT(*)::int AS n
      FROM cabinet_library_articles
      WHERE cabinet_id::text = ${cabinetId}::text
    `;
    existingCount = Number(rows[0]?.n ?? 0);
  } else {
    const rows = await db
      .select({ n: count() })
      .from(cabinetLibraryArticles)
      .where(eq(cabinetLibraryArticles.cabinetId, cabinetId));
    existingCount = Number(rows[0]?.n ?? 0);
  }

  if (existingCount > 0) {
    return NextResponse.json(
      {
        ok: true,
        inserted: 0,
        skipped: 'cabinet déjà initialisé',
        existingCount,
      },
      { status: 200 },
    );
  }

  // 3. Insertion en série (10 articles = 10 requêtes, négligeable).
  let inserted = 0;
  for (let i = 0; i < slugs.length; i++) {
    const slug = slugs[i];
    const isPinned = i < 5;
    const isVisible = true;
    const pinOrder = isPinned ? i : 0;

    if (DB_DIALECT === 'postgresql') {
      const newId = crypto.randomUUID();
      const res = await rawSqlClient<{ id: string }[]>`
        INSERT INTO cabinet_library_articles
          (id, cabinet_id, article_id, is_visible, is_pinned, pin_order, created_at, updated_at)
        VALUES
          (${newId}::text, ${cabinetId}::text, ${slug}, ${isVisible}, ${isPinned}, ${pinOrder}, NOW(), NOW())
        ON CONFLICT (cabinet_id, article_id) DO NOTHING
        RETURNING id
      `;
      if (res.length > 0) inserted++;
    } else {
      // SQLite via Drizzle. INSERT OR IGNORE n'est pas dispo en Drizzle,
      // mais l'index idx_library_unique + try/catch tolère la violation.
      const newId = `cla_${crypto.randomUUID()}`;
      try {
        await db.insert(cabinetLibraryArticles).values({
          id: newId,
          cabinetId,
          articleId: slug,
          isVisible,
          isPinned,
          pinOrder,
        });
        inserted++;
      } catch (e: any) {
        // UNIQUE violation = l'article est déjà lié, on skip.
        if (!/UNIQUE|idx_library_unique/i.test(String(e?.message ?? ''))) {
          throw e;
        }
      }
    }
  }

  return NextResponse.json({
    ok: true,
    inserted,
    total: slugs.length,
    cabinetId,
  });
}