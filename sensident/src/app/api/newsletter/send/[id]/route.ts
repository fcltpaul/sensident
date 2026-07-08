/**
 * Sensident — PATCH /api/newsletter/send/[id]
 *
 * Modifie le scheduled_at d'une newsletter programmée. Déclenche
 * shiftConflictingSends pour décaler les autres sends du cabinet qui
 * seraient en collision avec la nouvelle date.
 *
 * Spec Paul 2026-07-08 : drag-and-drop dans /dashboard/scheduled pour
 * réordonner/réplanifier les NL programmées. Cet endpoint est la cible
 * du PATCH déclenché par le drop.
 *
 * Note : pour réutiliser shiftConflictingSends (export privé), on
 * importe depuis /api/newsletter/send/route.ts via import dynamique.
 */
import { NextRequest, NextResponse } from 'next/server';
import crypto from 'node:crypto';
import { db, DB_DIALECT, rawSqlClient } from '@/db/client';
import { newsletterSends } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { getSessionFromCookie } from '@/lib/auth';

import { z } from 'zod';

const PatchSchema = z.object({
  scheduledAt: z.string().datetime(),
});

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getSessionFromCookie();
  if (!session || !session.mfaVerified) {
    return NextResponse.json({ error: 'Non autorisé.' }, { status: 401 });
  }

  let body;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'JSON invalide.' }, { status: 400 });
  }

  const parsed = PatchSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: 'Données invalides.' }, { status: 400 });
  }

  const newAt = new Date(parsed.data.scheduledAt);
  if (newAt.getTime() <= Date.now()) {
    return NextResponse.json(
      { error: 'La nouvelle date doit être dans le futur.' },
      { status: 400 }
    );
  }

  // 1. Vérifier que le send existe et appartient au cabinet
  let sendRow: any;
  if (DB_DIALECT === 'postgresql') {
    const rows = await rawSqlClient<Array<{
      id: string; cabinet_id: string; status: string; article_slug: string;
    }>>`
      SELECT id::text AS id, cabinet_id::text AS cabinet_id, status, article_slug
      FROM newsletter_sends
      WHERE id::text = ${params.id}::text
      LIMIT 1
    `;
    sendRow = rows[0];
  } else {
    const rows = await db
      .select({
        id: newsletterSends.id,
        cabinetId: newsletterSends.cabinetId,
        status: newsletterSends.status,
        articleSlug: newsletterSends.articleSlug,
      })
      .from(newsletterSends)
      .where(eq(newsletterSends.id, params.id))
      .limit(1);
    sendRow = rows[0] ? {
      id: rows[0].id,
      cabinet_id: rows[0].cabinetId,
      status: rows[0].status,
      article_slug: rows[0].articleSlug,
    } : null;
  }

  if (!sendRow) {
    return NextResponse.json({ error: 'Newsletter introuvable.' }, { status: 404 });
  }
  if (sendRow.cabinet_id !== session.cabinetId) {
    return NextResponse.json({ error: 'Accès refusé.' }, { status: 403 });
  }
  if (sendRow.status !== 'scheduled') {
    return NextResponse.json(
      { error: 'Seules les newsletters programmées peuvent être déplacées.' },
      { status: 400 }
    );
  }

  // 2. Réutiliser la logique de décalage de /api/newsletter/send
  //    On importe la fonction depuis le module send route.
  //    Note : shiftConflictingSends n'est pas exportée, donc on réimplémente
  //    la logique ici (le code est petit et le partager ajouterait du couplage).
  await shiftAndUpdate(sendRow.cabinet_id, params.id, newAt);

  // 3. Retourner le send mis à jour
  let updated: any;
  if (DB_DIALECT === 'postgresql') {
    const rows = await rawSqlClient<Array<{ id: string; scheduled_at: string }>>`
      SELECT id::text AS id, scheduled_at::text AS scheduled_at
      FROM newsletter_sends WHERE id::text = ${params.id}::text LIMIT 1
    `;
    updated = rows[0];
  } else {
    const rows = await db
      .select({ id: newsletterSends.id, scheduledAt: newsletterSends.scheduledAt })
      .from(newsletterSends)
      .where(eq(newsletterSends.id, params.id))
      .limit(1);
    updated = rows[0] ? { id: rows[0].id, scheduled_at: rows[0].scheduledAt?.toISOString() } : null;
  }

  return NextResponse.json({ ok: true, send: updated });
}

/**
 * Déplace `sendId` à `newAt`, puis décale en cascade les autres sends
 * du cabinet qui seraient en collision.
 *
 * Strategie identique à shiftConflictingSends dans /api/newsletter/send/route.ts,
 * mais inversée : on PART de newAt et on décale ce qui bloque APRÈS.
 */
async function shiftAndUpdate(
  cabinetId: string,
  sendId: string,
  newAt: Date
): Promise<void> {
  const SHIFT_MS = 15 * 60 * 1000;
  const CONFLICT_BEFORE_MS = 5 * 60 * 1000;
  const WINDOW_AFTER_MS = 15 * 60 * 1000;
  const MAX_PASSES = 10;

  const windowLower = new Date(newAt.getTime() - CONFLICT_BEFORE_MS);
  const windowUpper = new Date(newAt.getTime() + WINDOW_AFTER_MS);
  const farFutureCutoff = new Date(newAt.getTime() + 12 * 60 * 60 * 1000);

  // 1. D'abord, mettre à jour le send qu'on déplace
  if (DB_DIALECT === 'postgresql') {
    await rawSqlClient`
      UPDATE newsletter_sends
      SET scheduled_at = ${newAt.toISOString()}::timestamptz
      WHERE id::text = ${sendId}::text
    `;
  } else {
    await db
      .update(newsletterSends)
      .set({ scheduledAt: newAt })
      .where(eq(newsletterSends.id, sendId));
  }

  // 2. Puis décalage en cascade
  for (let pass = 0; pass < MAX_PASSES; pass++) {
    const candidates = await fetchSendsInWindow(cabinetId, windowLower, farFutureCutoff, sendId);

    const toShift: Array<{ id: string; scheduled_at: Date }> = [];
    let prevSlot: Date | null = null;
    for (const c of candidates) {
      const schedAt = new Date(c.scheduled_at);
      if (schedAt.getTime() < newAt.getTime()) {
        prevSlot = schedAt;
        continue;
      }
      // Note : windowUpper en `<` strict. Un send exactement a newAt + 15min
      // a deja 15min d'ecart avec newAt (= SHIFT_MS), donc il n'est PAS en
      // collision. Sinon la boucle cascade repart a l'infini (cf. test diag).
      const isInConflictWindow = schedAt.getTime() >= windowLower.getTime() && schedAt.getTime() < windowUpper.getTime();
      const tooCloseFromPrev = prevSlot !== null && (schedAt.getTime() - prevSlot.getTime()) < SHIFT_MS;
      if (isInConflictWindow || tooCloseFromPrev) {
        toShift.push({ id: c.id, scheduled_at: schedAt });
      }
      prevSlot = schedAt;
    }

    if (toShift.length === 0) break;

    let lastSlot = newAt;
    for (const t of toShift) {
      const oldAt = t.scheduled_at;
      const naiveShift = new Date(oldAt.getTime() + SHIFT_MS);
      const chainShift = new Date(lastSlot.getTime() + SHIFT_MS);
      const newShift = naiveShift.getTime() > chainShift.getTime() ? naiveShift : chainShift;
      if (newShift.getTime() === oldAt.getTime()) {
        lastSlot = oldAt;
        continue;
      }
      if (DB_DIALECT === 'postgresql') {
        await rawSqlClient`
          UPDATE newsletter_sends
          SET scheduled_at = ${newShift.toISOString()}::timestamptz
          WHERE id::text = ${t.id}::text
        `;
      } else {
        await db
          .update(newsletterSends)
          .set({ scheduledAt: newShift })
          .where(eq(newsletterSends.id, t.id));
      }
      lastSlot = newShift;
    }
  }
}

async function fetchSendsInWindow(
  cabinetId: string,
  from: Date,
  to: Date,
  excludeSendId: string
): Promise<Array<{ id: string; scheduled_at: string }>> {
  if (DB_DIALECT === 'postgresql') {
    return await rawSqlClient<Array<{ id: string; scheduled_at: string }>>`
      SELECT id::text AS id, scheduled_at::text AS scheduled_at
      FROM newsletter_sends
      WHERE cabinet_id::text = ${cabinetId}::text
        AND status = 'scheduled'
        AND id::text <> ${excludeSendId}::text
        AND scheduled_at IS NOT NULL
        AND scheduled_at >= ${from.toISOString()}::timestamptz
        AND scheduled_at <= ${to.toISOString()}::timestamptz
      ORDER BY scheduled_at ASC
      LIMIT 200
    `;
  }
  const rows = await db
    .select({
      id: newsletterSends.id,
      scheduledAt: newsletterSends.scheduledAt,
    })
    .from(newsletterSends)
    .where(eq(newsletterSends.cabinetId, cabinetId));
  return rows
    .filter((r) => r.id !== excludeSendId && r.scheduledAt !== null)
    .map((r) => ({ id: r.id, scheduled_at: (r.scheduledAt as Date).toISOString() }));
}