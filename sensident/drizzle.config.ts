import type { Config } from 'drizzle-kit';

const usePostgres = process.env.DATABASE_URL?.startsWith('postgres');

/**
 * Drizzle Kit genere les migrations PostgreSQL (cible prod HDS).
 * En dev SQLite, on n'utilise pas drizzle-kit : on applique directement
 * src/db/schema.sql via scripts/init-db.ts.
 */
export default {
  schema: './src/db/schema.pg.ts',
  out: './src/db/migrations',
  dialect: usePostgres ? 'postgresql' : 'postgresql',
  ...(usePostgres
    ? {
        dbCredentials: {
          url: process.env.DATABASE_URL!,
        },
      }
    : {
        dbCredentials: {
          url: 'file:./dev.db',
        },
      }),
  verbose: true,
  strict: true,
} satisfies Config;
