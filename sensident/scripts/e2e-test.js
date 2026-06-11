const fs = require('fs');
const path = require('path');
const crypto = require('node:crypto');

const BASE = 'http://localhost:3001';
const COOKIE = path.join(process.env.TEMP || '/tmp', 'sensident-e2e-cookies.txt');
try { fs.unlinkSync(COOKIE); } catch {}

// Generate unique test identities per run
const TS = Date.now();
const TEST_EMAIL = `e2e-dr-${TS}@test.local`;
const TEST_SLUG = `e2e-dr-${TS}`;
const TEST_PASS = 'e2eTestPassword!Abc';
const PATIENT_EMAIL = `e2e-patient-${TS}@test.local`;

function parseCookieFromResponse(res) {
  const set = res.headers.getSetCookie ? res.headers.getSetCookie() : (res.headers.get('set-cookie') ? [res.headers.get('set-cookie')] : []);
  if (!set || set.length === 0) return '';
  return set.map(c => c.split(';')[0]).join('; ');
}

async function step(name, fn) {
  console.log(`\n=== ${name} ===`);
  try {
    const r = await fn();
    console.log('  -> OK', JSON.stringify(r).slice(0, 200));
    return r;
  } catch (e) {
    console.log('  -> FAIL', e.message);
    throw e;
  }
}

async function call(method, url, body, cookie = '') {
  const init = { method, headers: {} };
  if (cookie) init.headers['Cookie'] = cookie;
  if (body) {
    init.headers['Content-Type'] = 'application/json';
    init.body = JSON.stringify(body);
  }
  const res = await fetch(BASE + url, init);
  const text = await res.text();
  let json = null;
  try { json = JSON.parse(text); } catch {}
  const newCookie = parseCookieFromResponse(res);
  return { status: res.status, text, json, cookie: newCookie || cookie };
}

(async () => {
  // 1. Signup praticien (unique email per run)
  const signup = await step('1. Signup praticien', () =>
    call('POST', '/api/practitioner/signup', {
      email: TEST_EMAIL,
      password: TEST_PASS,
      cabinetName: 'Cabinet du Dr E2E',
      slug: TEST_SLUG
    })
  );
  if (signup.status !== 200) throw new Error('signup failed: ' + signup.text);
  const cookie1 = signup.cookie;
  console.log('  totpSecret:', signup.json.totpSecret);

  // 2. Verify MFA
  const { authenticator } = require('otplib');
  authenticator.options = { window: 1 };
  const totpCode = authenticator.generate(signup.json.totpSecret);
  console.log('  TOTP code:', totpCode);
  const mfa = await step('2. Verify MFA (active MFA)', () =>
    call('POST', '/api/practitioner/verify-mfa', { totpCode }, cookie1)
  );
  if (mfa.status !== 200) throw new Error('mfa failed: ' + mfa.text);
  const cookie2 = mfa.cookie;

  // 3. Login
  const login = await step('3. Login praticien', () =>
    call('POST', '/api/practitioner/login', {
      email: TEST_EMAIL,
      password: TEST_PASS
    })
  );
  if (login.status !== 200) throw new Error('login failed');
  console.log('  requiresMfa:', login.json.requiresMfa);
  const cookie3 = login.cookie;

  // 4. Verify MFA post-login
  const totpCode2 = authenticator.generate(signup.json.totpSecret);
  const mfa2 = await step('4. Verify MFA post-login', () =>
    call('POST', '/api/practitioner/verify-mfa', { totpCode: totpCode2 }, cookie3)
  );
  if (mfa2.status !== 200) throw new Error('mfa2 failed: ' + mfa2.text);
  const cookie4 = mfa2.cookie;

  // 5. Create invite token
  const invite = await step('5. Create invite token', () =>
    call('POST', '/api/cabinet/invite-tokens', { maxUses: 100, durationDays: 30 }, cookie4)
  );
  if (invite.status !== 200) throw new Error('invite failed: ' + invite.text);
  console.log('  invite URL:', invite.json.url?.slice(0, 80) + '...');

  // 6. Récupérer le cabinetId réel
  const { createClient } = require('@libsql/client');
  const db = createClient({ url: 'file:C:/Users/clawuser/.openclaw/workspace-tartrinator/sensident/dev.db' });
  const cabRow = (await db.execute(`SELECT id, slug FROM cabinets WHERE slug='${TEST_SLUG}'`)).rows[0];
  console.log('  cabinet real id:', cabRow.id);

  // 7. Patient optin
  const optin = await step('7. Patient optin', () =>
    call('POST', '/api/patient/optin', {
      cabinetId: cabRow.id,
      email: PATIENT_EMAIL,
      cguAccepted: true,
      newsletterOptin: true
    })
  );
  if (optin.status !== 200) throw new Error('optin failed: ' + optin.text);
  console.log('  optin OK:', optin.json);

  // 8. Force confirmedAt pour simuler le clic email (en dev)
  await db.execute({
    sql: "UPDATE patient_consents SET confirmed_at = unixepoch() WHERE cabinet_id = ? AND newsletter_optin = 1",
    args: [cabRow.id]
  });
  console.log('  confirmed_at forcé en BDD (simule clic email)');

  // 9. Demander un magic link
  const ml = await step('9. Demander magic link patient', () =>
    call('POST', '/api/patient/magic-link', {
      email: PATIENT_EMAIL,
      cabinetSlug: TEST_SLUG
    })
  );
  if (ml.status !== 200) throw new Error('magic link request failed');
  console.log('  magic link response:', ml.json);

  // 10. GET pages publiques
  const acceuilP = await step('10. GET /c/{slug}/bienvenue', () =>
    fetch(BASE + '/c/' + TEST_SLUG + '/bienvenue', { redirect: 'manual' })
  );
  console.log('  bienvenue status:', acceuilP.status);

  // 11. GET dashboard praticien (avec cookie)
  const dashRes = await fetch(BASE + '/dashboard', { headers: { Cookie: cookie4 }, redirect: 'manual' });
  console.log(`  GET /dashboard (auth) status: ${dashRes.status}`);

  // 12. Test article (le seed existe ?)
  const seedRow = (await db.execute("SELECT slug FROM articles WHERE status='validated' LIMIT 1")).rows[0];
  console.log('  seed article:', seedRow?.slug);
  if (seedRow) {
    const articleRes = await fetch(BASE + '/articles/' + seedRow.slug, { redirect: 'manual' });
    console.log(`  GET /articles/${seedRow.slug} status: ${articleRes.status}`);
  }

  // 13. Cleanup: remove test data
  await db.execute(`DELETE FROM practitioners WHERE email = '${TEST_EMAIL}'`);
  await db.execute(`DELETE FROM cabinets WHERE slug = '${TEST_SLUG}'`);
  console.log('  cleanup OK');

  console.log('\n=== TOUS LES TESTS PASSES ===');
  process.exit(0);
})().catch(e => {
  console.error('\nFATAL:', e.message);
  console.error(e.stack);
  process.exit(1);
});
