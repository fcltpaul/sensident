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
 *
 * Note PG (12/06/2026) : Drizzle + postgres-js crash avec "Received type number"
 * sur les colonnes timestamp quand on passe un Date (converti en number Unix).
 * On bypass Drizzle en PG et on utilise rawSqlClient (postgres-js tagged template)
 * avec conversion explicite en ISO string.
 */

import { db, DB_DIALECT, rawSqlClient } from '@/db/client';
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

  if (DB_DIALECT === 'postgresql') {
    // Bypass Drizzle : postgres-js tagged template avec Date -> ISO string
    const windowStartIso = windowStart.toISOString();
    const keyStr = key;
    const routeStr = route;

    // Compter les hits dans la fenetre
    const countResult = await rawSqlClient<{ count: string }[]>`
      SELECT COUNT(*)::int AS count FROM rate_limits
      WHERE route = ${routeStr} AND key = ${keyStr} AND ts >= ${windowStartIso}::timestamptz
    `;
    const count = countResult[0]?.count ?? 0;

    if (count >= cfg.count) {
      // Calculer le moment de la plus ancienne entree pour le retry
      const oldestResult = await rawSqlClient<{ ts: Date }[]>`
        SELECT ts FROM rate_limits
        WHERE route = ${routeStr} AND key = ${keyStr} AND ts >= ${windowStartIso}::timestamptz
        ORDER BY ts ASC LIMIT 1
      `;
      const oldest = oldestResult[0]?.ts;
      const resetAt = oldest
        ? new Date(new Date(oldest).getTime() + cfg.windowSec * 1000)
        : new Date(Date.now() + cfg.windowSec * 1000);

      return {
        allowed: false,
        remaining: 0,
        resetAt,
        retryAfterSec: Math.ceil((resetAt.getTime() - Date.now()) / 1000),
      };
    }

    // Autoriser : incrementer le compteur
    // ip peut etre 'unknown' (getClientIp fallback) : on insere NULL
    const ipParam = ip && ip !== 'unknown' ? ip : null;
    await rawSqlClient`
      INSERT INTO rate_limits (id, route, key, ip, ts)
      VALUES (gen_random_uuid(), ${routeStr}, ${keyStr}, ${ipParam}::inet, now())
    `;

    return {
      allowed: true,
      remaining: cfg.count - Number(count) - 1,
      resetAt: new Date(Date.now() + cfg.windowSec * 1000),
    };
  }

  // SQLite (dev) via Drizzle
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
  if (DB_DIALECT === 'postgresql') {
    const cutoffIso = cutoff.toISOString();
    const result = await rawSqlClient`
      DELETE FROM rate_limits WHERE ts < ${cutoffIso}::timestamptz
    `;
    return (result as any).count ?? 0;
  }
  const result = await db
    .delete(rateLimits)
    .where(sql`${rateLimits.ts} < ${cutoff}`);
  return (result as any).rowsAffected ?? 0;
}
