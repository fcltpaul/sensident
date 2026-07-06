import postgres from 'postgres';
import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
for (const p of ['.env', '.env.local']) {
  const full = join(process.cwd(), p);
  if (existsSync(full)) {
    for (const line of readFileSync(full, 'utf-8').split('\n')) {
      const m = line.match(/^([A-Z_][A-Z0-9_]*)\s*=\s*(.*)$/);
      if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^["']|["']$/g, '');
    }
  }
}
const sql = postgres(process.env.DATABASE_URL, { ssl: 'require' });
const check = await sql`SELECT EXISTS (SELECT FROM information_schema.tables WHERE table_schema='public' AND table_name='password_reset_tokens') AS exists`;
if (check[0].exists) {
  console.log('Table password_reset_tokens existe deja.');
  await sql.end();
  process.exit(0);
}
await sql.unsafe(`
  CREATE TABLE password_reset_tokens (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    practitioner_id TEXT NOT NULL REFERENCES practitioners(id) ON DELETE CASCADE,
    token_hash      TEXT NOT NULL,
    expires_at      TIMESTAMPTZ NOT NULL,
    used_at         TIMESTAMPTZ,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
  );
  CREATE INDEX password_reset_tokens_practitioner_idx ON password_reset_tokens (practitioner_id, created_at);
`);
console.log('Table password_reset_tokens creee.');
await sql.end();
