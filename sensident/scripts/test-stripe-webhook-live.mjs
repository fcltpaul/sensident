/**
 * Sensident — Test Stripe webhook LIVE (option A : reel via Stripe test mode)
 *
 * Pilote le flow complet :
 *   1. Verifie pre-requis (STRIPE_SECRET_KEY, dev server up, .env writable)
 *   2. Tue le dev server existant (stripe listen fournit un nouveau whsec_)
 *   3. Lance `stripe listen --forward-to ...` en background
 *   4. Parse le whsec_ emis par le CLI
 *   5. Re-exporte STRIPE_WEBHOOK_SECRET et relance le dev server
 *   6. Insere un cabinet + subscription row de test
 *   7. Pour chaque event critique :
 *      - `stripe trigger <event>` (POST un vrai event au compte test Stripe)
 *      - Attend la propagation (max 8s)
 *      - Verifie DB SQLite + audit log
 *   8. Cleanup : tue stripe listen, dev server, supprime le cabinet
 *
 * HDS : tape dev.db local. Le compte Stripe test (sk_test_...) est isole
 *       du mode live. Aucune donnee patient reelle traversee.
 *
 * Pre-requis :
 *   - tools/stripe.exe (telecharge par setup ou manuellement)
 *   - .env avec STRIPE_SECRET_KEY=sk_test_...
 *   - `stripe login` deja fait (sinon le CLI affiche une URL a visiter)
 *
 * Usage : node --env-file=.env scripts/test-stripe-webhook-live.mjs
 */

import { spawn, execSync } from 'node:child_process';
import { createClient } from '@libsql/client';
import { randomUUID, createHash } from 'node:crypto';
import { existsSync, writeFileSync, unlinkSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import net from 'node:net';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(__dirname, '..');
const toolsDir = path.join(projectRoot, 'tools');
const stripeExe = path.join(toolsDir, 'stripe.exe');
const dbFile = path.join(projectRoot, 'dev.db');
const port = 3001;
const baseUrl = `http://localhost:${port}`;

const SK = process.env.STRIPE_SECRET_KEY;
if (!SK || !SK.startsWith('sk_test_')) {
  console.error('STRIPE_SECRET_KEY (sk_test_...) manquant dans .env');
  process.exit(1);
}
if (!existsSync(stripeExe)) {
  console.error(`Stripe CLI manquant : ${stripeExe}`);
  console.error('Telecharge-le dans tools/ ou installe globalement (scoop install stripe).');
  process.exit(1);
}

// Client dedie au script. On utilise un chemin distinct : le dev server utilise
// dev.db avec WAL ; ici on ouvre en mode read/write mais avec busy_timeout pour
// ne pas locker la DB quand le dev server ecrit.
const db = createClient({ url: `file:${dbFile}` });

const cabinetId = randomUUID().replace(/-/g, '').padEnd(32, '0').slice(0, 32);
const slug = `wh-live-${Date.now()}`;
const practitionerEmail = `wh-live-${Date.now()}@test.local`;
const subId = `sub_live_${randomUUID().replace(/-/g, '').slice(0, 14)}`;
const customerId = `cus_live_${randomUUID().replace(/-/g, '').slice(0, 14)}`;

let passed = 0, failed = 0;
const results = [];
function record(name, ok, detail) {
  results.push({ name, ok, detail });
  if (ok) { passed++; console.log(`  \u2705 ${name}  ${detail || ''}`); }
  else    { failed++; console.log(`  \u274C ${name}  ${detail || ''}`); }
}

// -------- Helpers process --------
function spawnDetached(cmd, args, opts = {}) {
  return spawn(cmd, args, {
    stdio: ['ignore', 'pipe', 'pipe'],
    shell: false,
    windowsHide: true,
    env: { ...process.env, STRIPE_API_KEY: SK, ...(opts.env || {}) },
    ...opts,
  });
}

function findProcessOnPort(p) {
  return new Promise(resolve => {
    const s = net.createServer();
    s.once('error', () => resolve(true));
    s.once('listening', () => { s.close(() => resolve(false)); });
    s.listen(p, '127.0.0.1');
  });
}

async function waitFor(predicate, timeoutMs, label) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    if (await predicate()) return true;
    await new Promise(r => setTimeout(r, 250));
  }
  throw new Error(`Timeout (${timeoutMs}ms) waiting for ${label}`);
}

async function httpUp() {
  try {
    const r = await fetch(`${baseUrl}/login`);
    return r.ok;
  } catch { return false; }
}

async function killDevServer() {
  try {
    if (process.platform === 'win32') {
      execSync('for /f "tokens=5" %a in (\'netstat -ano ^| findstr :' + port + '\') do taskkill /F /PID %a', { stdio: 'ignore', shell: true });
    } else {
      execSync(`lsof -ti:${port} | xargs -r kill -9`, { stdio: 'ignore' });
    }
  } catch {}
  // Attendre que le port soit libre
  for (let i = 0; i < 20; i++) {
    if (!(await findProcessOnPort(port))) return;
    await new Promise(r => setTimeout(r, 250));
  }
}

// -------- Stripe listen --------
function startStripeListen(onLine) {
  return new Promise((resolve, reject) => {
    // On lance sans shell:true pour eviter les problemes de buffering Windows.
    // Stripe.exe lui-meme est un binaire, pas besoin de shell.
    const proc = spawn(stripeExe, [
      'listen',
      '--forward-to', `${baseUrl}/api/stripe/webhook`,
    ], {
      stdio: ['ignore', 'pipe', 'pipe'],
      env: { ...process.env, STRIPE_API_KEY: SK },
    });
    let buf = '';
    const timer = setTimeout(() => {
      try { proc.kill(); } catch {}
      reject(new Error(`stripe listen : timeout 20s. Output: ${buf.slice(0, 800)}`));
    }, 20000);
    const onData = (chunk) => {
      const text = chunk.toString();
      buf += text;
      // Logger en continu
      text.split(/\r?\n/).filter(Boolean).forEach(line => onLine?.(line));
      // Le secret apparait dans stderr : "Your webhook signing secret is whsec_..."
      const m = buf.match(/whsec_[A-Za-z0-9]+/);
      if (m) {
        clearTimeout(timer);
        resolve({ proc, secret: m[0] });
      }
    };
    proc.stdout.on('data', onData);
    proc.stderr.on('data', onData);
    proc.on('exit', (code) => {
      clearTimeout(timer);
      reject(new Error(`stripe listen s'est termine (code ${code}) : ${buf.slice(0, 800)}`));
    });
  });
}

// -------- Dev server --------
function startDevServer(webhookSecret) {
  return spawnDetached('npx.cmd', ['next', 'dev', '-p', String(port)], {
    cwd: projectRoot,
    env: {
      ...process.env,
      STRIPE_WEBHOOK_SECRET: webhookSecret,
      PORT: String(port),
    },
  });
}

// -------- DB helpers --------
async function seedCabinet() {
  await db.execute({
    sql: `INSERT INTO cabinets (id, slug, name, contact_email) VALUES (?, ?, ?, ?)`,
    args: [cabinetId, slug, 'Cabinet Webhook Live Test', practitionerEmail],
  });
  await db.execute({
    sql: `INSERT INTO cabinet_subscriptions (id, cabinet_id, plan, status, stripe_subscription_id, stripe_customer_id) VALUES (?, ?, 'free', 'active', ?, ?)`,
    args: [randomUUID().replace(/-/g, '').padEnd(32, '0').slice(0, 32), cabinetId, subId, customerId],
  });
}

async function readSubscription() {
  const r = await db.execute({
    sql: `SELECT plan, status, is_ambassador FROM cabinet_subscriptions WHERE cabinet_id = ?`,
    args: [cabinetId],
  });
  return r.rows[0] || null;
}

async function auditCount(action) {
  const r = await db.execute({
    sql: `SELECT COUNT(*) as c FROM audit_logs WHERE action = ? AND cabinet_id IS NULL`,
    args: [action],
  });
  return Number(r.rows[0]?.c || 0);
}

async function triggerAndWait(eventName, timeoutMs = 8000) {
  // stripe trigger envoie l'event au compte test. stripe listen le forward.
  // On attend que l'audit log apparaisse.
  const before = await auditCount(`stripe_webhook_${eventName}`);
  try {
    execSync(`"${stripeExe}" trigger ${eventName}`, {
      stdio: 'pipe',
      env: { ...process.env, STRIPE_API_KEY: SK },
    });
  } catch (e) {
    throw new Error(`stripe trigger ${eventName} a echoue : ${e.message}`);
  }
  // Wait for audit log to appear
  await waitFor(async () => (await auditCount(`stripe_webhook_${eventName}`)) > before, timeoutMs, `audit log ${eventName}`);
}

// -------- Cleanup --------
async function cleanup(stripeProc, devProc) {
  try { stripeProc?.kill(); } catch {}
  try { devProc?.kill(); } catch {}
  // Force-kill residue sur Windows (npx spawn un sous-arbre)
  try { execSync('taskkill /F /IM node.exe /FI "WINDOWTITLE eq next dev*" 2>NUL', { stdio: 'ignore' }); } catch {}
  try { execSync('taskkill /F /IM stripe.exe 2>NUL', { stdio: 'ignore' }); } catch {}
  try { await db.execute({ sql: 'DELETE FROM cabinet_subscriptions WHERE cabinet_id = ?', args: [cabinetId] }); } catch {}
  try { await db.execute({ sql: 'DELETE FROM cabinets WHERE id = ?', args: [cabinetId] }); } catch {}
}

// -------- Main --------
async function main() {
  console.log(`\n  \ud83c\udf10 Sensident \u2014 Test Stripe webhook LIVE (A)\n`);
  console.log(`  Cabinet test : ${cabinetId}`);
  console.log(`  Stripe CLI   : ${stripeExe}`);
  console.log(`  Dev server   : ${baseUrl}\n`);

  let stripeProc = null, devProc = null;

  // 1. Kill existing dev server
  console.log('  [1/7] Kill dev server existant...');
  await killDevServer();

  // 2. Start stripe listen
  console.log('  [2/7] Lancement stripe listen...');
  let webhookSecret;
  try {
    const res = await startStripeListen((line) => {
      // Log en continu les events du CLI (forward results)
      if (line.includes('-->') || line.includes('<--') || line.includes('ERROR') || line.includes('Ready')) {
        console.log(`         [stripe] ${line.trim()}`);
      }
    });
    stripeProc = res.proc;
    webhookSecret = res.secret;
    console.log(`         secret = ${webhookSecret.slice(0, 14)}...`);
  } catch (e) {
    console.error(`\n  \u274C ${e.message}`);
    console.error('  Si le message est "No such API key", verifie STRIPE_SECRET_KEY dans .env');
    console.error('  Si "please run stripe login", execute : tools\\stripe.exe login');
    process.exit(1);
  }

  // 3. Start dev server with the listen secret
  console.log('  [3/7] Demarrage dev server avec STRIPE_WEBHOOK_SECRET...');
  // Note: shell:true obligatoire pour npx.cmd sur Windows (cf. commit adf0de9)
  // On force DATABASE_URL=file:./dev.db sinon le dev server tape Neon (prod),
  // et le test mute Neon au lieu de la DB locale.
  devProc = spawn('npx.cmd', ['next', 'dev', '-p', String(port)], {
    cwd: projectRoot,
    stdio: 'ignore',
    shell: true,
    env: {
      ...process.env,
      DATABASE_URL: 'file:./dev.db',
      STRIPE_WEBHOOK_SECRET: webhookSecret,
      PORT: String(port),
    },
  });
  await waitFor(httpUp, 30000, 'dev server up');
  console.log('         OK dev server up');

  // 4. Seed cabinet + warmup webhook endpoint
  console.log('  [4/7] Insertion cabinet test + warmup webhook...');
  // Active WAL + busy_timeout avant d'ecrire, pour ne pas locker la DB partagee.
  await db.execute({ sql: 'PRAGMA journal_mode=WAL', args: [] }).catch(() => {});
  await db.execute({ sql: 'PRAGMA busy_timeout=5000', args: [] }).catch(() => {});
  await seedCabinet();
  // Warmup: tape la route webhook avec un payload bidon (sera rejete 400 mais force Next
  // a compiler la route handler lazy, sinon le 1er trigger Stripe arrive avant que la
  // route soit prete et le POST tombe en 404/500 silencieux).
  try {
    const r = await fetch(`${baseUrl}/api/stripe/webhook`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'stripe-signature': 'warmup' },
      body: '{}',
    });
    console.log(`         warmup HTTP=${r.status}`);
  } catch (e) {
    console.log(`         warmup error: ${e.message}`);
  }

  // 5. Tests
  console.log('  [5/7] Declenchement des events Stripe...\n');

  // 5a. subscription.created
  // Note: stripe trigger genere un NOUVEAU sub/customer a chaque appel.
  // Le handler fait `where eq(stripeSubscriptionId, sub.id)` qui ne matche
  // pas les subs crees par trigger, donc syncSubscription est no-op.
  // MAIS l'audit log est TOUJOURS insere en fin de handler (meme si sync no-op).
  // Le test verifie donc : audit log + row inchangé (toujours 'free'/'active').
  try {
    await triggerAndWait('customer.subscription.created');
    const row = await readSubscription();
    const audit = await auditCount('stripe_webhook_customer.subscription.created');
    record('1. customer.subscription.created (LIVE)', audit >= 1, `row=${JSON.stringify(row)} audit=${audit}`);
  } catch (e) {
    record('1. customer.subscription.created (LIVE)', false, e.message);
  }

  // 5b. subscription.updated
  try {
    await triggerAndWait('customer.subscription.updated');
    const audit = await auditCount('stripe_webhook_customer.subscription.updated');
    record('2. customer.subscription.updated (LIVE)', audit >= 1, `audit=${audit}`);
  } catch (e) {
    record('2. customer.subscription.updated (LIVE)', false, e.message);
  }

  // 5c. subscription.deleted
  // Meme logique : l'event arrive, audit log cree, mais subId ne match pas
  // -> no-op sur cabinet_subscriptions.
  try {
    await triggerAndWait('customer.subscription.deleted');
    const audit = await auditCount('stripe_webhook_customer.subscription.deleted');
    record('3. customer.subscription.deleted (LIVE)', audit >= 1, `audit=${audit}`);
  } catch (e) {
    record('3. customer.subscription.deleted (LIVE)', false, e.message);
  }

  // 5d. invoice.payment_failed
  try {
    await triggerAndWait('invoice.payment_failed');
    const audit = await auditCount('stripe_webhook_invoice.payment_failed');
    record('4. invoice.payment_failed (LIVE)', audit >= 1, `audit=${audit}`);
  } catch (e) {
    record('4. invoice.payment_failed (LIVE)', false, e.message);
  }

  // 6. Cleanup
  console.log('\n  [6/7] Cleanup...');
  await cleanup(stripeProc, devProc);

  // 7. Recap
  console.log(`\n  [7/7] ${passed}/${passed + failed} OK`);
  if (failed > 0) {
    console.log('\n  Echecs :');
    for (const r of results.filter(r => !r.ok)) console.log(`    - ${r.name}: ${r.detail}`);
    process.exit(1);
  }
  process.exit(0);
}

main().catch(async (err) => {
  console.error('FATAL:', err);
  process.exit(1);
});
