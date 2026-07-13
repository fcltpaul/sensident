/**
 * Sensident — PATCH /api/newsletter/send/[id]
 *          — DELETE /api/newsletter/send/[id]
 *
 * PATCH : modifie le scheduled_at d'une newsletter programmée. Déclenche
 *          shiftConflictingSends pour décaler les autres sends du cabinet
 *          qui seraient en collision avec la nouvelle date.
 * DELETE : supprime (hard delete) une newsletter programmée. Les recipients
 *          associés sont supprimés en cascade (FK ON DELETE CASCADE).
 *          Les autres sends du cabinet ne sont PAS modifiés (il n'y a pas
 *          de "trou" problématique, on garde l'espacement original pour
 *          respecter la cadence naturelle).
 *
 * Spec Paul 2026-07-08 :
 *   - Drag-and-drop dans /dashboard/scheduled pour réordonner/réplanifier.
 *   - Le décalage doit respecter la cadence configurée du cabinet
 *     (2026-07-08 17h12). Si la cadence est 'monthly' jour 1 13h, les sends
 *     décalés atterrissent sur la prochaine occurrence valide.
 *
 *   - Aucune collision : 2 NL ne peuvent jamais partager la même date.
 *
 * Spec Paul 2026-07-13 :
 *   - Bouton poubelle sur la ligne d'une NL programmée pour la supprimer.
 */
import { NextRequest, NextResponse } from 'next/server';
import crypto from 'node:crypto';
import { db, DB_DIALECT, rawSqlClient } from '@/db/client';
import { newsletterSends, cabinets } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { getSessionFromCookie } from '@/lib/auth';
import {
  parseCadence,
  nextCadenceOccurrence,
  type Cadence,
} from '@/lib/newsletter-cadence';
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

  // 2. Charger la cadence du cabinet pour le décalage
  const cadence = await loadCabinetCadence(sendRow.cabinet_id);
  console.log('[PATCH newsletter/send] cabinetId:', sendRow.cabinet_id, 'sendId:', params.id, 'newAt:', newAt.toISOString(), 'cadence:', cadence);

  // 3. Déplacer + décalage en cascade (cadence-aware)
  await shiftAndUpdate(sendRow.cabinet_id, params.id, newAt, cadence);
  console.log('[PATCH newsletter/send] shiftAndUpdate OK');

  // 4. Retourner TOUS les sends impactes (drag + cascade) pour que le client
  //    puisse mettre a jour son UI sans F5 / router.refresh().
  const allSends = await loadUpcomingSends(sendRow.cabinet_id, '', new Date());
  // loadUpcomingSends exclut un send via excludeSendId : ici on veut TOUT, donc
  // on recharge via une query dediee.
  const impacted = await (DB_DIALECT === 'postgresql'
    ? rawSqlClient<Array<{ id: string; scheduled_at: string; article_slug: string }>>`
        SELECT id::text AS id, scheduled_at::text AS scheduled_at, article_slug
        FROM newsletter_sends
        WHERE cabinet_id::text = ${sendRow.cabinet_id}::text
          AND status = 'scheduled'
          AND scheduled_at IS NOT NULL
          AND scheduled_at > NOW()
        ORDER BY scheduled_at ASC
        LIMIT 200
      `
    : db
        .select({
          id: newsletterSends.id,
          scheduledAt: newsletterSends.scheduledAt,
          articleSlug: newsletterSends.articleSlug,
        })
        .from(newsletterSends)
        .where(eq(newsletterSends.cabinetId, sendRow.cabinet_id))
        .then((rs) =>
          rs
            .filter((r) => r.scheduledAt !== null && (r.scheduledAt as Date).getTime() > Date.now())
            .sort(
              (a, b) =>
                (a.scheduledAt as Date).getTime() - (b.scheduledAt as Date).getTime()
            )
            .map((r) => ({
              id: r.id,
              scheduled_at: (r.scheduledAt as Date).toISOString(),
              article_slug: r.articleSlug,
            }))
        ));

  return NextResponse.json({
    ok: true,
    sends: impacted.map((s: any) => ({
      id: s.id,
      scheduledAt: s.scheduled_at,
      articleSlug: s.article_slug,
    })),
  });
}

/**
 * DELETE /api/newsletter/send/[id]
 *
 * Supprime une newsletter programmée. Hard delete (le send n'a jamais été
 * envoyé). Les destinataires liés sont supprimés en cascade via la FK.
 *
 * Spec Paul 2026-07-13 : bouton poubelle sur la ligne d'une NL programmée
 * pour la supprimer. On conserve l'espacement naturel des autres sends
 * (pas de cascade "remplissage") — la cadence est respectée car supprimer
 * un send ne crée pas de collision.
 *
 * Sécurité :
 *   - Authentifié + MFA
 *   - Le send doit appartenir au cabinet du session.cabinetId
 *   - Le send doit être en status 'scheduled' (on ne supprime pas un 'sent'/'sending')
 */
export async function DELETE(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getSessionFromCookie();
  if (!session || !session.mfaVerified) {
    return NextResponse.json({ error: 'Non autorisé.' }, { status: 401 });
  }

  // 1. Vérifier que le send existe et appartient au cabinet
  let sendRow: any;
  if (DB_DIALECT === 'postgresql') {
    const rows = await rawSqlClient<Array<{
      id: string; cabinet_id: string; status: string;
    }>>`
      SELECT id::text AS id, cabinet_id::text AS cabinet_id, status
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
      })
      .from(newsletterSends)
      .where(eq(newsletterSends.id, params.id))
      .limit(1);
    sendRow = rows[0]
      ? { id: rows[0].id, cabinet_id: rows[0].cabinetId, status: rows[0].status }
      : null;
  }

  if (!sendRow) {
    return NextResponse.json({ error: 'Newsletter introuvable.' }, { status: 404 });
  }
  if (sendRow.cabinet_id !== session.cabinetId) {
    return NextResponse.json({ error: 'Accès refusé.' }, { status: 403 });
  }
  if (sendRow.status !== 'scheduled') {
    return NextResponse.json(
      { error: 'Seules les newsletters programmées peuvent être supprimées.' },
      { status: 400 }
    );
  }

  // 2. Hard delete. Les newsletter_recipients liés sont supprimés via la FK
  //    ON DELETE CASCADE (cf. schema.sql / schema.pg.ts).
  if (DB_DIALECT === 'postgresql') {
    await rawSqlClient`
      DELETE FROM newsletter_sends
      WHERE id::text = ${params.id}::text
    `;
  } else {
    await db.delete(newsletterSends).where(eq(newsletterSends.id, params.id));
  }

  return NextResponse.json({ ok: true, deletedId: params.id });
}

async function loadCabinetCadence(cabinetId: string): Promise<Cadence | null> {
  if (DB_DIALECT === 'postgresql') {
    const rows = await rawSqlClient<Array<{ newsletter_cadence: unknown }>>`
      SELECT newsletter_cadence FROM cabinets WHERE id::text = ${cabinetId}::text LIMIT 1
    `;
    return parseCadence(rows[0]?.newsletter_cadence);
  }
  const rows = await db
    .select({ newsletterCadence: cabinets.newsletterCadence })
    .from(cabinets)
    .where(eq(cabinets.id, cabinetId))
    .limit(1);
  return parseCadence(rows[0]?.newsletterCadence);
}

/**
 * Déplace `sendId` à `newAt`, puis décale en cascade les autres sends du cabinet
 * pour éviter toute collision.
 *
 * Strategie "cadence-aware" :
 *   - Pour chaque send conflictuel, on cherche le PROCHAIN slot valide :
 *     - Si une cadence est définie : prochaine occurrence de la cadence après
 *       le send précédent (ou après newAt si c'est le premier).
 *     - Sinon (cadence 'none') : +15 minutes.
 *   - On itère tant qu'il reste des collisions (cascade).
 *
 * Le but : 2 NL ne peuvent JAMAIS partager la même date ; les sends décalés
 * restent alignés sur la cadence du cabinet.
 */
async function shiftAndUpdate(
  cabinetId: string,
  sendId: string,
  newAt: Date,
  cadence: Cadence | null
): Promise<void> {
  const SHIFT_MS_NO_CADENCE = 15 * 60 * 1000;
  const MAX_PASSES = 20;

  // 1. UPDATE du send qu'on déplace à sa nouvelle date
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

  // 2. Cascade : on ramasse TOUS les sends programmés à venir du cabinet
  //    triés par date ASC, et on les re-régularise pour qu'il n'y ait aucune
  //    collision et qu'ils respectent la cadence (si définie).
  //
  //    Strategie simple : on réassigne le send i au prochain slot valide après
  //    le send (i-1). Si cadence est définie, "slot valide" = prochaine occurrence
  //    de cadence > send(i-1). Sinon, "slot valide" = send(i-1) + 15min.
  //
  //    IMPORTANT : on inclut newAt dans le filtre bas (= les sends qui sont deja
  //    a la meme date que newAt doivent etre decales pour eviter la collision).
  for (let pass = 0; pass < MAX_PASSES; pass++) {
    const upcoming = await loadUpcomingSends(cabinetId, sendId, newAt);
    if (upcoming.length === 0) return;

    let prevSlot: Date | null = null;
    let mutated = false;

    // Le 1er send doit être strictement APRÈS newAt (pas egal), sinon
    // collision avec le send qu'on vient de deplacer. Si son scheduled_at
    // <= newAt, on le bump a la prochaine occurrence valide apres newAt.
    for (let i = 0; i < upcoming.length; i++) {
      const send = upcoming[i];
      const current = new Date(send.scheduled_at);

      let desired: Date;
      if (prevSlot === null) {
        // Premier send : doit etre STRICTEMENT > newAt
        if (current.getTime() > newAt.getTime()) {
          desired = current;
        } else {
          // =newAt ou <newAt → on cherche le prochain slot valide
          if (cadence) {
            const nextOcc = nextCadenceOccurrence(cadence, newAt);
            desired = nextOcc ?? new Date(newAt.getTime() + SHIFT_MS_NO_CADENCE);
          } else {
            desired = new Date(newAt.getTime() + SHIFT_MS_NO_CADENCE);
          }
        }
      } else {
        // Pas le premier : on doit être > prevSlot selon la règle
        if (cadence) {
          const nextOcc = nextCadenceOccurrence(cadence, prevSlot);
          desired = nextOcc ?? new Date(prevSlot.getTime() + SHIFT_MS_NO_CADENCE);
        } else {
          desired = new Date(prevSlot.getTime() + SHIFT_MS_NO_CADENCE);
        }
      }

      if (desired.getTime() !== current.getTime()) {
        if (DB_DIALECT === 'postgresql') {
          await rawSqlClient`
            UPDATE newsletter_sends
            SET scheduled_at = ${desired.toISOString()}::timestamptz
            WHERE id::text = ${send.id}::text
          `;
        } else {
          await db
            .update(newsletterSends)
            .set({ scheduledAt: desired })
            .where(eq(newsletterSends.id, send.id));
        }
        // On met à jour upcoming[i] pour la suite de la cascade
        upcoming[i].scheduled_at = desired.toISOString();
        mutated = true;
      }
      prevSlot = desired;
    }

    if (!mutated) break;
  }
}

async function loadUpcomingSends(
  cabinetId: string,
  excludeSendId: string,
  newAt: Date
): Promise<Array<{ id: string; scheduled_at: string }>> {
  if (DB_DIALECT === 'postgresql') {
    // Charge les sends prog a venir du cabinet (excluant excludeSendId), inclant
    // ceux qui sont a la meme date que newAt (qui sont en collision). On prend
    // donc `>= newAt` en bas (et `> NOW()` pour eviter les sends passes).
    const lowerBound = newAt.getTime() < Date.now() ? new Date() : newAt;
    return await rawSqlClient<Array<{ id: string; scheduled_at: string }>>`
      SELECT id::text AS id, scheduled_at::text AS scheduled_at
      FROM newsletter_sends
      WHERE cabinet_id::text = ${cabinetId}::text
        AND status = 'scheduled'
        AND id::text <> ${excludeSendId}::text
        AND scheduled_at IS NOT NULL
        AND scheduled_at >= ${lowerBound.toISOString()}::timestamptz
        AND scheduled_at <= (${lowerBound.toISOString()}::timestamptz + INTERVAL '24 months')
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
  const lowerBound = newAt.getTime() < Date.now() ? Date.now() : newAt.getTime();
  const cutoff = lowerBound + 24 * 30 * 24 * 3600 * 1000;
  return rows
    .filter((r) => r.id !== excludeSendId && r.scheduledAt !== null)
    .filter((r) => {
      const t = (r.scheduledAt as Date).getTime();
      return t >= lowerBound && t <= cutoff;
    })
    .sort((a, b) => (a.scheduledAt as Date).getTime() - (b.scheduledAt as Date).getTime())
    .map((r) => ({ id: r.id, scheduled_at: (r.scheduledAt as Date).toISOString() }));
}