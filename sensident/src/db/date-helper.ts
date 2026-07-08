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
 * Version string ISO pure pour raw SQL postgres-js (rawSqlClient).
 *
 * IMPORTANT : la query DOIT contenir `::timestamptz` elle-meme, car
 * postgres-js envoie le parametre comme string bindee et PG ne fait
 * pas de cast auto sur les strings.
 *
 * Exemple correct :
 *   const since = DS(startOfMonth);
 *   sql\`... WHERE sent_at >= \${since}::timestamptz\`
 *
 * Exemple faux (le ::timestamptz finit dans la string bindee) :
 *   sql\`... WHERE sent_at >= \${since}\`  avec DS='2026-07-01T00:00:00.000Z::timestamptz'
 *   -> Postgres tente de parser la string comme timestamp -> erreur.
 */
export function DS(date: Date | string | number): string {
  return date instanceof Date ? date.toISOString() : new Date(date).toISOString();
}
