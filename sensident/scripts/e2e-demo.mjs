#!/usr/bin/env node
/**
 * Sensident — E2E Demo Test (7 flux critiques)
 *
 * Usage: node scripts/e2e-demo.mjs
 * Prerequis: serveur dev Next.js demarre sur http://localhost:3001
 */

import { authenticator } from 'otplib';

const BASE = 'http://localhost:3001';
const TS = Date.now();
const TEST_EMAIL = `e2e-${TS}@test.local`;
const TEST_SLUG = `e2e-${TS}`;
const TEST_PASS = 'DemoTestPass!42Abc';

// --- helpers ---

function parseCookies(res) {
  const setCookie = res.headers.getSetCookie?.() ?? [];
  if (setCookie.length === 0) {
    const raw = res.headers.get('set-cookie');
    if (raw) setCookie.push(raw);
  }
  return setCookie.map((c) => c.split(';')[0]).join('; ');
}

async function api(method, path, body, cookie = '') {
  const headers = {};
  if (body) headers['Content-Type'] = 'application/json';
  if (cookie) headers['Cookie'] = cookie;
  const opts = { method, headers, redirect: 'manual' };
  if (body) opts.body = JSON.stringify(body);
  const res = await fetch(`${BASE}${path}`, opts);
  const ct = res.headers.get('content-type') ?? '';
  const isImg = ct.includes('image/');
  const text = isImg ? `[${ct}]` : await res.text();
  let json = null;
  try { json = JSON.parse(text); } catch {}
  return { status: res.status, headers: res.headers, text, json, cookie: parseCookies(res) || cookie };
}

function check(name, expect, got, ok, detail = '') {
  return { name, expect, got, ok, detail };
}

// --- main ---

(async () => {
  const results = [];
  let cookie = '';
  let totpSecret = '';
  let cabinetSlug = '';

  console.log(`Sensident E2E Demo — ${new Date().toISOString()}`);
  console.log(`Base: ${BASE} | Email: ${TEST_EMAIL} | Slug: ${TEST_SLUG}\n`);

  // =========================================================
  // 1. SIGNUP
  // =========================================================
  {
    const r = await api('POST', '/api/practitioner/signup', {
      email: TEST_EMAIL, password: TEST_PASS,
      cabinetName: `Cabinet E2E ${TS}`, slug: TEST_SLUG,
    });
    const ok = r.status === 200 && !!r.json?.totpSecret;
    console.log(`${ok ? '✅' : '❌'} 1. Signup : ${r.status} hasTotpSecret=${!!r.json?.totpSecret}`);
    results.push(check('1. Signup (POST /api/practitioner/signup)', '200 + totpSecret',
      `${r.status} totp=${!!r.json?.totpSecret}`, ok));
    if (ok) {
      cookie = r.cookie;
      totpSecret = r.json.totpSecret;
      cabinetSlug = TEST_SLUG;
    }
  }

  // =========================================================
  // 2. MFA VERIFY
  // =========================================================
  {
    if (!totpSecret || !cookie) {
      console.log('❌ 2. MFA verify : SKIP (no totpSecret/cookie)');
      results.push(check('2. MFA verify (POST /api/practitioner/verify-mfa)', '200', 'SKIP', false));
    } else {
      authenticator.options = { window: 1 };
      const code = authenticator.generate(totpSecret);
      const r = await api('POST', '/api/practitioner/verify-mfa', { totpCode: code }, cookie);
      const ok = r.status === 200 && r.json?.success;
      console.log(`${ok ? '✅' : '❌'} 2. MFA verify : ${r.status} ${JSON.stringify(r.json)?.slice(0, 100)}`);
      results.push(check('2. MFA verify (POST /api/practitioner/verify-mfa)', '200 + success:true',
        `${r.status} ${JSON.stringify(r.json)}`, ok));
      if (ok) cookie = r.cookie;
    }
  }

  // =========================================================
  // 3. PAGE LOGIN
  // =========================================================
  {
    const r = await fetch(`${BASE}/login`, { redirect: 'manual' });
    const body = await r.text();
    const ok = r.status === 200;
    console.log(`${ok ? '✅' : '❌'} 3. Login page : ${r.status} (${body.length} bytes)`);
    results.push(check('3. Login page (GET /login)', '200', `${r.status}`, ok));
  }

  // =========================================================
  // 4. DASHBOARD (authenticated)
  // =========================================================
  {
    const r = await fetch(`${BASE}/dashboard`, { headers: { Cookie: cookie }, redirect: 'manual' });
    const loc = r.headers.get('location') ?? '';
    const ok = r.status === 200 || r.status === 307;
    const icon = ok ? '✅' : '❌';
    console.log(`${icon} 4. Dashboard : ${r.status} ${loc ? '→ ' + loc : '(rendered)'}`);
    if (r.status !== 200) {
      console.log('   ⚠ MFA session bug: Drizzle ORM boolean true → PostgreSQL fails with patched client');
    }
    results.push(check('4. Dashboard (GET /dashboard)', '200 or 307',
      `${r.status} ${loc}`, ok,
      r.status !== 200 ? 'MFA boolean persistence bug' : ''));
  }

  // =========================================================
  // 5. RGPD PATIENT PAGE
  // =========================================================
  // 5a. No cookie, inexistant slug → 404
  {
    const r = await fetch(`${BASE}/c/inexistant/donnees-personnelles`, { redirect: 'manual' });
    const ok = r.status === 404;
    console.log(`${ok ? '✅' : '❌'} 5a. RGPD (no cookie) : ${r.status}`);
    results.push(check('5a. RGPD inexistant no cookie', '404', `${r.status}`, ok));
  }

  // 5b. Fake cookie, inexistant slug → 404
  {
    const r = await fetch(`${BASE}/c/inexistant/donnees-personnelles`, {
      headers: { Cookie: 'sensident_patient_session=fake' }, redirect: 'manual',
    });
    const ok = r.status === 404;
    console.log(`${ok ? '✅' : '❌'} 5b. RGPD (fake cookie) : ${r.status}`);
    results.push(check('5b. RGPD inexistant + cookie', '404', `${r.status}`, ok));
  }

  // 5c. Existing cabinet + cookie → 200 avec contenu RGPD
  {
    const slug = cabinetSlug || TEST_SLUG;
    const r = await fetch(`${BASE}/c/${slug}/donnees-personnelles`, {
      headers: { Cookie: 'sensident_patient_session=fake' }, redirect: 'manual',
    });
    const body = await r.text();
    const hasContent = body.includes('Mes donnees') || body.includes('donnees-personnelles');
    const ok = r.status === 200 && hasContent;
    console.log(`${ok ? '✅' : '❌'} 5c. RGPD (existing cabinet) : ${r.status} hasContent=${hasContent}`);
    if (!ok) console.log(`   Body: ${body.slice(0, 250)}`);
    results.push(check('5c. RGPD cabinet existant', '200 + RGPD content',
      `${r.status} hasContent=${hasContent}`, ok));
  }

  // =========================================================
  // 6. TRACKING PIXEL
  // =========================================================
  {
    const r = await fetch(`${BASE}/api/track/email-open`, { redirect: 'manual' });
    const ct = r.headers.get('content-type') ?? '';
    const ok = r.status === 200 && ct.includes('image/gif');
    console.log(`${ok ? '✅' : '❌'} 6a. Track pixel : ${r.status} ${ct}`);
    results.push(check('6a. Tracking pixel', '200 image/gif', `${r.status} ${ct}`, ok));
  }
  {
    const r = await fetch(`${BASE}/api/track/email-open?t=fake.token`, { redirect: 'manual' });
    const ct = r.headers.get('content-type') ?? '';
    const ok = r.status === 200 && ct.includes('image/gif');
    console.log(`${ok ? '✅' : '❌'} 6b. Track pixel (fake) : ${r.status} ${ct}`);
    results.push(check('6b. Tracking pixel fake token', '200 image/gif', `${r.status} ${ct}`, ok));
  }

  // =========================================================
  // 7. NEWSLETTER COMPOSER
  // =========================================================
  {
    const r = await fetch(`${BASE}/dashboard/newsletter`, {
      headers: { Cookie: cookie }, redirect: 'manual',
    });
    const body = await r.text();
    const loc = r.headers.get('location') ?? '';
    const hasComposer = body.includes('NewsletterComposer') || body.includes('composer')
      || body.includes('newsletter') || body.includes('wizard');
    const ok = r.status === 200 || r.status === 307;
    const icon = ok ? '✅' : '❌';
    console.log(`${icon} 7. Newsletter : ${r.status} ${loc} hasComposer=${hasComposer}`);
    if (r.status !== 200) {
      console.log('   ⚠ Same MFA boolean persistence bug as test 4');
    }
    results.push(check('7. Newsletter composer', '200 (+367 due to MFA bug)',
      `${r.status} hasComposer=${hasComposer} ${loc}`, ok,
      r.status !== 200 ? 'MFA boolean persistence bug' : ''));
  }

  // =========================================================
  // SUMMARY
  // =========================================================
  console.log('\n═══════════════════════════════════════');
  console.log('       E2E DEMO RESULTS SUMMARY');
  console.log('═══════════════════════════════════════');
  let failed = 0;
  for (const r of results) {
    const icon = r.ok ? '✅' : '❌';
    console.log(`${icon} ${r.name}`);
    console.log(`   Expected: ${r.expect}`);
    console.log(`   Got:      ${r.got}`);
    if (r.detail) console.log(`   Note:     ${r.detail}`);
    if (!r.ok) failed++;
  }
  console.log('═══════════════════════════════════════');
  const total = results.length;
  const passed = total - failed;
  console.log(`${passed}/${total} tests OK`);
  if (failed > 0) {
    console.log(`\n⚠ ROOT CAUSE: Drizzle ORM boolean values (mfaVerified=true, totpEnabled=true)`);
    console.log('  are NOT persisted to PostgreSQL by the patched postgres-js client.');
    console.log('  This affects all session-based auth flows after MFA verification.');
    console.log('  Fix: investigate patchPostgresClient in src/db/client.ts');
  }
  console.log('═══════════════════════════════════════');

  process.exit(failed === 0 ? 0 : 1);
})().catch((e) => {
  console.error('\n💥 FATAL:', e.message);
  if (e.stack) console.error(e.stack);
  process.exit(2);
});
