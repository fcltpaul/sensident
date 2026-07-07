import { neon } from '@neondatabase/serverless';
const sql = neon('postgresql://neondb_owner:npg_VIyg5MNw7CDe@ep-square-field-aszhdyyu-pooler.c-4.eu-central-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require');

console.log('=== invite_tokens schema ===');
const cols = await sql`SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'invite_tokens' ORDER BY ordinal_position`;
console.log(cols);

console.log('\n=== Sample data ===');
const data = await sql`SELECT id, cabinet_id, token_hash, expires_at, revoked_at FROM invite_tokens LIMIT 5`;
console.log(data);