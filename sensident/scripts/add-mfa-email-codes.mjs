/**
 * Migration idempotente : ajoute la table `mfa_email_codes` a Neon.
 */
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

const check = await sql`
  SELECT EXISTS (
    SELECT FROM information_schema.tables
    WHERE table_schema='public' AND table_name='mfa_email_codes'
  ) AS exists
`;

if (check[0].exists) {
  console.log('Table mfa_email_codes existe deja.');
  await sql.end();
  process.exit(0);
}

await sql.unsafe(`
  CREATE TABLE mfa_email_codes (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    practitioner_id TEXT NOT NULL REFERENCES practitioners(id) ON DELETE CASCADE,
    code_hash       TEXT NOT NULL,
    expires_at      TIMESTAMPTZ NOT NULL,
    used_at         TIMESTAMPTZ,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
  );

  CREATE INDEX mfa_email_codes_practitioner_idx ON mfa_email_codes (practitioner_id, created_at);
`);

console.log('Table mfa_email_codes creee avec succes.');
await sql.end();
