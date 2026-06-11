/**
 * Sensident — Rate limiting simple (sans Redis)
 *
 * Approche : compteur en BDD SQLite/libsql, fenêtre glissante par IP+route.
 * Pour le MVP, c'est suffisant. En prod HDS, on basculera sur pg_cron
 * pour nettoyer les vieux compteurs.
 *
 * Configuration :
 * - LOGIN_PRACTITIONER : 5 essais / 15 min / IP
 * - LOGIN_ADMIN : 5 essais / 15 min / IP
 * - PATIENT_OPTIN : 3 inscriptions / heure / IP
 * - MAGIC_LINK_REQUEST : 3 / heure / IP
 * - ARTICLE_HEARTBEAT : 60 pings / min / session
 */

import { db } from '@/db/client';
import { rateLimits } from '@/db/schema';
import { and, eq, gte, sql } from 'drizzle-orm';

export type RouteKey =
  | 'login_practitioner'
  | 'login_admin'
  | 'patient_optin'
  | 'magic_link'
  | 'mfa_verify'
  | 'article_heartbeat';

const LIMITS: Record<RouteKey, { count: number; windowSec: number }> = {
  login_practitioner: { count: 5, windowSec: 15 * 60 },
  login_admin: { count: 5, windowSec: 15 * 60 },
  patient_optin: { count: 3, windowSec: 60 * 60 },
  magic_link: { count: 3, windowSec: 60 * 60 },
  mfa_verify: { count: 10, windowSec: 15 * 60 },
  article_heartbeat: { count: 60, windowSec: 60 },
};

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetAt: Date;
  retryAfterSec?: number;
}

/**
 * Verifie si une requete est autorisee. Si oui, incremente le compteur.
 * Sinon, retourne les infos de blocage.
 */
export async function checkRateLimit(
  route: RouteKey,
  ip: string,
  identifier?: string  // optionnel : email, cabinet_id, etc.
): Promise<RateLimitResult> {
  const cfg = LIMITS[route];
  const windowStart = new Date(Date.now() - cfg.windowSec * 1000);
  const key = `${ip}:${identifier ?? ''}`;

  // Compter les hits dans la fenetre
  // Note: CAST(... AS int) est portable PG + SQLite
  const [{ count }] = await db
    .select({ count: sql<number>`CAST(COUNT(*) AS INTEGER)` })
    .from(rateLimits)
    .where(
      and(
        eq(rateLimits.route, route),
        eq(rateLimits.key, key),
        gte(rateLimits.ts, windowStart)
      )
    );

  if (count >= cfg.count) {
    // Calculer le moment de la plus ancienne entree pour le retry
    const [oldest] = await db
      .select({ ts: rateLimits.ts })
      .from(rateLimits)
      .where(
        and(
          eq(rateLimits.route, route),
          eq(rateLimits.key, key),
          gte(rateLimits.ts, windowStart)
        )
      )
      .orderBy(rateLimits.ts)
      .limit(1);

    const resetAt = oldest
      ? new Date(oldest.ts.getTime() + cfg.windowSec * 1000)
      : new Date(Date.now() + cfg.windowSec * 1000);

    return {
      allowed: false,
      remaining: 0,
      resetAt,
      retryAfterSec: Math.ceil((resetAt.getTime() - Date.now()) / 1000),
    };
  }

  // Autoriser : incrementer le compteur
  await db.insert(rateLimits).values({
    route,
    key,
    ip,
  });

  return {
    allowed: true,
    remaining: cfg.count - count - 1,
    resetAt: new Date(Date.now() + cfg.windowSec * 1000),
  };
}

/**
 * Recupere l'IP depuis la requete (derriere un proxy, il faut lire x-forwarded-for).
 */
export function getClientIp(req: Request): string {
  const xff = req.headers.get('x-forwarded-for');
  if (xff) return xff.split(',')[0].trim();
  const realIp = req.headers.get('x-real-ip');
  if (realIp) return realIp;
  return 'unknown';
}

/**
 * Nettoie les vieux compteurs (> 24h). A appeler via cron quotidien.
 */
export async function cleanupRateLimits(): Promise<number> {
  const cutoff = new Date(Date.now() - 24 * 60 * 60 * 1000);
  const result = await db
    .delete(rateLimits)
    .where(sql`${rateLimits.ts} < ${cutoff}`);
  return (result as any).rowsAffected ?? 0;
}
