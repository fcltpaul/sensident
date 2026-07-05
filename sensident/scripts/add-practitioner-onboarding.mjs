import { drizzle } from 'drizzle-orm/neon-http';
import { neon } from '@neondatabase/serverless';

const DATABASE_URL =
  process.env.DATABASE_URL ||
  'postgresql://neondb_owner:npg_VIyg5MNw7CDe@ep-square-field-aszhdyyu-pooler.c-4.eu-central-1.aws.neon.tech/neondb?sslmode=require';

const sql = neon(DATABASE_URL);
const _db = drizzle(sql);

async function main() {
  // Idempotent : IF NOT EXISTS
  await sql`ALTER TABLE practitioners ADD COLUMN IF NOT EXISTS onboarding_completed_at timestamptz`;
  const rows = await sql`
    SELECT column_name, data_type, is_nullable
    FROM information_schema.columns
    WHERE table_name = 'practitioners' AND column_name = 'onboarding_completed_at'
  `;
  console.log('Result:', JSON.stringify(rows));
  console.log('OK — onboarding_completed_at prêt.');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});