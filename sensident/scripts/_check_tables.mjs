import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import postgres from 'postgres';

const envPath = resolve(import.meta.dirname, '..', '.env');
const env = readFileSync(envPath, 'utf-8');
const url = env.split('\n').find(l => l.startsWith('DATABASE_URL='))?.split('=').slice(1).join('=');
if (!url) { console.error('No DATABASE_URL'); process.exit(1); }

const sql = postgres(url, { ssl: 'require' });

const tables = await sql.unsafe("SELECT table_name FROM information_schema.tables WHERE table_schema='public' ORDER BY table_name");
console.log('Tables on Neon:');
for (const t of tables) {
  const cnt = await sql.unsafe(`SELECT COUNT(*) as cnt FROM "${t.table_name}"`);
  console.log(`  ${t.table_name} (${cnt[0].cnt} rows)`);
}

await sql.end();
