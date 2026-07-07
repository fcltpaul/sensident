// scripts/_audit-neon-columns.mjs
// Audit cible : colonnes jsonb/timestamp/boolean Neon + usage Drizzle
// qui pourraient crasher silencieusement.

import { neon } from '@neondatabase/serverless';

const url = 'postgresql://neondb_owner:npg_VIyg5MNw7CDe@ep-square-field-aszhdyyu-pooler.c-4.eu-central-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require';
const sql = neon(url);

const allCols = await sql`
  SELECT table_name, column_name, data_type, is_nullable, column_default
  FROM information_schema.columns
  WHERE table_schema = 'public'
  ORDER BY table_name, ordinal_position
`;

const byTable = {};
for (const r of allCols) {
  if (!byTable[r.table_name]) byTable[r.table_name] = [];
  byTable[r.table_name].push(r);
}

console.log('=== Tables avec colonnes jsonb ===');
for (const [t, cols] of Object.entries(byTable)) {
  const jsonb = cols.filter(c => c.data_type === 'jsonb');
  if (jsonb.length) {
    console.log(`  ${t}:`);
    for (const c of jsonb) console.log(`    - ${c.column_name}: ${c.data_type}`);
  }
}

console.log('\n=== Tables avec colonnes uuid ===');
for (const [t, cols] of Object.entries(byTable)) {
  const uuids = cols.filter(c => c.data_type === 'uuid');
  if (uuids.length) {
    console.log(`  ${t}:`);
    for (const c of uuids) console.log(`    - ${c.column_name}: ${c.data_type}`);
  }
}

console.log('\n=== Tables avec colonnes boolean ===');
for (const [t, cols] of Object.entries(byTable)) {
  const bools = cols.filter(c => c.data_type === 'boolean');
  if (bools.length) {
    console.log(`  ${t}:`);
    for (const c of bools) console.log(`    - ${c.column_name}: ${c.data_type} (default: ${c.column_default})`);
  }
}