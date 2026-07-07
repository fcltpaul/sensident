// Sensident — applique la migration cabinets.newsletter_cadence sur Neon prod.
// Idempotent (ADD COLUMN IF NOT EXISTS). Re-applicable sans risque.
import { neon } from '@neondatabase/serverless';
import fs from 'node:fs';
import path from 'node:path';

const url = 'postgresql://neondb_owner:npg_VIyg5MNw7CDe@ep-square-field-aszhdyyu-pooler.c-4.eu-central-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require';
const sql = neon(url);

const migrationPath = path.join(process.cwd(), 'scripts', '_migrate-cabinets-cadence.sql');
const sqlText = fs.readFileSync(migrationPath, 'utf8');

// neon() ne supporte pas les statements multiples séparés par `;` dans une
// seule string. On retire d'abord les commentaires ligne par ligne, puis on
// split sur ';' fin de statement.
const stripped = sqlText
  .split('\n')
  .filter((line) => !line.trim().startsWith('--'))
  .join('\n');
const statements = stripped
  .split(/;\s*(?:\n|$)/)
  .map((s) => s.trim())
  .filter((s) => s.length > 0);

console.log(`[migrate] ${statements.length} statements à appliquer`);

for (const stmt of statements) {
  try {
    // Neon tagged-template refuse les args ; on utilise sql.query() qui accepte une string.
    await sql.query(stmt, []);
    console.log('[migrate] OK:', stmt.slice(0, 80).replace(/\n/g, ' ') + (stmt.length > 80 ? '…' : ''));
  } catch (e) {
    console.error('[migrate] FAIL:', stmt.slice(0, 80).replace(/\n/g, ' '));
    console.error(e.message);
    process.exitCode = 1;
  }
}

// Verif
const cols = await sql`
  SELECT column_name, data_type FROM information_schema.columns
  WHERE table_name = 'cabinets' AND column_name IN ('newsletter_branding', 'newsletter_cadence')
  ORDER BY column_name
`;
console.log('\n[migrate] colonnes après migration :');
for (const c of cols) {
  console.log(`  ${c.column_name} (${c.data_type})`);
}
