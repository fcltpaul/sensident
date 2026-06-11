/**
 * Sensident — Migration : colonnes consentement granulaire + table consent_log
 *
 * Usage : node scripts/add-consent-tables.mjs
 *
 * Safe : utilise ALTER TABLE ADD COLUMN IF NOT EXISTS / CREATE TABLE IF NOT EXISTS
 */
import { neon } from '@neondatabase/serverless';

const DATABASE_URL =
  process.env.NEON_URL ||
  'postgresql://neondb_owner:npg_VIyg5MNw7CDe@ep-square-field-aszhdyyu-pooler.c-4.eu-central-1.aws.neon.tech/neondb?sslmode=require';

const sql = neon(DATABASE_URL);

async function main() {
  console.log('=== Sensident — Migration consentement granulaire ===\n');

  // 1. Ajouter les colonnes consent_* dans patient_consents
  console.log('[1/7] Ajout colonne consent_newsletter...');
  await sql`ALTER TABLE patient_consents ADD COLUMN IF NOT EXISTS consent_newsletter BOOLEAN DEFAULT false`;
  console.log('  ✓ OK');

  console.log('[2/7] Ajout colonne consent_analytics...');
  await sql`ALTER TABLE patient_consents ADD COLUMN IF NOT EXISTS consent_analytics BOOLEAN DEFAULT false`;
  console.log('  ✓ OK');

  console.log('[3/7] Ajout colonne consent_reactions...');
  await sql`ALTER TABLE patient_consents ADD COLUMN IF NOT EXISTS consent_reactions BOOLEAN DEFAULT false`;
  console.log('  ✓ OK');

  console.log('[4/7] Ajout colonne consent_version...');
  await sql`ALTER TABLE patient_consents ADD COLUMN IF NOT EXISTS consent_version TEXT DEFAULT '1.0'`;
  console.log('  ✓ OK');

  console.log('[5/7] Ajout colonne consent_timestamp...');
  await sql`ALTER TABLE patient_consents ADD COLUMN IF NOT EXISTS consent_timestamp TIMESTAMP WITH TIME ZONE`;
  console.log('  ✓ OK');

  // 2. Creer la table consent_log
  console.log('[6/7] Creation table consent_log...');
  await sql`
    CREATE TABLE IF NOT EXISTS consent_log (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      patient_id UUID NOT NULL REFERENCES patient_consents(id) ON DELETE CASCADE,
      cabinet_id UUID NOT NULL REFERENCES cabinets(id) ON DELETE CASCADE,
      finalite TEXT NOT NULL,
      consenti BOOLEAN NOT NULL DEFAULT false,
      version TEXT NOT NULL DEFAULT '1.0',
      timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
      source TEXT NOT NULL DEFAULT 'onboarding'
    )
  `;
  console.log('  ✓ OK');

  // 3. Creer l'index
  console.log('[7/7] Creation index idx_consent_log_patient_finalite...');
  await sql`
    CREATE INDEX IF NOT EXISTS idx_consent_log_patient_finalite
    ON consent_log (patient_id, finalite)
  `;
  console.log('  ✓ OK');

  // 4. Verifier les colonnes
  console.log('\n--- Verification colonnes patient_consents ---');
  const cols = await sql`
    SELECT column_name, data_type, column_default
    FROM information_schema.columns
    WHERE table_name = 'patient_consents'
      AND column_name IN ('consent_newsletter', 'consent_analytics', 'consent_reactions', 'consent_version', 'consent_timestamp')
    ORDER BY column_name
  `;
  console.table(cols);

  // 5. Verifier la table consent_log
  console.log('\n--- Verification table consent_log ---');
  const tables = await sql`
    SELECT table_name
    FROM information_schema.tables
    WHERE table_name = 'consent_log'
  `;
  console.log(`Table consent_log existe : ${tables.length > 0 ? '✓' : '✗'}`);

  console.log('\n=== Migration terminee avec succes ===');
}

main().catch((e) => {
  console.error('Erreur lors de la migration :', e);
  process.exit(1);
});
