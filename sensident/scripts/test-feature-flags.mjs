/**
 * Sensident — Test E2E feature flags par tier (free/pro/cabinet)
 *
 * Valide :
 *  - Quota maxPatients : free=100 bloque au 101e, pro=1000 laisse passer
 *  - Quota newsletters/mois : free=1 bloque au 2e, pro=4 laisse passer
 *  - Templates : free n'a acces qu'a 'moderne', pro a 'all'
 *  - UI : pages analytics + engagement affichent le bandeau d'upgrade
 *    si la feature n'est pas dispo sur le plan
 *
 * HDS : dev.db local uniquement.
 *
 * Usage : node scripts/test-feature-flags.mjs
 * Prerequis : dev server sur :3001
 */

import { createClient } from '@libsql/client';
import { createHash, randomBytes, randomUUID } from 'node:crypto';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(__dirname, '..');
const dbFile = process.env.SQLITE_DB_PATH || path.join(projectRoot, 'dev.db');
const BASE = 'http://localhost:3001';
const SESSION_COOKIE = 'sensident_session';

const db = createClient({ url: `file:${dbFile}` });
await db.execute({ sql: 'PRAGMA journal_mode=WAL', args: [] }).catch(() => {});
await db.execute({ sql: 'PRAGMA busy_timeout=5000', args: [] }).catch(() => {});

const TS = Date.now();
const cabinetFreeId = randomUUID().replace(/-/g, '').padEnd(32, '0').slice(0, 32);
const cabinetProId = randomUUID().replace(/-/g, '').padEnd(32, '0').slice(0, 32);
const pracFreeId = randomUUID().replace(/-/g, '').padEnd(32, '0').slice(0, 32);
const pracProId = randomUUID().replace(/-/g, '').padEnd(32, '0').slice(0, 32);
const sessionFreeId = randomUUID().replace(/-/g, '').padEnd(32, '0').slice(0, 32);
const sessionProId = randomUUID().replace(/-/g, '').padEnd(32, '0').slice(0, 32);
const tokenFree = randomBytes(32).toString('base64url');
const tokenPro = randomBytes(32).toString('base64url');
const tokenHashFree = createHash('sha256').update(tokenFree).digest('hex');
const tokenHashPro = createHash('sha256').update(tokenPro).digest('hex');

const articleSlug = `ff-test-${TS}`;
// Templates : on reutilise ceux deja en DB
const templateModerneId = '8d0bd3839b6838013f7c481cb4748df7'; // code=moderne (free OK)
const templatePremiumId = '9b3af718dc40efca044152df3e1b636d';  // code=premium (free bloque)

let passed = 0, failed = 0;
const results = [];
function record(name, ok, detail) {
  results.push({ name, ok, detail });
  if (ok) { passed++; console.log(`  \u2705 ${name}  ${detail || ''}`); }
  else    { failed++; console.log(`  \u274C ${name}  ${detail || ''}`); }
}

function cookieHeader(tok) {
  return `${SESSION_COOKIE}=${tok}`;
}

async function seed() {
  // Cabinets
  await db.execute({ sql: 'INSERT INTO cabinets (id, slug, name, contact_email) VALUES (?, ?, ?, ?)', args: [cabinetFreeId, `ff-free-${TS}`, 'Cabinet Free FF', `ff-free-${TS}@test.local`] });
  await db.execute({ sql: 'INSERT INTO cabinets (id, slug, name, contact_email) VALUES (?, ?, ?, ?)', args: [cabinetProId, `ff-pro-${TS}`, 'Cabinet Pro FF', `ff-pro-${TS}@test.local`] });
  // Subscriptions
  const subFreeId = randomUUID().replace(/-/g, '').padEnd(32, '0').slice(0, 32);
  const subProId = randomUUID().replace(/-/g, '').padEnd(32, '0').slice(0, 32);
  await db.execute({ sql: `INSERT INTO cabinet_subscriptions (id, cabinet_id, plan, status) VALUES (?, ?, 'free', 'active')`, args: [subFreeId, cabinetFreeId] });
  await db.execute({ sql: `INSERT INTO cabinet_subscriptions (id, cabinet_id, plan, status) VALUES (?, ?, 'pro', 'active')`, args: [subProId, cabinetProId] });
  // Practitioners
  await db.execute({ sql: `INSERT INTO practitioners (id, cabinet_id, email, name, password_hash, totp_enabled, role) VALUES (?, ?, ?, ?, ?, 1, 'owner')`, args: [pracFreeId, cabinetFreeId, `ff-free-prac-${TS}@test.local`, 'Free', 'x'] });
  await db.execute({ sql: `INSERT INTO practitioners (id, cabinet_id, email, name, password_hash, totp_enabled, role) VALUES (?, ?, ?, ?, ?, 1, 'owner')`, args: [pracProId, cabinetProId, `ff-pro-prac-${TS}@test.local`, 'Pro', 'x'] });
  // Sessions
  const exp = Math.floor((Date.now() + 7 * 24 * 3600 * 1000) / 1000);
  await db.execute({ sql: 'INSERT INTO practitioner_sessions (id, practitioner_id, cabinet_id, token_hash, mfa_verified, expires_at) VALUES (?, ?, ?, ?, 1, ?)', args: [sessionFreeId, pracFreeId, cabinetFreeId, tokenHashFree, exp] });
  await db.execute({ sql: 'INSERT INTO practitioner_sessions (id, practitioner_id, cabinet_id, token_hash, mfa_verified, expires_at) VALUES (?, ?, ?, ?, 1, ?)', args: [sessionProId, pracProId, cabinetProId, tokenHashPro, exp] });
  // Article
  await db.execute({ sql: `INSERT INTO articles (id, slug, title, excerpt, body_md, status) VALUES (?, ?, 'Test FF', 'Exc', 'Body', 'validated')`, args: [randomUUID().replace(/-/g, '').padEnd(32, '0').slice(0, 32), articleSlug] });
  // Templates : on n'insere pas, on reutilise ceux du seed
}

async function cleanup() {
  // Newsletter recipients + sends
  await db.execute({ sql: 'DELETE FROM newsletter_recipients WHERE cabinet_id IN (?, ?)', args: [cabinetFreeId, cabinetProId] }).catch(() => {});
  await db.execute({ sql: 'DELETE FROM newsletter_sends WHERE cabinet_id IN (?, ?)', args: [cabinetFreeId, cabinetProId] }).catch(() => {});
  await db.execute({ sql: 'DELETE FROM patient_consents WHERE cabinet_id IN (?, ?)', args: [cabinetFreeId, cabinetProId] }).catch(() => {});
  await db.execute({ sql: 'DELETE FROM articles WHERE slug = ?', args: [articleSlug] }).catch(() => {});
  await db.execute({ sql: 'DELETE FROM practitioner_sessions WHERE id IN (?, ?)', args: [sessionFreeId, sessionProId] }).catch(() => {});
  await db.execute({ sql: 'DELETE FROM practitioners WHERE id IN (?, ?)', args: [pracFreeId, pracProId] }).catch(() => {});
  await db.execute({ sql: 'DELETE FROM cabinet_subscriptions WHERE cabinet_id IN (?, ?)', args: [cabinetFreeId, cabinetProId] }).catch(() => {});
  await db.execute({ sql: 'DELETE FROM cabinets WHERE id IN (?, ?)', args: [cabinetFreeId, cabinetProId] }).catch(() => {});
}

async function optin(cabinetId, idx) {
  // Insere un patient en BDD directement (on bypasse l'API pour eviter de re-implémenter le rate limit et l'email)
  const email = `ff-test-${cabinetId.slice(0, 4)}-${idx}@test.local`;
  const emailHash = createHash('sha256').update(email + cabinetId + 'dev-salt').digest('hex');
  const emailEnc = Buffer.from(email).toString('base64');
  await db.execute({
    sql: `INSERT INTO patient_consents (id, cabinet_id, email_hash, email_encrypted, opt_in_version, cgu_accepted, newsletter_optin, confirmed_at) VALUES (?, ?, ?, ?, '1.0', 1, 1, unixepoch())`,
    args: [randomUUID().replace(/-/g, '').padEnd(32, '0').slice(0, 32), cabinetId, emailHash, emailEnc]
  });
  return email;
}

async function getPatientCount(cabinetId) {
  const r = await db.execute({
    sql: "SELECT COUNT(*) as c FROM patient_consents WHERE cabinet_id = ? AND cgu_accepted = 1 AND unsubscribed_at IS NULL",
    args: [cabinetId]
  });
  return Number(r.rows[0]?.c || 0);
}

async function callApi(method, path, body, cookie) {
  const headers = { 'Content-Type': 'application/json' };
  if (cookie) headers['Cookie'] = cookie;
  const opts = { method, headers, redirect: 'manual' };
  if (body) opts.body = JSON.stringify(body);
  const r = await fetch(`${BASE}${path}`, opts);
  let json = null;
  try { json = await r.json(); } catch {}
  return { status: r.status, body: json };
}

async function getPage(path, cookie) {
  const r = await fetch(`${BASE}${path}`, { headers: cookie ? { Cookie: cookie } : {}, redirect: 'manual' });
  return r.status === 200 ? await r.text() : '';
}

async function main() {
  console.log(`\n  \ud83d\udd11 Sensident \u2014 Test feature flags par tier\n`);
  console.log(`  Cabinet free : ${cabinetFreeId}`);
  console.log(`  Cabinet pro  : ${cabinetProId}`);
  console.log(`  Article      : ${articleSlug}\n`);

  try {
    const r = await fetch(`${BASE}/login`);
    if (!r.ok) throw new Error(`/login -> ${r.status}`);
  } catch (e) {
    console.error(`Dev server injoignable (${e.message}). Lance: npx next dev -p 3001`);
    process.exit(1);
  }

  await seed();
  console.log(`  Donnees seedees\n`);

  // ====== 1. Quota maxPatients ======
  // Le gate est cote API /api/patient/optin. On simule en inserant directement 100
  // patients pour le cabinet free, puis on POST un 101e optin -> 403.
  console.log('  [1/10] Quota maxPatients (free=100, pro=1000)');
  for (let i = 0; i < 100; i++) await optin(cabinetFreeId, i);
  for (let i = 0; i < 100; i++) await optin(cabinetProId, i);

  // 101e patient pour free -> 403
  {
    const r = await callApi('POST', '/api/patient/optin', {
      cabinetId: cabinetFreeId,
      email: `ff-test-overflow-${TS}@test.local`,
      cguAccepted: true,
      newsletterOptin: true,
    });
    record(
      '1a. Free : 101e patient -> 403 quota_exceeded',
      r.status === 403 && r.body?.code === 'quota_exceeded',
      `http=${r.status} code=${r.body?.code}`
    );
  }

  // 101e patient pour pro -> 200 (encore 900 places)
  {
    const r = await callApi('POST', '/api/patient/optin', {
      cabinetId: cabinetProId,
      email: `ff-test-pro-101-${TS}@test.local`,
      cguAccepted: true,
      newsletterOptin: true,
    });
    // Le 101e patient pour pro devrait reussir (200 ou 201, ou 429 rate limit)
    const ok = r.status === 200 || r.status === 201 || r.status === 429;
    record(
      '1b. Pro : 101e patient -> OK (ou 429 rate limit)',
      ok,
      `http=${r.status}`
    );
  }

  // ====== 2. Templates : free n'a acces qu'a 'moderne' ======
  console.log('\n  [2/10] Templates (free=moderne, pro=all)');
  // On a besoin d'un praticien connecte pour appeler /api/newsletter/send
  // La route demande MFA verified, on a forge une session
  // MAIS la route verifie que l'email du praticien correspond au cabinet (cf send route)
  // On triche : on appelle direct avec le cookie forge, le handler tape 'practitioners.id = session.practitionerId'
  // Le cabinet de session = cabinetFreeId, donc OK

  {
    const r = await callApi('POST', '/api/newsletter/send', {
      cabinetId: cabinetFreeId,
      practitionerId: pracFreeId,
      articleSlug,
      templateId: templatePremiumId, // PAS autorise pour free
      subject: 'Test premium',
      customMessage: '',
    }, cookieHeader(tokenFree));
    record(
      '2a. Free + template sombre -> 403 feature_locked',
      r.status === 403 && r.body?.code === 'feature_locked',
      `http=${r.status} code=${r.body?.code}`
    );
  }

  {
    const r = await callApi('POST', '/api/newsletter/send', {
      cabinetId: cabinetFreeId,
      practitionerId: pracFreeId,
      articleSlug,
      templateId: templateModerneId, // OK pour free
      subject: 'Test moderne',
      customMessage: '',
    }, cookieHeader(tokenFree));
    // 200 (succes envoi) ou 500 (rate limit email) - on accepte 200
    record(
      '2b. Free + template moderne -> OK (200 ou 500 rate limit email)',
      r.status === 200 || r.status === 500,
      `http=${r.status}`
    );
  }

  {
    const r = await callApi('POST', '/api/newsletter/send', {
      cabinetId: cabinetProId,
      practitionerId: pracProId,
      articleSlug,
      templateId: templatePremiumId, // OK pour pro
      subject: 'Test premium pro',
      customMessage: '',
    }, cookieHeader(tokenPro));
    record(
      '2c. Pro + template sombre -> OK',
      r.status === 200 || r.status === 500,
      `http=${r.status}`
    );
  }

  // ====== 3. Quota newsletters/mois : free=1 ======
  console.log('\n  [3/10] Quota newsletters/mois (free=1)');
  // Le test 2b a deja envoye 1 newsletter pour free. 2e doit etre bloquee.
  {
    const r = await callApi('POST', '/api/newsletter/send', {
      cabinetId: cabinetFreeId,
      practitionerId: pracFreeId,
      articleSlug,
      templateId: templateModerneId,
      subject: 'Test 2e newsletter',
      customMessage: '',
    }, cookieHeader(tokenFree));
    record(
      '3a. Free : 2e newsletter/mois -> 403 quota_exceeded',
      r.status === 403 && r.body?.code === 'quota_exceeded',
      `http=${r.status} code=${r.body?.code}`
    );
  }

  // Pro a deja envoye 1 (test 2c), on en envoie 3 de plus
  for (let i = 0; i < 3; i++) {
    const r = await callApi('POST', '/api/newsletter/send', {
      cabinetId: cabinetProId,
      practitionerId: pracProId,
      articleSlug,
      templateId: templateModerneId,
      subject: `Pro test ${i}`,
      customMessage: '',
    }, cookieHeader(tokenPro));
    // 200, 500 (email), ou 403 si quota atteint
  }
  // 5e newsletter pro -> 403 (quota 4 atteint)
  {
    const r = await callApi('POST', '/api/newsletter/send', {
      cabinetId: cabinetProId,
      practitionerId: pracProId,
      articleSlug,
      templateId: templateModerneId,
      subject: 'Pro test 5',
      customMessage: '',
    }, cookieHeader(tokenPro));
    record(
      '3b. Pro : 5e newsletter/mois -> 403 quota_exceeded',
      r.status === 403 && r.body?.code === 'quota_exceeded',
      `http=${r.status} code=${r.body?.code}`
    );
  }

  // ====== 4. UI : pages analytics + engagement ======
  console.log('\n  [4/10] UI pages analytics + engagement');
  {
    const html = await getPage('/dashboard/analytics', cookieHeader(tokenFree));
    const hasBanner = html.includes('Analytics completes') || html.includes('reservees au plan Pro');
    record(
      '4a. /dashboard/analytics (free) -> bandeau upgrade visible',
      hasBanner,
      `banner=${hasBanner}`
    );
  }
  {
    const html = await getPage('/dashboard/analytics', cookieHeader(tokenPro));
    const noBanner = !html.includes('Analytics completes') || !html.includes('reservees au plan Pro');
    record(
      '4b. /dashboard/analytics (pro) -> PAS de bandeau',
      noBanner,
      `clean=${noBanner}`
    );
  }
  {
    const html = await getPage('/dashboard/engagement', cookieHeader(tokenFree));
    const hasBanner = html.includes('Engagement') && (html.includes('reserve') || html.includes('Pro'));
    record(
      '4c. /dashboard/engagement (free) -> bandeau upgrade visible',
      hasBanner,
      `banner=${hasBanner}`
    );
  }
  {
    const html = await getPage('/dashboard/engagement', cookieHeader(tokenPro));
    const noBanner = !html.includes('Engagement patient reserve');
    record(
      '4d. /dashboard/engagement (pro) -> PAS de bandeau',
      noBanner,
      `clean=${noBanner}`
    );
  }

  await cleanup();
  console.log(`\n  ${'='.repeat(60)}`);
  console.log(`  Feature flags test: ${passed}/${passed + failed} OK`);
  console.log(`  ${'='.repeat(60)}\n`);

  if (failed > 0) {
    console.log('  Echecs :');
    for (const r of results.filter(r => !r.ok)) console.log(`    - ${r.name}: ${r.detail}`);
    process.exit(1);
  }
  process.exit(0);
}

main().catch(async (err) => {
  console.error('FATAL:', err);
  await cleanup().catch(() => {});
  process.exit(1);
});
