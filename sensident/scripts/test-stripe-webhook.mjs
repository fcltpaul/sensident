/**
 * Sensident — Test Stripe webhook (option B : mock signé)
 *
 * Vise le dev server Next.js sur http://localhost:3001
 * - Construit un payload Stripe réaliste
 * - Le signe avec STRIPE_WEBHOOK_SECRET (whsec_test_...)
 * - POST sur /api/stripe/webhook
 * - Verifie la persistance SQLite + audit log
 *
 * Cas couverts :
 *   1. customer.subscription.created (plan pro)        -> 200, DB updated, audit OK
 *   2. customer.subscription.updated (plan cabinet)     -> 200, DB updated
 *   3. customer.subscription.deleted                    -> 200, status canceled
 *   4. invoice.payment_failed                           -> 200, status past_due
 *   5. Mauvaise signature                               -> 400
 *   6. Prix inconnu (mapping manquant)                  -> 200, fallback 'free'
 *   7. Metadata cabinet_id manquant                     -> 200, no-op (no crash)
 *
 * HDS : on tape dev.db (SQLite local). Aucune donnee patient reelle.
 *        Le test ne fait que valider la facturation + audit.
 *
 * Usage : node --env-file=.env scripts/test-stripe-webhook.mjs
 * Prerequis : dev server sur :3001 + STRIPE_WEBHOOK_SECRET dans .env
 */

import { createClient } from '@libsql/client';
import Stripe from 'stripe';
import { randomUUID } from 'node:crypto';

const BASE = 'http://localhost:3001';
const HOOK = `${BASE}/api/stripe/webhook`;
const SECRET = process.env.STRIPE_WEBHOOK_SECRET;
if (!SECRET) {
  console.error('STRIPE_WEBHOOK_SECRET manquant dans .env');
  process.exit(1);
}
if (!process.env.STRIPE_SECRET_KEY) {
  console.error('STRIPE_SECRET_KEY manquant dans .env');
  process.exit(1);
}

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, { apiVersion: '2024-06-20' });

// Acces direct a la DB SQLite. En dev le DATABASE_URL peut etre postgres (Neon)
// ou sqlite : on force le path local pour ce test (le dev server utilise
// lui aussi dev.db quand DATABASE_URL commence par 'file:').
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(__dirname, '..');
const dbFile = process.env.SQLITE_DB_PATH || path.join(projectRoot, 'dev.db');
const db = createClient({ url: `file:${dbFile}` });

const slug = `wh-test-${Date.now()}`;
const cabinetId = randomUUID().replace(/-/g, '').padEnd(32, '0').slice(0, 32);
const practitionerEmail = `wh-test-${Date.now()}@test.local`;

const results = [];
let passed = 0;
let failed = 0;

function record(name, ok, detail) {
  results.push({ name, ok, detail });
  if (ok) {
    passed++;
    console.log(`  \u2705 ${name}  ${detail || ''}`);
  } else {
    failed++;
    console.log(`  \u274C ${name}  ${detail || ''}`);
  }
}

/**
 * Construit un payload Stripe.Subscription minimal + signature correcte.
 * Utilise la lib Stripe pour signer (mecanique reelle, pas un mock du mock).
 */
function buildSubscriptionEvent(type, overrides = {}) {
  const subId = `sub_test_${randomUUID().replace(/-/g, '').slice(0, 14)}`;
  const customerId = `cus_test_${randomUUID().replace(/-/g, '').slice(0, 14)}`;
  const now = Math.floor(Date.now() / 1000);
  const sub = {
    id: subId,
    object: 'subscription',
    customer: customerId,
    status: 'active',
    cancel_at_period_end: false,
    current_period_start: now,
    current_period_end: now + 30 * 86400,
    metadata: { cabinet_id: cabinetId },
    items: {
      object: 'list',
      data: [
        {
          id: `si_test_${randomUUID().replace(/-/g, '').slice(0, 12)}`,
          price: { id: overrides.priceId || 'price_pro_xxx' },
        },
      ],
    },
    discount: overrides.ambassador
      ? { coupon: { id: 'AMBASSADOR_2026' } }
      : null,
    ...overrides.sub,
  };
  const event = {
    id: `evt_test_${randomUUID().replace(/-/g, '').slice(0, 16)}`,
    object: 'event',
    type,
    api_version: '2024-06-20',
    created: now,
    livemode: false,
    data: { object: sub },
  };
  return { event, sub };
}

function sign(event) {
  const payload = JSON.stringify(event);
  const header = stripe.webhooks.generateTestHeaderString({
    payload,
    secret: SECRET,
  });
  return { payload, header };
}

async function postWebhook(event) {
  const { payload, header } = sign(event);
  const res = await fetch(HOOK, {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'stripe-signature': header },
    body: payload,
  });
  let body;
  try { body = await res.json(); } catch { body = null; }
  return { status: res.status, body };
}

async function seedCabinet() {
  await db.execute({
    sql: `INSERT INTO cabinets (id, slug, name, contact_email) VALUES (?, ?, ?, ?)`,
    args: [cabinetId, slug, 'Cabinet Webhook Test', practitionerEmail],
  });
  // subscription row initial (free, sans stripe_*) pour que le UPDATE du handler ait une cible
  await db.execute({
    sql: `INSERT INTO cabinet_subscriptions (id, cabinet_id, plan, status) VALUES (?, ?, 'free', 'active')`,
    args: [randomUUID().replace(/-/g, '').padEnd(32, '0').slice(0, 32), cabinetId],
  });
}

async function readSubscription() {
  const r = await db.execute({
    sql: `SELECT plan, status, stripe_customer_id, stripe_subscription_id, is_ambassador, cancel_at_period_end FROM cabinet_subscriptions WHERE cabinet_id = ?`,
    args: [cabinetId],
  });
  return r.rows[0] || null;
}

async function readAuditLogCount(action) {
  const r = await db.execute({
    sql: `SELECT COUNT(*) as c FROM audit_logs WHERE action = ? AND cabinet_id IS NULL`,
    args: [action],
  });
  return Number(r.rows[0]?.c || 0);
}

async function main() {
  console.log(`\n  \ud83e\uddea Sensident \u2014 Test Stripe webhook (B : mock signe)\n`);
  console.log(`  Base      : ${BASE}`);
  console.log(`  Cabinet   : ${cabinetId}`);
  console.log(`  Secret    : ${SECRET.slice(0, 14)}...`);
  console.log('');

  // Verifier que le dev server repond
  try {
    const ping = await fetch(`${BASE}/login`);
    if (!ping.ok) throw new Error(`/login -> ${ping.status}`);
  } catch (e) {
    console.error(`Dev server injoignable sur ${BASE} (${e.message}). Lance: npx next dev -p 3001`);
    process.exit(1);
  }

  await seedCabinet();
  console.log(`  Cabinet de test insere\n`);

  // ----- Test 1 : subscription.created (plan pro) -----
  {
    const { event } = buildSubscriptionEvent('customer.subscription.created', { priceId: 'price_pro_xxx' });
    const { status, body } = await postWebhook(event);
    const row = await readSubscription();
    const audit = await readAuditLogCount('stripe_webhook_customer.subscription.created');
    record(
      '1. subscription.created (pro)',
      status === 200 && body?.received === true && row?.plan === 'pro' && row?.status === 'active' && audit >= 1,
      `http=${status} plan=${row?.plan} status=${row?.status} audit=${audit}`
    );
  }

  // ----- Test 2 : subscription.updated (plan cabinet) -----
  {
    const current = await readSubscription();
    const { event } = buildSubscriptionEvent('customer.subscription.updated', { priceId: 'price_cabinet_xxx' });
    // Preserve stripeCustomerId/SubscriptionId du test 1
    event.data.object.stripe_customer_id = current?.stripe_customer_id;
    const { status, body } = await postWebhook(event);
    const row = await readSubscription();
    const audit = await readAuditLogCount('stripe_webhook_customer.subscription.updated');
    record(
      '2. subscription.updated (cabinet)',
      status === 200 && body?.received === true && row?.plan === 'cabinet' && audit >= 1,
      `http=${status} plan=${row?.plan} audit=${audit}`
    );
  }

  // ----- Test 3 : subscription.deleted -----
  {
    const current = await readSubscription();
    // Reuse the same subId present in DB
    const { event, sub } = buildSubscriptionEvent('customer.subscription.deleted', { priceId: 'price_pro_xxx' });
    event.data.object.id = current?.stripe_subscription_id || sub.id;
    const { status, body } = await postWebhook(event);
    const row = await readSubscription();
    const audit = await readAuditLogCount('stripe_webhook_customer.subscription.deleted');
    record(
      '3. subscription.deleted',
      status === 200 && body?.received === true && row?.status === 'canceled' && audit >= 1,
      `http=${status} status=${row?.status} audit=${audit}`
    );
  }

  // ----- Test 4 : invoice.payment_failed -----
  {
    const current = await readSubscription();
    const subId = current?.stripe_subscription_id;
    const invoice = {
      id: `in_test_${randomUUID().replace(/-/g, '').slice(0, 14)}`,
      object: 'invoice',
      subscription: subId,
      amount_due: 7900,
    };
    const event = {
      id: `evt_test_${randomUUID().replace(/-/g, '').slice(0, 16)}`,
      object: 'event',
      type: 'invoice.payment_failed',
      api_version: '2024-06-20',
      created: Math.floor(Date.now() / 1000),
      livemode: false,
      data: { object: invoice },
    };
    const { status, body } = await postWebhook(event);
    const row = await readSubscription();
    const audit = await readAuditLogCount('stripe_webhook_invoice.payment_failed');
    record(
      '4. invoice.payment_failed',
      status === 200 && body?.received === true && row?.status === 'past_due' && audit >= 1,
      `http=${status} status=${row?.status} audit=${audit}`
    );
  }

  // ----- Test 5 : mauvaise signature -----
  {
    const { event } = buildSubscriptionEvent('customer.subscription.created', { priceId: 'price_pro_xxx' });
    const payload = JSON.stringify(event);
    const { status, body } = await fetch(HOOK, {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'stripe-signature': 't=0,v1=deadbeef' },
      body: payload,
    }).then(async r => ({ status: r.status, body: await r.json().catch(() => null) }));
    record(
      '5. Mauvaise signature',
      status === 400 && body?.error === 'Invalid signature',
      `http=${status}`
    );
  }

  // ----- Test 6 : prix inconnu -> fallback 'free' -----
  {
    const { event } = buildSubscriptionEvent('customer.subscription.updated', { priceId: 'price_inconnu_zzz' });
    const { status, body } = await postWebhook(event);
    const row = await readSubscription();
    record(
      '6. Prix inconnu (fallback free)',
      status === 200 && row?.plan === 'free',
      `http=${status} plan=${row?.plan}`
    );
  }

  // ----- Test 7 : metadata cabinet_id manquant -> no-op (pas de crash) -----
  {
    const { event } = buildSubscriptionEvent('customer.subscription.created', { priceId: 'price_pro_xxx' });
    event.data.object.metadata = {}; // pas de cabinet_id
    const { status, body } = await postWebhook(event);
    record(
      '7. metadata cabinet_id absent (no-op safe)',
      status === 200 && body?.received === true,
      `http=${status}`
    );
  }

  // ----- Cleanup -----
  await db.execute({ sql: `DELETE FROM cabinet_subscriptions WHERE cabinet_id = ?`, args: [cabinetId] });
  await db.execute({ sql: `DELETE FROM cabinets WHERE id = ?`, args: [cabinetId] });
  // Note : on garde les audit_logs (immuables par design)

  console.log(`\n  ${'='.repeat(60)}`);
  console.log(`  Webhook test: ${passed}/${passed + failed} OK`);
  console.log(`  ${'='.repeat(60)}\n`);

  if (failed > 0) {
    console.log('  Echecs :');
    for (const r of results.filter(r => !r.ok)) console.log(`    - ${r.name}: ${r.detail}`);
    process.exit(1);
  }
  process.exit(0);
}

main().catch(err => {
  console.error('FATAL:', err);
  process.exit(1);
});
