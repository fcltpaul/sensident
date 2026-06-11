import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import postgres from 'postgres';

const envPath = resolve(import.meta.dirname, '..', '.env');
const env = readFileSync(envPath, 'utf-8');
const url = env.split('\n').find(l => l.startsWith('DATABASE_URL='))?.split('=').slice(1).join('=');
if (!url) { console.error('No DATABASE_URL'); process.exit(1); }

const sql = postgres(url, { ssl: 'require' });

await sql.unsafe(`
  CREATE TABLE IF NOT EXISTS cabinet_library_articles (
    id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    cabinet_id        UUID NOT NULL REFERENCES cabinets(id) ON DELETE CASCADE,
    article_id        TEXT NOT NULL REFERENCES articles(slug) ON DELETE CASCADE,
    is_visible        BOOLEAN NOT NULL DEFAULT false,
    is_pinned         BOOLEAN NOT NULL DEFAULT false,
    pin_order         INTEGER NOT NULL DEFAULT 0,
    created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE(cabinet_id, article_id)
  );
`);
console.log('cabinet_library_articles: OK');

await sql.unsafe(`
  CREATE TABLE IF NOT EXISTS patient_reactions (
    id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    article_id        TEXT NOT NULL REFERENCES articles(slug) ON DELETE CASCADE,
    cabinet_id        UUID NOT NULL REFERENCES cabinets(id) ON DELETE CASCADE,
    patient_email_hash TEXT NOT NULL,
    reaction          TEXT NOT NULL CHECK (reaction IN ('up', 'down')),
    created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE(article_id, cabinet_id, patient_email_hash)
  );
`);
console.log('patient_reactions: OK');

await sql.end();
