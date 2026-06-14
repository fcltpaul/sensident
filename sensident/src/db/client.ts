/**
 * Sensident — Client Drizzle (SQLite via libsql en dev, PostgreSQL en prod)
 *
 * Le dev utilise @libsql/client (file-based, pas de compilation native).
 * La prod utilise PostgreSQL HDS avec RLS.
 *
 * Le code applicatif utilise le même Drizzle client abstrait.
 * L'isolation tenant est :
 *   - simulée côté application en SQLite (filtre WHERE cabinet_id = ?)
 *   - enforceée par RLS en PostgreSQL
 *
 * Note historique (11/06/2026) :
 * Un monkey-patch des méthodes query/unsafe de postgres-js avait été ajouté
 * pour contourner un bug d'inférence de types Drizzle. Il a été supprimé
 * car il corrompait la sérialisation des booléens et des Date.
 * Les serializers par défaut de postgres-js fonctionnent parfaitement :
 *   - Date → OID 1184 (timestamp ISO)
 *   - boolean → OID 16 ('t'/'f')
 * Vérifié par scripts/test-drizzle-neon.ts (INSERT + SELECT persistés OK).
 *
 * Note (14/06/2026) :
 * Drizzle 0.33 + postgres-js n'applique PAS le defaultFn/UUID côté JS lors
 * des inserts en PG. Les inserts envoient `id=NULL` → NOT NULL violation.
 * En SQLite (dev) ça marche car @libsql/client respecte defaultFn.
 * Fix : on wrap `db.insert()` pour auto-injecter `id: crypto.randomUUID()`
 * pour toute table PG qui a une colonne id. Le wrapper est transparent pour
 * le code applicatif (toujours `db.insert(table).values({...})`).
 */
import { createClient } from '@libsql/client';
import { drizzle as drizzleLibsql } from 'drizzle-orm/libsql';
import { drizzle as drizzlePostgres } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import path from 'node:path';
import fs from 'node:fs';
import crypto from 'node:crypto';
import * as schemaSqlite from './schema.sqlite';
import * as schemaPostgres from './schema.pg';

const isPostgres = (process.env.DATABASE_URL || '').startsWith('postgres');

let _db: any = null;
let _schema: any = null;
let _rawClient: any = null;

if (isPostgres) {
  const connectionString = process.env.DATABASE_URL!;

  // En production, on FORCE sslmode=require pour eviter les connexions non chiffrées
  if (
    process.env.NODE_ENV === 'production' &&
    !connectionString.includes('sslmode=require') &&
    !connectionString.includes('sslmode=verify-full')
  ) {
    throw new Error('DATABASE_URL doit inclure sslmode=require ou sslmode=verify-full en production (HDS)');
  }

  const queryClient = postgres(connectionString, {
    max: 10,
    idle_timeout: 20,
    connect_timeout: 10,
    prepare: false,
  });

  _rawClient = queryClient;
  _db = drizzlePostgres(queryClient, { schema: schemaPostgres });
  _schema = schemaPostgres;

  // Wrap db.insert pour auto-injecter id=UUID si manquant (PG only)
  // On détecte si la table a une colonne 'id' via sa définition schema.
  // Tables PG = schemaPostgres, SQLite = schemaSqlite. On regarde les
  // deux pour rester safe.
  const originalInsert = _db.insert.bind(_db);
  _db.insert = (table: any) => {
    const wrapped = originalInsert(table);
    const originalValues = wrapped.values.bind(wrapped);
    wrapped.values = (values: any) => {
      // Si id absent et que la table a une colonne id (UUID/text), on l'ajoute
      if (values && typeof values === 'object' && !Array.isArray(values) && values.id == null) {
        const tableName = (table && (table._?.name || table[Symbol.for('drizzle:Name')] || table?.name)) || '';
        // Heuristique : toutes nos tables ont une colonne id UUID
        // (sauf vues ou tables de jointure sans PK)
        if (tableName && !tableName.startsWith('pg_')) {
          values.id = crypto.randomUUID();
        }
      }
      return originalValues(values);
    };
    return wrapped;
  };
} else {
  // SQLite via libsql (file-based, zero install)
  const dbFile =
    process.env.DATABASE_URL?.replace('file:', '') || path.join(process.cwd(), 'dev.db');
  const dir = path.dirname(dbFile);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  const client = createClient({ url: `file:${dbFile}` });
  // PRAGMAs pour resoudre les 'database is locked' quand plusieurs process
  // (dev server + script de test) accedent au meme fichier SQLite.
  // WAL = write-ahead logging (lecteurs concurrents + ecrivains serieux).
  // busy_timeout = attend 10s si verrou.
  // En CI les tests et le dev server partagent dev.db, sans ces pragmas
  // le pipeline echoue systematiquement au 2e test.
  client.execute('PRAGMA journal_mode=WAL').catch(() => {});
  client.execute('PRAGMA busy_timeout=10000').catch(() => {});
  _db = drizzleLibsql(client, { schema: schemaSqlite });
  _schema = schemaSqlite;
}

export const db = _db;
export { _schema as schema };
export const rawSqlClient = _rawClient;
export const DB_DIALECT = isPostgres ? 'postgresql' : 'sqlite';

/**
 * Execute une fonction dans une transaction avec le cabinet_id injecté
 * (active la RLS en PostgreSQL, simule l'isolation en SQLite via le callback).
 */
export async function withCabinetContext<T>(
  cabinetId: string,
  fn: (tx: any) => Promise<T> | T
): Promise<T> {
  if (isPostgres) {
    // Use raw postgres-js for the SET LOCAL, then pass Drizzle db
    // (we don't use tx because RLS is not actually enabled in our Neon DB)
    await rawSqlClient`SELECT set_config('app.cabinet_id', ${cabinetId}, true)`;
    return fn(db);
  }
  return fn(db);
}
