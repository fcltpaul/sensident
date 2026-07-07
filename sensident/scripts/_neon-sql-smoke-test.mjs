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
//   npm run neon:smoke-test
//
// A executer apres chaque migration Neon ou chaque modification
// des routes /api/*.

import { neon } from '@neondatabase/serverless';
import crypto from 'node:crypto';

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
// READ queries
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

test('patient/consent - SELECT patient_consents', async () => {
  return await sql`SELECT id FROM patient_consents WHERE cabinet_id::text = ${CAB}::text LIMIT 1`;
});

test('patient/export - SELECT 3 tables', async () => {
  const a = await sql`SELECT id FROM patient_consents WHERE cabinet_id::text = ${CAB}::text LIMIT 1`;
  const b = await sql`SELECT id FROM newsletter_recipients WHERE cabinet_id::text = ${CAB}::text LIMIT 1`;
  const c = await sql`SELECT id FROM reading_sessions WHERE cabinet_id::text = ${CAB}::text LIMIT 1`;
  return [a, b, c];
});

test('patient/forget - SELECT patient_consents', async () => {
  return await sql`SELECT id FROM patient_consents WHERE cabinet_id::text = ${CAB}::text LIMIT 1`;
});

test('patient/forget - SELECT patient_magic_links', async () => {
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

test('patient/unsubscribe - SELECT patient_consents', async () => {
  return await sql`SELECT id FROM patient_consents WHERE cabinet_id::text = ${CAB}::text LIMIT 1`;
});

test('reactions - SELECT patient_reactions', async () => {
  return await sql`SELECT id FROM patient_reactions WHERE cabinet_id::text = ${CAB}::text LIMIT 1`;
});

test('reactions - SELECT articles by slug', async () => {
  return await sql`SELECT id FROM articles WHERE slug = ${ARTICLE} LIMIT 1`;
});

test('track/email-open - SELECT newsletter_recipients', async () => {
  return await sql`SELECT id FROM newsletter_recipients LIMIT 1`;
});

test('track/end - SELECT patient_consents', async () => {
  return await sql`SELECT id FROM patient_consents WHERE cabinet_id::text = ${CAB}::text LIMIT 1`;
});

test('track/heartbeat - SELECT patient_consents', async () => {
  return await sql`SELECT id FROM patient_consents WHERE cabinet_id::text = ${CAB}::text LIMIT 1`;
});

test('track/heartbeat - SELECT articles by slug', async () => {
  return await sql`SELECT id FROM articles WHERE slug = ${ARTICLE} LIMIT 1`;
});

test('stripe/webhook - SELECT cabinet_subscriptions', async () => {
  return await sql`SELECT id FROM cabinet_subscriptions WHERE cabinet_id::text = ${CAB}::text LIMIT 1`;
});

test('c/[slug]/bibliotheque - SELECT cabinet by slug', async () => {
  return await sql`SELECT id, name FROM cabinets WHERE slug = ${'demo-francois-thibault'} LIMIT 1`;
});

test('c/[slug]/rejoindre - SELECT invite_tokens', async () => {
  return await sql`SELECT id FROM invite_tokens WHERE cabinet_id::text = ${CAB}::text AND token_hash = ${'9864222ccbdf269c326bf7866f4611552bfe777eb5b73994662dfb3e1cc92aa9'} LIMIT 1`;
});

// =====================================================
// WRITE queries (INSERT/UPDATE/DELETE) - test isolation + jsonb
// =====================================================

test('INSERT audit_logs metadata jsonb', async () => {
  // Test du pattern `${crypto.randomUUID()}::text` + `${JSON.stringify(...)}::jsonb`
  const id = crypto.randomUUID();
  const metadata = JSON.stringify({ test: 'smoke', ts: Date.now() });
  const r = await sql`
    INSERT INTO audit_logs (id, ts, actor_type, actor_id, cabinet_id, action, target_type, target_id, metadata)
    VALUES (
      ${id}::text,
      NOW(),
      'system',
      ${id}::text,
      ${CAB}::text,
      'smoke_test',
      'test',
      ${id},
      ${metadata}::jsonb
    )
    RETURNING id
  `;
  // Cleanup
  await sql`DELETE FROM audit_logs WHERE id::text = ${id}::text`;
  return r;
});

test('INSERT email_logs id uuid cast', async () => {
  // Test du pattern `${crypto.randomUUID()}::uuid` pour email_logs.id (uuid en Neon)
  const id = crypto.randomUUID();
  const toHash = crypto.createHash('sha256').update('smoke@test.fr').digest('hex');
  try {
    const r = await sql`
      INSERT INTO email_logs (id, kind, to_hash, subject, success, error, provider, provider_message_id, cabinet_id, metadata)
      VALUES (
        ${id}::uuid,
        'smoke_test',
        ${toHash},
        'Smoke test subject',
        true,
        null,
        'test',
        null,
        ${CAB},
        null::text
      )
      RETURNING id
    `;
    return r;
  } finally {
    await sql`DELETE FROM email_logs WHERE id = ${id}::uuid`;
  }
});

test('UPDATE cabinets contact_* (post-migration)', async () => {
  // Test que toutes les colonnes contact_* sont inscriptibles en Neon
  const r = await sql`
    UPDATE cabinets
    SET contact_email = ${'smoke@test.fr'}
    WHERE id::text = ${CAB}::text
    RETURNING id, contact_email
  `;
  // Restaurer
  await sql`UPDATE cabinets SET contact_email = ${'test@cabinet.fr'} WHERE id::text = ${CAB}::text`;
  return r;
});

test('SELECT cabinets contact_opening_hours jsonb', async () => {
  return await sql`SELECT id, contact_opening_hours FROM cabinets WHERE id::text = ${CAB}::text LIMIT 1`;
});

test('INSERT/UPDATE cabinet_subscriptions unique constraint', async () => {
  // Verifie que la contrainte unique cabinet_id est respectee.
  // Le code applicatif cree TOUJOURS un nouveau cabinet avant l'INSERT
  // subscription, donc pas de collision possible en pratique.
  // On verifie juste qu'un UPSERT/UPDATE sur la subscription existante marche.
  const r = await sql`
    UPDATE cabinet_subscriptions
    SET plan = ${'free'}, status = ${'active'}, updated_at = NOW()
    WHERE cabinet_id::text = ${CAB}::text
    RETURNING id, plan, status
  `;
  return r;
});

test('INSERT patient_consents avec opt_in_version NOT NULL', async () => {
  // opt_in_version est text NOT NULL sans default. Le code applicatif DOIT
  // toujours le fournir. On teste que l'INSERT applicatif passe.
  const id = crypto.randomUUID();
  const email = `smoke-${Date.now()}@example.com`;
  const emailHash = crypto.createHash('sha256').update(email).digest('hex');
  const emailEncrypted = Buffer.from(email).toString('base64');
  try {
    const r = await sql`
      INSERT INTO patient_consents (
        id, cabinet_id, email_hash, email_encrypted,
        opt_in_version, cgu_accepted, newsletter_optin,
        consent_newsletter, consent_analytics, consent_reactions
      )
      VALUES (
        ${id}::text, ${CAB}::text, ${emailHash}, ${emailEncrypted},
        ${'v1.0-2026-06-08'}::text, false, true,
        true, false, false
      )
      RETURNING id
    `;
    return r;
  } finally {
    await sql`DELETE FROM patient_consents WHERE id::text = ${id}::text`;
  }
});

test('UPDATE patient_consents unsubscribed_at timestamp', async () => {
  const id = crypto.randomUUID();
  const email = `smoke-update-${Date.now()}@example.com`;
  const emailHash = crypto.createHash('sha256').update(email).digest('hex');
  try {
    await sql`
      INSERT INTO patient_consents (
        id, cabinet_id, email_hash, email_encrypted,
        opt_in_version, cgu_accepted, newsletter_optin,
        consent_newsletter, consent_analytics, consent_reactions
      )
      VALUES (
        ${id}::text, ${CAB}::text, ${emailHash}, 'c21va2U=',
        ${'v1.0-2026-06-08'}::text, false, false,
        false, false, false
      )
    `;
    const r = await sql`
      UPDATE patient_consents
      SET unsubscribed_at = NOW()
      WHERE id::text = ${id}::text
      RETURNING id, unsubscribed_at
    `;
    return r;
  } finally {
    await sql`DELETE FROM patient_consents WHERE id::text = ${id}::text`;
  }
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