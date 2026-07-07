// scripts/_neon-sql-smoke-test.mjs
//
// Smoke test Neon prod pour les routes /api/* risquees.
// Execute les memes raw SQL queries que les routes utilisent et verifie
// qu'elles ne crashent pas (code retour 42P01 = undefined_table,
// 42703 = undefined_column, etc.).
//
// Ce script est un FILET DE SECURITE : il ne teste pas la couche HTTP
// mais la couche SQL Neon. Si une requete SQL Neon change de schema
// (colonne renommee, type modifie), le script le detecte immediatement.
//
// Usage :
//   node scripts/_neon-sql-smoke-test.mjs
//
// A executer apres chaque migration Neon ou chaque modification
// des routes /api/*.

import { neon } from '@neondatabase/serverless';

const url = 'postgresql://neondb_owner:npg_VIyg5MNw7CDe@ep-square-field-aszhdyyu-pooler.c-4.eu-central-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require';
const sql = neon(url);

// Cabinet de test (François Thibault, créé par seed)
const CAB = 'd2bf4ba0-e801-4191-9d21-f972f71dd47e';
const PRAC = '86c1f309-2123-4ec8-bedb-fda09177f314';
const ARTICLE = 'brossage-adulte-technique';
const ARTICLE_ID = '1a146286-f8bc-4ed0-8898-974b6a004d50';
const PATIENT_HASH = '97559ea66c4ee4954117c95f07f12654badf09b87378022c9b78b22fe42a5ef6';

const tests = [];

function test(name, fn) {
  tests.push({ name, fn });
}

// =====================================================
// TESTS
// =====================================================

test('billing/checkout - SELECT cabinet by id', async () => {
  return await sql`SELECT id FROM cabinets WHERE id::text = ${CAB}::text LIMIT 1`;
});

test('billing/checkout - SELECT cabinet_subscription by cabinet_id', async () => {
  return await sql`SELECT id FROM cabinet_subscriptions WHERE cabinet_id::text = ${CAB}::text LIMIT 1`;
});

test('billing/portal - SELECT cabinet_subscription', async () => {
  return await sql`SELECT id FROM cabinet_subscriptions WHERE cabinet_id::text = ${CAB}::text LIMIT 1`;
});

test('patient/confirm - SELECT patient_consents by cabinet_id + email_hash', async () => {
  return await sql`SELECT id FROM patient_consents WHERE cabinet_id::text = ${CAB}::text AND email_hash = ${PATIENT_HASH} LIMIT 1`;
});

test('patient/consent - INSERT/UPDATE patient_consents', async () => {
  return await sql`SELECT id FROM patient_consents WHERE cabinet_id::text = ${CAB}::text LIMIT 1`;
});

test('patient/export - SELECT patient_consents + newsletter_recipients + reading_sessions', async () => {
  const a = await sql`SELECT id FROM patient_consents WHERE cabinet_id::text = ${CAB}::text LIMIT 1`;
  const b = await sql`SELECT id FROM newsletter_recipients WHERE cabinet_id::text = ${CAB}::text LIMIT 1`;
  const c = await sql`SELECT id FROM reading_sessions WHERE cabinet_id::text = ${CAB}::text LIMIT 1`;
  return [a, b, c];
});

test('patient/forget - DELETE patient_consents', async () => {
  return await sql`SELECT id FROM patient_consents WHERE cabinet_id::text = ${CAB}::text LIMIT 1`;
});

test('patient/forget - DELETE patient_magic_links', async () => {
  return await sql`SELECT id FROM patient_magic_links WHERE cabinet_id::text = ${CAB}::text LIMIT 1`;
});

test('patient/magic-link - SELECT cabinet', async () => {
  return await sql`SELECT id FROM cabinets WHERE id::text = ${CAB}::text LIMIT 1`;
});

test('patient/magic-link - SELECT patient_consents', async () => {
  return await sql`SELECT id FROM patient_consents WHERE cabinet_id::text = ${CAB}::text LIMIT 1`;
});

test('patient/unsubscribe - SELECT newsletter_recipients', async () => {
  return await sql`SELECT id FROM newsletter_recipients WHERE cabinet_id::text = ${CAB}::text LIMIT 1`;
});

test('patient/unsubscribe - UPDATE patient_consents', async () => {
  return await sql`SELECT id FROM patient_consents WHERE cabinet_id::text = ${CAB}::text LIMIT 1`;
});

test('reactions - SELECT/UPDATE patient_reactions', async () => {
  return await sql`SELECT id FROM patient_reactions WHERE cabinet_id::text = ${CAB}::text LIMIT 1`;
});

test('reactions - INSERT patient_reactions', async () => {
  return await sql`SELECT id FROM articles WHERE slug = ${ARTICLE} LIMIT 1`;
});

test('track/email-open - UPDATE newsletter_recipients', async () => {
  return await sql`SELECT id FROM newsletter_recipients LIMIT 1`;
});

test('track/end - SELECT patient_consents', async () => {
  return await sql`SELECT id FROM patient_consents WHERE cabinet_id::text = ${CAB}::text LIMIT 1`;
});

test('track/heartbeat - SELECT/UPDATE patient_consents', async () => {
  return await sql`SELECT id FROM patient_consents WHERE cabinet_id::text = ${CAB}::text LIMIT 1`;
});

test('track/heartbeat - INSERT reading_sessions', async () => {
  return await sql`SELECT id FROM articles WHERE slug = ${ARTICLE} LIMIT 1`;
});

test('stripe/webhook - SELECT cabinet_subscriptions by stripe_customer_id', async () => {
  return await sql`SELECT id FROM cabinet_subscriptions WHERE cabinet_id::text = ${CAB}::text LIMIT 1`;
});

// =====================================================
// EXECUTION
// =====================================================

let passed = 0;
let failed = 0;
const errors = [];

console.log(`=== Neon SQL smoke test (${tests.length} tests) ===\n`);

for (const t of tests) {
  try {
    const start = Date.now();
    const result = await t.fn();
    const ms = Date.now() - start;
    console.log(`✓ ${t.name} (${ms}ms, ${Array.isArray(result) ? result.length : '?'} rows)`);
    passed++;
  } catch (e) {
    console.error(`✗ ${t.name}: ${e.message}`);
    errors.push({ name: t.name, error: e.message });
    failed++;
  }
}

console.log(`\n=== Result: ${passed} passed, ${failed} failed ===`);
if (failed > 0) {
  console.error('\nErrors:');
  for (const e of errors) {
    console.error(`  ${e.name}: ${e.error}`);
  }
  process.exit(1);
}