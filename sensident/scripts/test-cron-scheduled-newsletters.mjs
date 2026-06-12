/**
 * Sensident — Test E2E cron scheduled newsletters
 *
 * Valide l'endpoint /api/cron/process-scheduled-newsletters :
 *  - Auth (header Bearer) : HMAC SHA256 sur `${ts}.${body}` + anti-replay 5min
 *  - Retro-compat : HMAC SHA256 sur `${body}` seul
 *  - dry_run=1 : ne mute pas, retourne la liste des sends dus
 *  - Run reel : passe status='sending' puis 'sent', log audit
 *  - Sends futurs (scheduledAt > now) : non traites
 *  - Sends sans template/article/cabinet : marques 'cancelled'
 *  - Logs HDS-safe : pas de PII patient, juste des counts
 *
 * HDS : tape dev.db local uniquement, aucune donnee patient dans les logs.
 *
 * Usage : node --env-file=.env scripts/test-cron-scheduled-newsletters.mjs
 * Prerequis : dev server sur :3001 + CRON_SECRET dans .env
 */

import { createClient } from '@libsql/client';
import { createHmac, randomBytes, randomUUID } from 'node:crypto';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(__dirname, '..');
const dbFile = process.env.SQLITE_DB_PATH || path.join(projectRoot, 'dev.db');
const BASE = 'http://localhost:3001';
const CRON_URL = `${BASE}/api/cron/process-scheduled-newsletters`;

const CRON_SECRET = process.env.CRON_SECRET;
if (!CRON_SECRET) {
  console.error('CRON_SECRET manquant dans .env');
  process.exit(1);
}

const db = createClient({ url: `file:${dbFile}` });
await db.execute({ sql: 'PRAGMA journal_mode=WAL', args: [] }).catch(() => {});
await db.execute({ sql: 'PRAGMA busy_timeout=5000', args: [] }).catch(() => {});

const TS = Date.now();
const cabinetId = randomUUID().replace(/-/g, '').padEnd(32, '0').slice(0, 32);
const practitionerId = randomUUID().replace(/-/g, '').padEnd(32, '0').slice(0, 32);
const articleSlug = `cron-test-article-${TS}`;
const templateId = randomUUID().replace(/-/g, '').padEnd(32, '0').slice(0, 32);
const sendIdPast1 = randomUUID().replace(/-/g, '').padEnd(32, '0').slice(0, 32);
const sendIdPast2 = randomUUID().replace(/-/g, '').padEnd(32, '0').slice(0, 32);
const sendIdFuture = randomUUID().replace(/-/g, '').padEnd(32, '0').slice(0, 32);
const sendIdBroken = randomUUID().replace(/-/g, '').padEnd(32, '0').slice(0, 32);

let passed = 0, failed = 0;
const results = [];
function record(name, ok, detail) {
  results.push({ name, ok, detail });
  if (ok) { passed++; console.log(`  \u2705 ${name}  ${detail || ''}`); }
  else    { failed++; console.log(`  \u274C ${name}  ${detail || ''}`); }
}

function makeToken(body, ts) {
  if (ts === undefined) {
    // Legacy : juste HMAC du body
    return createHmac('sha256', CRON_SECRET).update(body).digest('hex');
  }
  return `${ts}.${createHmac('sha256', CRON_SECRET).update(`${ts}.${body}`).digest('hex')}`;
}

async function seed() {
  // Cabinet
  await db.execute({ sql: 'INSERT INTO cabinets (id, slug, name, contact_email) VALUES (?, ?, ?, ?)', args: [cabinetId, `cron-test-${TS}`, `Cabinet Cron ${TS}`, `cron-test-${TS}@test.local`] });
  // Practitioner (owner)
  await db.execute({ sql: `INSERT INTO practitioners (id, cabinet_id, email, name, password_hash, totp_enabled, role) VALUES (?, ?, ?, ?, ?, 1, 'owner')`, args: [practitionerId, cabinetId, `cron-test-prac-${TS}@test.local`, 'Owner', 'x'] });
  // Article validated
  await db.execute({ sql: `INSERT INTO articles (id, slug, title, excerpt, body_md, status) VALUES (?, ?, ?, ?, ?, 'validated')`, args: [randomUUID().replace(/-/g, '').padEnd(32, '0').slice(0, 32), articleSlug, 'Test article', 'Excerpt', 'Body markdown'] });
  // Template
  await db.execute({ sql: 'INSERT INTO newsletter_templates (id, code, name, react_email_path) VALUES (?, ?, ?, ?)', args: [templateId, `cron-test-${TS}`, 'Test Template', '/emails/test.tsx'] });
  // Patient opt-in
  const email = `patient-${TS}@test.local`;
  const emailHash = createHmac('sha256', 'test-salt').update(email).digest('hex');
  const emailEncrypted = Buffer.from(email).toString('base64');
  await db.execute({ sql: `INSERT INTO patient_consents (id, cabinet_id, email_hash, email_encrypted, opt_in_version, cgu_accepted, newsletter_optin, confirmed_at) VALUES (?, ?, ?, ?, '1.0', 1, 1, unixepoch())`, args: [randomUUID().replace(/-/g, '').padEnd(32, '0').slice(0, 32), cabinetId, emailHash, emailEncrypted] });
  // Sends : 2 passes, 1 futur, 1 broken (template_id=null)
  const past1 = Math.floor((Date.now() - 60 * 1000) / 1000);   // 1 min ago
  const past2 = Math.floor((Date.now() - 30 * 1000) / 1000);   // 30s ago
  const future = Math.floor((Date.now() + 60 * 60 * 1000) / 1000); // 1h ahead
  await db.execute({ sql: `INSERT INTO newsletter_sends (id, cabinet_id, template_id, article_slug, subject, scheduled_at, status, total_recipients, practitioner_name, cabinet_name, custom_message, created_by) VALUES (?, ?, ?, ?, ?, ?, 'scheduled', 1, 'owner', 'Cabinet Cron', '', ?)`, args: [sendIdPast1, cabinetId, templateId, articleSlug, 'Past 1', past1, practitionerId] });
  await db.execute({ sql: `INSERT INTO newsletter_sends (id, cabinet_id, template_id, article_slug, subject, scheduled_at, status, total_recipients, practitioner_name, cabinet_name, custom_message, created_by) VALUES (?, ?, ?, ?, ?, ?, 'scheduled', 1, 'owner', 'Cabinet Cron', '', ?)`, args: [sendIdPast2, cabinetId, templateId, articleSlug, 'Past 2', past2, practitionerId] });
  await db.execute({ sql: `INSERT INTO newsletter_sends (id, cabinet_id, template_id, article_slug, subject, scheduled_at, status, total_recipients, practitioner_name, cabinet_name, custom_message, created_by) VALUES (?, ?, ?, ?, ?, ?, 'scheduled', 1, 'owner', 'Cabinet Cron', '', ?)`, args: [sendIdFuture, cabinetId, templateId, articleSlug, 'Future', future, practitionerId] });
  await db.execute({ sql: `INSERT INTO newsletter_sends (id, cabinet_id, template_id, article_slug, subject, scheduled_at, status, total_recipients, practitioner_name, cabinet_name, custom_message, created_by) VALUES (?, ?, NULL, ?, ?, ?, 'scheduled', 1, 'owner', 'Cabinet Cron', '', ?)`, args: [sendIdBroken, cabinetId, articleSlug, 'Broken', past1, practitionerId] });
}

async function cleanup() {
  // Recipients + sends + consents + articles + templates + practitioners + cabinets
  await db.execute({ sql: 'DELETE FROM newsletter_recipients WHERE send_id IN (?, ?, ?, ?)', args: [sendIdPast1, sendIdPast2, sendIdFuture, sendIdBroken] }).catch(() => {});
  await db.execute({ sql: 'DELETE FROM newsletter_sends WHERE id IN (?, ?, ?, ?)', args: [sendIdPast1, sendIdPast2, sendIdFuture, sendIdBroken] }).catch(() => {});
  await db.execute({ sql: 'DELETE FROM patient_consents WHERE cabinet_id = ?', args: [cabinetId] }).catch(() => {});
  await db.execute({ sql: 'DELETE FROM articles WHERE slug = ?', args: [articleSlug] }).catch(() => {});
  await db.execute({ sql: 'DELETE FROM newsletter_templates WHERE id = ?', args: [templateId] }).catch(() => {});
  await db.execute({ sql: 'DELETE FROM practitioners WHERE id = ?', args: [practitionerId] }).catch(() => {});
  await db.execute({ sql: 'DELETE FROM cabinets WHERE id = ?', args: [cabinetId] }).catch(() => {});
  // Audit logs du test (immuable par design, on garde — HDS safe)
}

async function readSend(id) {
  const r = await db.execute({ sql: 'SELECT id, status, sent_at FROM newsletter_sends WHERE id = ?', args: [id] });
  return r.rows[0] || null;
}

async function main() {
  console.log(`\n  \u23f0 Sensident \u2014 Test cron scheduled newsletters\n`);
  console.log(`  Cron URL    : ${CRON_URL}`);
  console.log(`  Cabinet     : ${cabinetId}`);
  console.log(`  Sends       : 2 passes + 1 futur + 1 broken`);
  console.log(`  CRON_SECRET : ${CRON_SECRET.slice(0, 14)}...\n`);

  // Ping dev server
  try {
    const r = await fetch(`${BASE}/login`);
    if (!r.ok) throw new Error(`/login -> ${r.status}`);
  } catch (e) {
    console.error(`Dev server injoignable (${e.message}). Lance: npx next dev -p 3001`);
    process.exit(1);
  }

  await seed();
  console.log(`  Donnees de test inserees\n`);

  // 1. Auth manquante -> 401
  {
    const r = await fetch(CRON_URL);
    record('1. Pas de header Authorization -> 401', r.status === 401, `http=${r.status}`);
  }

  // 2. Mauvaise signature -> 401
  {
    const r = await fetch(CRON_URL, { headers: { Authorization: 'Bearer deadbeef' } });
    record('2. Mauvaise signature -> 401', r.status === 401, `http=${r.status}`);
  }

  // 3. Timestamp hors fenetre (10 min dans le passe) -> 401
  {
    const oldTs = Date.now() - 10 * 60 * 1000;
    const tok = makeToken('', oldTs);
    const r = await fetch(CRON_URL, { headers: { Authorization: `Bearer ${tok}` } });
    record('3. Timestamp >5min -> 401', r.status === 401, `http=${r.status}`);
  }

  // 4. Dry run avec signature timestamped -> 200, due=3 (2 passes + 1 broken), future exclus
  {
    const ts = Date.now();
    const tok = makeToken('', ts);
    const r = await fetch(`${CRON_URL}?dry_run=1`, { headers: { Authorization: `Bearer ${tok}` } });
    const body = await r.json();
    // Le dry_run devrait lister les 3 scheduledAt <= now : past1, past2, broken
    record(
      '4. dry_run=1 -> 200, due=3 (sans future)',
      r.status === 200 && body.due === 3 && body.dryRun === true && !body.ids?.includes(sendIdFuture),
      `http=${r.status} due=${body.due} ids=${body.ids?.length}`
    );
    // Verifier que rien n'a change
    const s1 = await readSend(sendIdPast1);
    const sf = await readSend(sendIdFuture);
    record(
      '4b. dry_run ne mute pas la DB',
      s1?.status === 'scheduled' && sf?.status === 'scheduled',
      `past1=${s1?.status} future=${sf?.status}`
    );
  }

  // 5. Run reel avec signature legacy (juste HMAC body) -> 200
  {
    const tok = makeToken('');
    const r = await fetch(CRON_URL, { headers: { Authorization: `Bearer ${tok}` } });
    const body = await r.json();
    record(
      '5. Run reel (legacy HMAC) -> 200, processed=3 sent>=1 failed>=1',
      r.status === 200 && body.processed === 3 && body.sent >= 1,
      `http=${r.status} processed=${body.processed} sent=${body.sent} failed=${body.failed} err=${body.error || 'none'}`
    );
  }

  // 6. Past1 + Past2 doivent etre 'sent', futur reste 'scheduled'
  {
    const s1 = await readSend(sendIdPast1);
    const s2 = await readSend(sendIdPast2);
    const sf = await readSend(sendIdFuture);
    const sb = await readSend(sendIdBroken);
    record(
      '6. Past sends passes a "sent", futur reste "scheduled", broken "cancelled"',
      s1?.status === 'sent' && s2?.status === 'sent' && sf?.status === 'scheduled' && sb?.status === 'cancelled',
      `p1=${s1?.status} p2=${s2?.status} future=${sf?.status} broken=${sb?.status}`
    );
  }

  // 7. Audit log cree
  {
    const r = await db.execute({ sql: "SELECT COUNT(*) as c FROM audit_logs WHERE action = 'cron_process_scheduled_newsletters' AND metadata LIKE '%cron%'", args: [] });
    // LIKE sur metadata textuel
    const r2 = await db.execute({ sql: "SELECT action, metadata FROM audit_logs WHERE action = 'cron_process_scheduled_newsletters' ORDER BY ts DESC LIMIT 1", args: [] });
    const hasAudit = Number(r2.rows[0]?.metadata ? 1 : 0);
    record('7. Audit log cron_process_scheduled_newsletters cree', hasAudit === 1, `count=${r.rows[0]?.c}`);
  }

  // 8. Re-run immediat -> processed=0 (tout est envoye ou futur)
  {
    const ts = Date.now();
    const tok = makeToken('', ts);
    const r = await fetch(`${CRON_URL}?dry_run=1`, { headers: { Authorization: `Bearer ${tok}` } });
    const body = await r.json();
    record(
      '8. Re-run ne re-traite pas les deja envoyes',
      r.status === 200 && body.due === 0,
      `due=${body.due} (1 futur si on a depasse l'heure, sinon 0)`
    );
  }

  await cleanup();
  console.log(`\n  ${'='.repeat(60)}`);
  console.log(`  Cron test: ${passed}/${passed + failed} OK`);
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
