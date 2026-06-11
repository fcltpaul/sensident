/**
 * Sensident — Reexport du schéma selon le dialecte
 *
 * Le code applicatif importe depuis ce fichier (`@/db/schema`).
 * En dev SQLite, on reexporte `schema.sqlite.ts`.
 * En prod PostgreSQL, on reexporte `schema.pg.ts`.
 *
 * Note TS: les deux modules exportent les mêmes noms de tables (1:1 mapping),
 * le type est donc compatible à l'usage.
 */
export * from './schema.sqlite';
