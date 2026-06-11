import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import postgres from 'postgres';

const envPath = resolve(import.meta.dirname, '..', '.env');
const env = readFileSync(envPath, 'utf-8');
const url = env.split('\n').find(l => l.startsWith('DATABASE_URL='))?.split('=').slice(1).join('=');
if (!url) { console.error('No DATABASE_URL'); process.exit(1); }

const sql = postgres(url, { ssl: 'require' });

console.log('Dropping old articles table...');
await sql.unsafe('DROP TABLE IF EXISTS articles CASCADE');

console.log('Creating articles table (schema.pg.ts compatible)...');
await sql.unsafe(`
  CREATE TABLE articles (
    slug              TEXT PRIMARY KEY,
    title             TEXT NOT NULL,
    excerpt           TEXT NOT NULL,
    category          TEXT NOT NULL,
    body_md           TEXT NOT NULL,
    slides_json       JSONB NOT NULL,
    reading_time_min  INTEGER NOT NULL,
    status            TEXT NOT NULL DEFAULT 'draft',
    validated_by      UUID,
    validated_at      TIMESTAMPTZ,
    next_review_at    TIMESTAMPTZ,
    created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at        TIMESTAMPTZ NOT NULL DEFAULT now()
  )
`);

console.log('articles table recreated.');
await sql.end();
