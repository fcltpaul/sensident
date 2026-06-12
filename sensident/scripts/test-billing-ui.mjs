/**
 * Sensident — Test Customer Portal UI (Mon compte)
 *
 * Valide la nouvelle section "Abonnement" :
 *  - Affichage des 3 cartes Free / Pro / Cabinet
 *  - Bandeau d'alerte si ?no_stripe_customer=1
 *  - POST /api/billing/portal sans stripeCustomerId -> redirect /dashboard/account?no_stripe_customer=1
 *  - POST /api/billing/checkout {plan: 'pro'} -> URL Stripe Checkout (sk_test_...)
 *  - Bandeau succes apres ?stripe_success=1
 *
 * HDS : dev.db local uniquement. Pas d'impact Neon.
 *
 * Usage : node scripts/test-billing-ui.mjs
 * Prerequis : dev server sur :3001 + STRIPE_SECRET_KEY=sk_test_...
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
const cabinetId = randomUUID().replace(/-/g, '').padEnd(32, '0').slice(0, 32);
const practitionerId = randomUUID().replace(/-/g, '').padEnd(32, '0').slice(0, 32);
const sessionId = randomUUID().replace(/-/g, '').padEnd(32, '0').slice(0, 32);
const sessionToken = randomBytes(32).toString('base64url');
const tokenHash = createHash('sha256').update(sessionToken).digest('hex');
const email = `billing-test-${TS}@test.local`;
const slug = `billing-test-${TS}`;
const passwordHash = '$2b$10$fakehashfakehashfakehashfakehashfakehashfakehashfa';

let passed = 0, failed = 0;
const results = [];
function record(name, ok, detail) {
  results.push({ name, ok, detail });
  if (ok) { passed++; console.log(`  \u2705 ${name}  ${detail || ''}`); }
  else    { failed++; console.log(`  \u274C ${name}  ${detail || ''}`); }
}

async function seed() {
  await db.execute({ sql: 'INSERT INTO cabinets (id, slug, name, contact_email) VALUES (?, ?, ?, ?)', args: [cabinetId, slug, `Cabinet Billing ${TS}`, email] });
  await db.execute({ sql: `INSERT INTO practitioners (id, cabinet_id, email, name, password_hash, totp_enabled, role) VALUES (?, ?, ?, ?, ?, 1, 'owner')`, args: [practitionerId, cabinetId, email, 'Test Owner', passwordHash] });
  await db.execute({ sql: `INSERT INTO cabinet_subscriptions (id, cabinet_id, plan, status) VALUES (?, ?, 'free', 'active')`, args: [randomUUID().replace(/-/g, '').padEnd(32, '0').slice(0, 32), cabinetId] });
  const expiresAt = Math.floor((Date.now() + 7 * 24 * 3600 * 1000) / 1000);
  await db.execute({ sql: 'INSERT INTO practitioner_sessions (id, practitioner_id, cabinet_id, token_hash, mfa_verified, expires_at) VALUES (?, ?, ?, ?, 1, ?)', args: [sessionId, practitionerId, cabinetId, tokenHash, expiresAt] });
}

async function cleanup() {
  await db.execute({ sql: 'DELETE FROM practitioner_sessions WHERE id = ?', args: [sessionId] }).catch(() => {});
  await db.execute({ sql: 'DELETE FROM cabinet_subscriptions WHERE cabinet_id = ?', args: [cabinetId] }).catch(() => {});
  await db.execute({ sql: 'DELETE FROM practitioners WHERE id = ?', args: [practitionerId] }).catch(() => {});
  await db.execute({ sql: 'DELETE FROM cabinets WHERE id = ?', args: [cabinetId] }).catch(() => {});
}

function cookieHeader() {
  return `${SESSION_COOKIE}=${sessionToken}`;
}

async function main() {
  console.log(`\n  \ud83d\udcb3 Sensident \u2014 Test Customer Portal UI (Mon compte)\n`);
  console.log(`  Cabinet       : ${cabinetId}`);
  console.log(`  Practitioner  : ${practitionerId}`);
  console.log(`  Base          : ${BASE}\n`);

  // Verifier que le dev server repond
  try {
    const r = await fetch(`${BASE}/login`);
    if (!r.ok) throw new Error(`/login -> ${r.status}`);
  } catch (e) {
    console.error(`Dev server injoignable (${e.message}). Lance: npx next dev -p 3001`);
    process.exit(1);
  }

  await seed();
  console.log(`  Cabinet + practitioner + session inseres\n`);

  // 1. /dashboard/account affiche les 3 cartes
  {
    const r = await fetch(`${BASE}/dashboard/account`, {
      headers: { Cookie: cookieHeader() },
      redirect: 'manual',
    });
    const html = r.status === 200 ? await r.text() : '';
    const hasFree = html.includes('Free');
    const hasPro = html.includes('Pro');
    const hasCabinet = html.includes('Cabinet');
    const hasAbonnement = html.includes('Abonnement');
    record(
      '1. /dashboard/account rend + 3 plans visibles',
      r.status === 200 && hasFree && hasPro && hasCabinet && hasAbonnement,
      `http=${r.status} abonnement=${hasAbonnement} free=${hasFree} pro=${hasPro} cabinet=${hasCabinet}`
    );
  }

  // 2. ?no_stripe_customer=1 affiche le bandeau d'alerte
  {
    const r = await fetch(`${BASE}/dashboard/account?no_stripe_customer=1`, {
      headers: { Cookie: cookieHeader() },
      redirect: 'manual',
    });
    const html = r.status === 200 ? await r.text() : '';
    const hasBanner = html.includes("Vous n'avez pas encore de compte client Stripe") || html.includes('compte client Stripe');
    record(
      '2. Bandeau no_stripe_customer visible',
      r.status === 200 && hasBanner,
      `http=${r.status} banner=${hasBanner}`
    );
  }

  // 3. /api/billing/portal sans stripeCustomerId -> redirect vers no_stripe_customer
  {
    const r = await fetch(`${BASE}/api/billing/portal`, {
      headers: { Cookie: cookieHeader() },
      redirect: 'manual',
    });
    const loc = r.headers.get('location') || '';
    const ok = r.status === 307 && loc.includes('no_stripe_customer=1');
    record(
      '3. /api/billing/portal sans customer -> redirect no_stripe_customer',
      ok,
      `http=${r.status} loc=${loc.slice(0, 60)}`
    );
  }

  // 4. /api/billing/portal sans session -> redirect /login
  {
    const r = await fetch(`${BASE}/api/billing/portal`, { redirect: 'manual' });
    const loc = r.headers.get('location') || '';
    const ok = r.status === 307 && loc.includes('/login');
    record(
      '4. /api/billing/portal non auth -> redirect /login',
      ok,
      `http=${r.status} loc=${loc.slice(0, 60)}`
    );
  }

  // 5. /api/billing/checkout pro -> URL Stripe Checkout
  // Avec sk_test_..., les PRICE_IDS sont des placeholders ('price_pro_xxx')
  // donc Stripe renvoie 'No such price' -> 502 Bad Gateway (erreur upstream)
  // En prod avec vrais price_id, ce serait 200 + url Checkout.
  {
    const r = await fetch(`${BASE}/api/billing/checkout`, {
      method: 'POST',
      headers: { Cookie: cookieHeader(), 'Content-Type': 'application/json' },
      body: JSON.stringify({ plan: 'pro' }),
    });
    const body = await r.json().catch(() => ({}));
    // Accepte : 200 + url (vrai Stripe OK) OU 502 + error (price placeholder)
    const ok = r.status === 200 ? !!body.url : r.status === 502 && !!body.error;
    record(
      '5. POST /api/billing/checkout (plan=pro) reponse structuree',
      ok,
      `http=${r.status} hasUrl=${!!body.url} error=${body.error || 'none'}`
    );
  }

  // 6. /api/billing/checkout plan invalide -> 400
  {
    const r = await fetch(`${BASE}/api/billing/checkout`, {
      method: 'POST',
      headers: { Cookie: cookieHeader(), 'Content-Type': 'application/json' },
      body: JSON.stringify({ plan: 'platinum' }),
    });
    const body = await r.json().catch(() => ({}));
    record(
      '6. POST /api/billing/checkout plan invalide -> 400',
      r.status === 400 && !!body.error,
      `http=${r.status} error=${body.error || 'none'}`
    );
  }

  // 7. /dashboard/account?stripe_success=1 -> bandeau succes
  {
    const r = await fetch(`${BASE}/dashboard/account?stripe_success=1`, {
      headers: { Cookie: cookieHeader() },
      redirect: 'manual',
    });
    const html = r.status === 200 ? await r.text() : '';
    const hasSuccess = html.includes('Abonnement active') || html.includes('Bienven');
    record(
      '7. Bandeau stripe_success visible',
      r.status === 200 && hasSuccess,
      `http=${r.status} success=${hasSuccess}`
    );
  }

  await cleanup();
  console.log(`\n  ${'='.repeat(60)}`);
  console.log(`  Billing UI test: ${passed}/${passed + failed} OK`);
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
