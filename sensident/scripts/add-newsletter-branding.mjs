import { drizzle } from 'drizzle-orm/neon-http';
import { neon } from '@neondatabase/serverless';

const DATABASE_URL = 'postgresql://neondb_owner:npg_VIyg5MNw7CDe@ep-square-field-aszhdyyu-pooler.c-4.eu-central-1.aws.neon.tech/neondb?sslmode=require';

const sql = neon(DATABASE_URL);
const db = drizzle(sql);

async function main() {
  await sql`ALTER TABLE cabinets ADD COLUMN IF NOT EXISTS newsletter_branding jsonb DEFAULT '{"showLogo":false}'::jsonb`;
  const rows = await sql`SELECT column_name FROM information_schema.columns WHERE table_name='cabinets' AND column_name='newsletter_branding'`;
  console.log('Result:', JSON.stringify(rows));
  console.log('OK');
}

main().catch((e) => console.error(e));
