import { neon } from '@neondatabase/serverless';
const sql = neon('postgresql://neondb_owner:npg_VIyg5MNw7CDe@ep-square-field-aszhdyyu-pooler.c-4.eu-central-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require');

console.log('=== patient_consents schema Neon ===');
const cols = await sql`SELECT column_name, data_type, is_nullable, column_default FROM information_schema.columns WHERE table_name = 'patient_consents' ORDER BY ordinal_position`;
console.table(cols);