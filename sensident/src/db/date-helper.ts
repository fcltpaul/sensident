/**
 * Sensident — Helpers Date pour queries Drizzle/Postgres
 *
 * PROBLÈME : Drizzle + postgres-js refuse les Date JavaScript dans les tagged
 * templates ("The string argument must be of type string or Buffer. Received
 * an instance of Date"). En SQLite (libsql) ça marche, en Postgres non.
 *
 * DEUX HELPERS :
 * - D(date) : pour Drizzle ORM uniquement. Retourne un objet sql Drizzle
 *   qui sait se desencaquer pour Drizzle.
 * - DS(date) : pour raw SQL postgres-js (rawSqlClient). Retourne une string
 *   ISO directe. NE PAS utiliser D() dans rawSqlClient : postgres-js tente
 *   alors Buffer.byteLength() sur l'objet sql Drizzle -> TypeError
 *   "Received an instance of SQL" (cf. crash engagement/analytics 08/07/2026).
 */
import { sql } from 'drizzle-orm';

export function D(date: Date | string | number): ReturnType<typeof sql> {
  const d = date instanceof Date ? date.toISOString() : new Date(date).toISOString();
  return sql`${d}::timestamptz`;
}

/**
 * Version string ISO pour raw SQL postgres-js.
 * La query doit imperativement contenir un cast ::timestamptz pour que
 * la string ISO soit interpretee correctement cote PG.
 */
export function DS(date: Date | string | number): string {
  const d = date instanceof Date ? date.toISOString() : new Date(date).toISOString();
  return `${d}::timestamptz`;
}
