/**
 * Sensident — Rate limiting in-memory (MVP)
 *
 * Strategie "sliding window" simple en process memory.
 * - Pas de Redis ni SQLite : Map<key, number[]> des timestamps.
 * - Nettoyage opportuniste a chaque appel (pas de cron).
 * - Suffisant pour 1 instance Next.js. Si multi-instance (k8s, Vercel multi-region),
 *   basculer sur Redis/Upstash avant prod HDS.
 *
 * Limites par defaut (alignees avec l'instruction Paul du 09/06) :
 * - login_practitioner : 5 / min / IP
 * - login_admin        : 5 / min / IP
 * - patient_optin      : 10 / min / IP     (instruction Paul — on garde la limite BDD existante pour magic_link: 3/h)
 * - magic_link         : 3 / min / email
 *
 * Usage :
 *   import { checkRateLimitMemory } from '@/lib/rate-limit-memory';
 *   const r = await checkRateLimitMemory({ key: `login_practitioner:${ip}`, limit: 5, windowMs: 60_000 });
 *   if (!r.allowed) return new Response('rate_limited', { status: 429, headers: { 'Retry-After': String(r.retryAfterSec) } });
 */

export type RouteMemoryKey =
  | 'login_practitioner'
  | 'login_admin'
  | 'patient_optin'
  | 'magic_link';

export interface MemoryLimit {
  key: string;        // identifiant unique, ex: "login_practitioner:1.2.3.4" ou "magic_link:email@x"
  limit: number;      // nb de hits max dans la fenetre
  windowMs: number;   // taille de la fenetre en ms
}

export interface MemoryResult {
  allowed: boolean;
  remaining: number;
  resetAt: Date;
  retryAfterSec?: number;
}

const DEFAULT_LIMITS: Record<RouteMemoryKey, { limit: number; windowMs: number }> = {
  login_practitioner: { limit: 5, windowMs: 60_000 },         // 5/min/IP
  login_admin:        { limit: 5, windowMs: 60_000 },         // 5/min/IP
  patient_optin:      { limit: 10, windowMs: 60_000 },        // 10/min/IP
  magic_link:         { limit: 3, windowMs: 60_000 },         // 3/min/email
};

// Map<key, hits[]>. hits = timestamps epoch ms, tries dans la fenetre.
const store = new Map<string, number[]>();

// Garde-fou memoire : cap le nombre de cles. Si on depasse, on purge les plus vieilles.
const MAX_KEYS = 10_000;

/**
 * Purge les cles expirees et, si on depasse MAX_KEYS, garde les N plus recentes.
 */
function gc(now: number): void {
  if (store.size <= MAX_KEYS) return;
  // Tri par plus ancienne activite
  const entries = Array.from(store.entries()).map(([k, hits]) => {
    const last = hits[hits.length - 1] ?? 0;
    return [k, last] as const;
  });
  entries.sort((a, b) => a[1] - b[1]);
  const toDrop = store.size - MAX_KEYS;
  for (let i = 0; i < toDrop; i++) {
    store.delete(entries[i][0]);
  }
}

/**
 * Verifie + incremente. Retourne allowed=false + retryAfterSec si bloque.
 */
export function checkRateLimitMemory(opts: MemoryLimit): MemoryResult {
  const now = Date.now();
  const windowStart = now - opts.windowMs;

  const hits = store.get(opts.key) ?? [];
  // Filtre la fenetre
  const recent = hits.filter((t) => t > windowStart);

  if (recent.length >= opts.limit) {
    const oldest = recent[0];
    const resetAt = new Date(oldest + opts.windowMs);
    return {
      allowed: false,
      remaining: 0,
      resetAt,
      retryAfterSec: Math.ceil((resetAt.getTime() - now) / 1000),
    };
  }

  recent.push(now);
  store.set(opts.key, recent);

  gc(now);

  return {
    allowed: true,
    remaining: opts.limit - recent.length,
    resetAt: new Date(now + opts.windowMs),
  };
}

/**
 * Helper : applique le limit par defaut a une route.
 */
export function checkRouteMemory(route: RouteMemoryKey, identifier: string): MemoryResult {
  const cfg = DEFAULT_LIMITS[route];
  return checkRateLimitMemory({
    key: `${route}:${identifier}`,
    limit: cfg.limit,
    windowMs: cfg.windowMs,
  });
}

/**
 * Reinitialise tout (utile pour les tests).
 */
export function resetRateLimitMemory(): void {
  store.clear();
}

/**
 * Expose la config par defaut (utile pour debug/introspection).
 */
export function getDefaultLimits() {
  return { ...DEFAULT_LIMITS };
}
