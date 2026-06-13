/**
 * Sensident — Helpers Date pour queries Drizzle/Postgres
 *
 * PROBLÈME : Drizzle + postgres-js refuse les Date JavaScript dans les tagged
 * templates ("The string argument must be of type string or Buffer. Received
 * an instance of Date"). En SQLite (libsql) ça marche, en Postgres non.
 *
 * SOLUTION : utiliser ce helper `D(date)` qui convertit en ISO + cast timestamptz
 * pour que postgres-js accepte la valeur.
 *
 * Usage :
 *   // Au lieu de : gte(table.col, new Date())
 *   // Faire :     sql`${table.col} >= ${D(new Date())}`
 */
import { sql } from 'drizzle-orm';

export function D(date: Date | string | number): ReturnType<typeof sql> {
  const d = date instanceof Date ? date.toISOString() : new Date(date).toISOString();
  return sql`${d}::timestamptz`;
}
