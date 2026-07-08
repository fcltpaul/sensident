/**
 * Sensident — Helper de décalage en cascade des newsletters programmées
 *
 * Spec Paul 2026-07-08 17h12 : le décalage doit respecter la cadence du
 * cabinet. Le 1er send est positionné à `anchorDate` (date demandée par
 * l'user). Les sends existants en collision ou trop proches sont ré-alignés
 * sur la prochaine occurrence de la cadence (ou +15min en fallback).
 *
 * Utilisé par :
 *   - POST /api/newsletter/send  (schedule initial)
 *   - PATCH /api/newsletter/send/[id] (drag-and-drop)
 *
 * IMPORTANT : l'appelant doit avoir déjà inséré/updaté le send dragué à sa
 * nouvelle date AVANT d'appeler cette fonction. La fonction s'occupe de
 * décaler les autres.
 */
import { db, DB_DIALECT, rawSqlClient } from '@/db/client';
import { newsletterSends } from '@/db/schema';
import { eq } from 'drizzle-orm';
import {
  parseCadence,
  nextCadenceOccurrence,
  type Cadence,
} from './newsletter-cadence';

export async function loadCabinetCadence(cabinetId: string): Promise<Cadence | null> {
  if (DB_DIALECT === 'postgresql') {
    const rows = await rawSqlClient<Array<{ newsletter_cadence: unknown }>>`
      SELECT newsletter_cadence FROM cabinets WHERE id::text = ${cabinetId}::text LIMIT 1
    `;
    return parseCadence(rows[0]?.newsletter_cadence);
  }
  // SQLite (dev) — import dynamique pour éviter cycle
  const { cabinets } = await import('@/db/schema');
  const rows = await db
    .select({ newsletterCadence: cabinets.newsletterCadence })
    .from(cabinets)
    .where(eq(cabinets.id, cabinetId))
    .limit(1);
  return parseCadence(rows[0]?.newsletterCadence);
}

/**
 * Décale en cascade tous les sends programmés à venir du cabinet, en
 * respectant la cadence. Le send dragué doit déjà être à `anchorDate`.
 *
 * @param cabinetId ID du cabinet
 * @param anchorDate Date du send dragué (déjà en BDD à cette date)
 * @returns Liste des sends impactés (id + scheduledAt + articleSlug) pour
 *          que l'UI puisse se mettre à jour sans F5.
 */
export async function cascadeShift(
  cabinetId: string,
  anchorDate: Date
): Promise<Array<{ id: string; scheduledAt: string; articleSlug: string }>> {
  const cadence = await loadCabinetCadence(cabinetId);
  const SHIFT_MS_NO_CADENCE = 15 * 60 * 1000;
  const MAX_PASSES = 20;

  for (let pass = 0; pass < MAX_PASSES; pass++) {
    const upcoming = await loadUpcomingSends(cabinetId, anchorDate);
    if (upcoming.length === 0) return await loadAllScheduledSends(cabinetId);

    let prevSlot: Date | null = null;
    let mutated = false;

    for (let i = 0; i < upcoming.length; i++) {
      const send = upcoming[i];
      const current = new Date(send.scheduled_at);

      let desired: Date;
      if (prevSlot === null) {
        // Premier send : doit etre STRICTEMENT > anchorDate
        if (current.getTime() > anchorDate.getTime()) {
          desired = current;
        } else {
          // =anchorDate ou <anchorDate -> collision, on bump
          if (cadence) {
            const nextOcc = nextCadenceOccurrence(cadence, anchorDate);
            desired = nextOcc ?? new Date(anchorDate.getTime() + SHIFT_MS_NO_CADENCE);
          } else {
            desired = new Date(anchorDate.getTime() + SHIFT_MS_NO_CADENCE);
          }
        }
      } else {
        // Pas le premier : on doit etre > prevSlot selon la cadence
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
        upcoming[i].scheduled_at = desired.toISOString();
        mutated = true;
      }
      prevSlot = desired;
    }

    if (!mutated) break;
  }

  return await loadAllScheduledSends(cabinetId);
}

async function loadUpcomingSends(
  cabinetId: string,
  anchorDate: Date
): Promise<Array<{ id: string; scheduled_at: string }>> {
  if (DB_DIALECT === 'postgresql') {
    // Charge sends >= anchorDate (incluant les collisions exactes) et <= +24 mois
    const lowerBound = anchorDate.getTime() < Date.now() ? new Date() : anchorDate;
    return await rawSqlClient<Array<{ id: string; scheduled_at: string }>>`
      SELECT id::text AS id, scheduled_at::text AS scheduled_at
      FROM newsletter_sends
      WHERE cabinet_id::text = ${cabinetId}::text
        AND status = 'scheduled'
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
  const lowerBound = anchorDate.getTime() < Date.now() ? Date.now() : anchorDate.getTime();
  const cutoff = lowerBound + 24 * 30 * 24 * 3600 * 1000;
  return rows
    .filter((r) => r.scheduledAt !== null)
    .filter((r) => {
      const t = (r.scheduledAt as Date).getTime();
      return t >= lowerBound && t <= cutoff;
    })
    .sort((a, b) => (a.scheduledAt as Date).getTime() - (b.scheduledAt as Date).getTime())
    .map((r) => ({ id: r.id, scheduled_at: (r.scheduledAt as Date).toISOString() }));
}

async function loadAllScheduledSends(
  cabinetId: string
): Promise<Array<{ id: string; scheduledAt: string; articleSlug: string }>> {
  if (DB_DIALECT === 'postgresql') {
    const rows = await rawSqlClient<
      Array<{ id: string; scheduled_at: string; article_slug: string }>
    >`
      SELECT id::text AS id, scheduled_at::text AS scheduled_at, article_slug
      FROM newsletter_sends
      WHERE cabinet_id::text = ${cabinetId}::text
        AND status = 'scheduled'
        AND scheduled_at IS NOT NULL
        AND scheduled_at > NOW()
      ORDER BY scheduled_at ASC
      LIMIT 200
    `;
    return rows.map((r) => ({
      id: r.id,
      scheduledAt: r.scheduled_at,
      articleSlug: r.article_slug,
    }));
  }
  const rows = await db
    .select({
      id: newsletterSends.id,
      scheduledAt: newsletterSends.scheduledAt,
      articleSlug: newsletterSends.articleSlug,
    })
    .from(newsletterSends)
    .where(eq(newsletterSends.cabinetId, cabinetId));
  return rows
    .filter((r) => r.scheduledAt !== null && (r.scheduledAt as Date).getTime() > Date.now())
    .sort((a, b) => (a.scheduledAt as Date).getTime() - (b.scheduledAt as Date).getTime())
    .map((r) => ({
      id: r.id,
      scheduledAt: (r.scheduledAt as Date).toISOString(),
      articleSlug: r.articleSlug,
    }));
}