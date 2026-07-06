/**
 * Migration idempotente : ajoute la table `email_logs` a la base Neon.
 *
 * Usage :
 *   node scripts/add-email-logs-table.mjs
 *
 * Verifie l'existence de la table avant de creer. Safe a relancer.
 */

import postgres from 'postgres';
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

const envPaths = ['.env', '.env.local', '.env.production'];
for (const p of envPaths) {
  const fullPath = join(process.cwd(), p);
  if (existsSync(fullPath)) {
    const content = readFileSync(fullPath, 'utf-8');
    for (const line of content.split('\n')) {
      const m = line.match(/^([A-Z_][A-Z0-9_]*)\s*=\s*(.*)$/);
      if (m && !process.env[m[1]]) {
        process.env[m[1]] = m[2].replace(/^["']|["']$/g, '');
      }
    }
    console.log(`Loaded env from ${p}`);
  }
}

const url = process.env.DATABASE_URL;
if (!url) {
  console.error('DATABASE_URL non defini. Abandon.');
  process.exit(1);
}

const sql = postgres(url, { ssl: 'require' });

const rows = await sql`
  SELECT EXISTS (
    SELECT FROM information_schema.tables
    WHERE table_schema = 'public'
    AND table_name = 'email_logs'
  ) AS exists
`;

if (rows[0].exists) {
  console.log('Table email_logs existe deja. Aucune action.');
  await sql.end();
  process.exit(0);
}

await sql.unsafe(`
  CREATE TABLE email_logs (
    id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    kind                  TEXT NOT NULL,
    to_hash               TEXT NOT NULL,
    subject               TEXT NOT NULL,
    success               BOOLEAN NOT NULL,
    error                 TEXT,
    provider              TEXT NOT NULL,
    provider_message_id   TEXT,
    cabinet_id            TEXT REFERENCES cabinets(id) ON DELETE SET NULL,
    metadata              TEXT,
    created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW()
  );

  CREATE INDEX email_logs_kind_idx ON email_logs (kind, created_at);
  CREATE INDEX email_logs_to_hash_idx ON email_logs (to_hash, created_at);
  CREATE INDEX email_logs_success_idx ON email_logs (success, created_at);
`);

console.log('Table email_logs creee avec succes.');

await sql.end();
