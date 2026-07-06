import postgres from 'postgres';
import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';

// Charge .env a la main
for (const p of ['.env', '.env.local']) {
  const full = join(process.cwd(), p);
  if (existsSync(full)) {
    for (const line of readFileSync(full, 'utf-8').split('\n')) {
      const m = line.match(/^([A-Z_][A-Z0-9_]*)\s*=\s*(.*)$/);
      if (m && !process.env[m[1]]) {
        process.env[m[1]] = m[2].replace(/^["']|["']$/g, '');
      }
    }
  }
}

const url = process.env.DATABASE_URL;
const sql = postgres(url, { ssl: 'require' });

const cols = await sql`
  SELECT table_name, column_name, data_type
  FROM information_schema.columns
  WHERE table_schema='public'
  AND table_name IN ('cabinets', 'invite_tokens', 'email_logs')
  ORDER BY table_name, ordinal_position
`;
console.log('Existing columns:');
for (const c of cols) {
  console.log(`  ${c.table_name}.${c.column_name} = ${c.data_type}`);
}

await sql.end();
