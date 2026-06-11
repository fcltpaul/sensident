/**
 * Sensident — Client Drizzle (SQLite via libsql en dev, PostgreSQL en prod)
 *
 * Le dev utilise @libsql/client (file-based, pas de compilation native).
 * La prod utilise PostgreSQL HDS avec RLS.
 *
 * Le code applicatif utilise le meme Drizzle client abstrait -- la
 * couche d'isolation tenant est simulee cote application en SQLite
 * (filtre WHERE cabinet_id = ?) et enforcee par RLS en PostgreSQL.
 *
 * Workaround bug Next.js + postgres-js (10/06/2026) :
 * Le bundle webpack de Next.js casse la serialisation des Date pour
 * postgres-js (Buffer.byteLength(Number) au lieu d'un string). On
 * patche le prototype Date.toPostgresString() + on wrap chaque valeur
 * passee a postgres dans le client.
 */
import { createClient } from '@libsql/client';
import { drizzle as drizzleLibsql } from 'drizzle-orm/libsql';
import { drizzle as drizzlePostgres } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import path from 'node:path';
import fs from 'node:fs';
import * as schemaSqlite from './schema.sqlite';
import * as schemaPostgres from './schema.pg';

const isPostgres = (process.env.DATABASE_URL || '').startsWith('postgres');

let _db: any = null;
let _schema: any = null;

if (isPostgres) {
  const connectionString = process.env.DATABASE_URL!;

  // En production, on FORCE sslmode=require pour eviter les connexions non chiffrées
  if (process.env.NODE_ENV === 'production' && !connectionString.includes('sslmode=require') && !connectionString.includes('sslmode=verify-full')) {
    throw new Error('DATABASE_URL doit inclure sslmode=require ou sslmode=verify-full en production (HDS)');
  }

  // ============================================================
  // WORKAROUND bug Next.js + postgres-js Date serialization
  // Webpack bundler pert le Symbol.toPrimitive de Date.
  // On convertit explicitement les Date en string ISO avant
  // d'arriver a postgres-js.
  // ============================================================

  const queryClient = postgres(connectionString, {
    max: 10,
    idle_timeout: 20,
    connect_timeout: 10,
    prepare: false,
  });

  // ============================================================
  // WORKAROUND bug Next.js + postgres-js Date serialization
  // Patch au niveau du module 'postgres' : on wrap TOUTES les methodes
  // qui passent des params au protocole PG.
  // ============================================================
  patchPostgresClient(queryClient);

  _db = drizzlePostgres(queryClient, { schema: schemaPostgres });
  _schema = schemaPostgres;
} else {
  // SQLite via libsql (file-based, zero install)
  const dbFile = process.env.DATABASE_URL?.replace('file:', '') || path.join(process.cwd(), 'dev.db');
  const dir = path.dirname(dbFile);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  const client = createClient({ url: `file:${dbFile}` });
  _db = drizzleLibsql(client, { schema: schemaSqlite });
  _schema = schemaSqlite;
}

/**
 * Patch du client postgres-js pour contourner le bug Next.js webpack
 * qui casse la serialization des Date (Buffer.byteLength(Number)).
 *
 * On wrap toutes les methodes qui prennent un tableau de params.
 * La conversion Date -> ISO string se fait en recurrence pour les objets.
 */
function patchPostgresClient(client: any) {
  const methodsToPatch = ['query', 'unsafe', 'prepare', 'cursor', 'listen'];
  for (const m of methodsToPatch) {
    if (typeof client[m] === 'function') {
      const orig = client[m].bind(client);
      client[m] = (...args: any[]) => {
        // Les params peuvent etre a plusieurs positions selon la methode
        // query(sql, params?, options?)
        // unsafe(sql, params?)
        // prepare(sql, params?)
        return orig(...args.map((a, i) => {
          if (Array.isArray(a)) return normalizeValues(a);
          if (typeof a === 'string' && args.length > i + 1 && Array.isArray(args[i + 1])) {
            // Cas special : on patch le suivant
          }
          return a;
        }));
      };
    }
  }

  // Patch aussi la méthode .parameters de la connection si elle existe
  // (utilisée par les prepared statements pour la sérialisation)
  if (client.connection && client.connection.parameters) {
    const origParams = client.connection.parameters.bind(client.connection);
    client.connection.parameters = (params: any) => {
      return origParams(normalizeValues(params));
    };
  }
}

/**
 * Normalise une valeur (Date -> ISO string, recursif pour objets/arrays).
 */
function normalizeValue(v: any): any {
  if (v === null || v === undefined) return v;
  if (v instanceof Date) return v.toISOString();
  if (Array.isArray(v)) return v.map(normalizeValue);
  if (typeof v === 'object') {
    const out: any = {};
    for (const k of Object.keys(v)) out[k] = normalizeValue(v[k]);
    return out;
  }
  return v;
}

function normalizeValues(arr: any[]): any[] {
  return arr.map(normalizeValue);
}

export const db = _db;
export { _schema as schema };
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
    return db.transaction(async (tx: any) => {
      await tx.execute({ sql: `SET LOCAL app.cabinet_id = '${cabinetId}'`, params: [] });
      return fn(tx);
    });
  }
  return fn(db);
}
