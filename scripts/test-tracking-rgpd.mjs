#!/usr/bin/env node
/**
 * test-tracking-rgpd.mjs — Valide les checks RGPD sur /api/track/* en prod.
 *
 * Cas testés :
 * 1) heartbeat sans cabinetId → success anonymous
 * 2) heartbeat avec cabinetId valide mais SANS patientEmailHash → log anonymous
 * 3) heartbeat avec cabinetId + patientEmailHash bidon (patient inexistant) → log anonymous
 * 4) reactions avec patientEmailHash bidon → 403 consent_required
 * 5) email-open pixel avec token bidon → 200 GIF (silencieux)
 */
const BASE = process.argv[2] || 'https://sensidentv0-git-main-fcltpaul-gmailcoms-projects.vercel.app';
const CAB = '550e8400-e29b-41d4-a716-446655440000'; // UUID bidon
const FAKE_HASH = '0000000000000000000000000000000000000000000000000000000000000000';

async function post(path, body) {
  const r = await fetch(`${BASE}${path}`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  });
  return { status: r.status, body: await r.text() };
}

async function get(path) {
  const r = await fetch(`${BASE}${path}`);
  return { status: r.status, body: await r.text() };
}

(async () => {
  console.log('=== Test 1: heartbeat sans cabinetId ===');
  let r = await post('/api/track/heartbeat', {
    sessionId: 'rgpd-test-1',
    articleSlug: 'test',
    source: 'site',
    scrollPct: 50,
    tabVisible: true,
    slideIndex: 1,
    duration: 30,
  });
  console.log('  HTTP', r.status, '→', r.body);

  console.log('=== Test 2: heartbeat avec cabinetId, SANS patientEmailHash ===');
  r = await post('/api/track/heartbeat', {
    sessionId: 'rgpd-test-2',
    articleSlug: 'test',
    source: 'site',
    cabinetId: CAB,
    scrollPct: 50,
    tabVisible: true,
    slideIndex: 1,
    duration: 30,
  });
  console.log('  HTTP', r.status, '→', r.body);

  console.log('=== Test 3: heartbeat avec cabinetId + patientEmailHash bidon ===');
  r = await post('/api/track/heartbeat', {
    sessionId: 'rgpd-test-3',
    articleSlug: 'test',
    source: 'site',
    cabinetId: CAB,
    scrollPct: 50,
    tabVisible: true,
    slideIndex: 1,
    duration: 30,
    patientEmailHash: FAKE_HASH,
  });
  console.log('  HTTP', r.status, '→', r.body);

  console.log('=== Test 4: reactions avec patientEmailHash bidon → 403 consent_required ===');
  r = await post('/api/reactions', {
    articleId: 'test-article',
    cabinetId: CAB,
    patientEmailHash: FAKE_HASH,
    reaction: 'up',
  });
  console.log('  HTTP', r.status, '→', r.body);

  console.log('=== Test 5: email-open pixel avec token bidon → 200 GIF silencieux ===');
  r = await get('/api/track/email-open?t=fake.token');
  console.log('  HTTP', r.status, '→ GIF (' + r.body.length + ' bytes, first 20: ' + r.body.slice(0, 20) + ')');

  console.log('=== Test 6: email-open pixel sans token → 200 GIF silencieux ===');
  r = await get('/api/track/email-open');
  console.log('  HTTP', r.status, '→ GIF (' + r.body.length + ' bytes)');
})();