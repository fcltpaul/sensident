const fs = require('fs');
const path = require('path');

const BASE = 'http://localhost:3001';
const COOKIE_JAR = path.join(process.env.TEMP || '/tmp', 'sensident-e2e-cookies.txt');
const TS = Date.now();
const TEST_EMAIL = `e2e-dr-${TS}@test.local`;
const TEST_SLUG = `e2e-dr-${TS}`;
const TEST_PASS = 'e2eTestPassword!Abc';
const PATIENT_EMAIL = `e2e-patient-${TS}@test.local`;

function parseSetCookie(res) {
  const set = res.headers.getSetCookie ? res.headers.getSetCookie() : (res.headers.get('set-cookie') ? [res.headers.get('set-cookie')] : []);
  return set.map(c => c.split(';')[0]).join('; ');
}

async function request(method, url, body, cookie = '') {
  const init = { method, headers: {}, redirect: 'manual' };
  if (cookie) init.headers['Cookie'] = cookie;
  if (body) {
    init.headers['Content-Type'] = 'application/json';
    init.body = JSON.stringify(body);
  }
  const res = await fetch(BASE + url, init);
  const text = await res.text();
  let json = null;
  try { json = JSON.parse(text); } catch {}
  const newCookie = parseSetCookie(res).length > 0 ? parseSetCookie(res) : cookie;
  return { status: res.status, text, json, cookie: newCookie };
}

async function step(name, fn) {
  console.log(`\n=== ${name} ===`);
  let r;
  try {
    r = await fn();
    const snippet = JSON.stringify(r.json).slice(0, 200);
    console.log(`  -> ${r.status}`, snippet);
    return r;
  } catch (e) {
    console.log('  -> FAIL', e.message);
    throw e;
  }
}

(async () => {
  let cookie = '';

  // 1. Signup praticien
  const signup = await step('1. Signup praticien', () =>
    request('POST', '/api/practitioner/signup', {
      email: TEST_EMAIL,
      password: TEST_PASS,
      cabinetName: 'Cabinet du Dr E2E',
      slug: TEST_SLUG
    })
  );
  if (signup.status !== 200) throw new Error('signup failed: ' + signup.text);
  cookie = signup.cookie;
  const totpSecret = signup.json.totpSecret;

  // 2. Verify MFA (utilise le cookie du signup)
  const { authenticator } = require('otplib');
  authenticator.options = { window: 1 };
  const totpCode = authenticator.generate(totpSecret);
  const mfa = await step('2. Verify MFA (active MFA)', () =>
    request('POST', '/api/practitioner/verify-mfa', { totpCode }, cookie)
  );
  if (mfa.status !== 200) throw new Error('mfa failed: ' + mfa.text);
  cookie = mfa.cookie;

  // 3. Login
  const login = await step('3. Login praticien', () =>
    request('POST', '/api/practitioner/login', {
      email: TEST_EMAIL,
      password: TEST_PASS
    })
  );
  if (login.status !== 200) throw new Error('login failed');
  cookie = login.cookie;

  // 4. Verify MFA post-login
  const totpCode2 = authenticator.generate(totpSecret);
  const mfa2 = await step('4. Verify MFA post-login', () =>
    request('POST', '/api/practitioner/verify-mfa', { totpCode: totpCode2 }, cookie)
  );
  if (mfa2.status !== 200) throw new Error('mfa2 failed: ' + mfa2.text);
  cookie = mfa2.cookie;

  // 5. Create invite token
  const invite = await step('5. Create invite token', () =>
    request('POST', '/api/cabinet/invite-tokens', { maxUses: 100, durationDays: 30 }, cookie)
  );
  if (invite.status !== 200) throw new Error('invite failed: ' + invite.text);

  // 6. Dashboard
  console.log('\n=== 6. GET /dashboard (auth) ===');
  const dash = await fetch(BASE + '/dashboard', { headers: { Cookie: cookie }, redirect: 'manual' });
  console.log('  ->', dash.status);
  if (dash.status !== 200) throw new Error('dashboard not 200: ' + dash.status);

  // 7. Test article page publique
  console.log('\n=== 7. GET /articles/public ===');
  const article = await fetch(BASE + '/articles/brossage-dents-technique-bass', { redirect: 'manual' });
  console.log('  ->', article.status);

  console.log('\n=== TOUS LES TESTS PASSES ===');
  process.exit(0);
})().catch(e => {
  console.error('\nFATAL:', e.message);
  process.exit(1);
});
