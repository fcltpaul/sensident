import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import postgres from 'postgres';

const envPath = resolve(import.meta.dirname, '..', '.env');
const env = readFileSync(envPath, 'utf-8');
const url = env.split('\n').find(l => l.startsWith('DATABASE_URL='))?.split('=').slice(1).join('=');
if (!url) { console.error('No DATABASE_URL'); process.exit(1); }

const sql = postgres(url, { ssl: 'require' });

// Check tables
const tables = await sql.unsafe("SELECT table_name FROM information_schema.tables WHERE table_schema='public' ORDER BY table_name");
for (const t of tables) {
  const cols = await sql.unsafe(`SELECT column_name FROM information_schema.columns WHERE table_name='${t.table_name}'`);
  console.log(`${t.table_name} (${cols.length} cols)`);
}
await sql.end();
