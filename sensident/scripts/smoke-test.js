/**
 * Sensident — Smoke test minimal
 *
 * Verifie que les routes critiques repondent.
 * Usage: node scripts/smoke-test.js
 *
 * Demarre le serveur dans un autre terminal d'abord :
 *   node node_modules/next/dist/bin/next dev --port 3001
 */

const BASE = process.env.SMOKE_BASE_URL || 'http://localhost:3001';

const ROUTES = [
  { path: '/', expect: 200, name: 'Home' },
  { path: '/signup', expect: 200, name: 'Signup praticien' },
  { path: '/login', expect: 200, name: 'Login praticien' },
  { path: '/admin-auth/login', expect: 200, name: 'Login admin' },
  { path: '/admin', expect: 200, name: 'Admin (redirige si pas auth)' },
  { path: '/dashboard', expect: 200, name: 'Dashboard praticien (redirige si pas auth)' },
  { path: '/articles/brossage-dents-technique-bass', expect: 404, name: 'Article (404 car status=draft)' },
  { path: '/c/test/rejoindre', expect: 404, name: 'Rejoindre (404 car cabinet test inexistant)' },
  { path: '/desabonnement', expect: 200, name: 'Desabonnement' },
  { path: '/desabonnement/merci', expect: 200, name: 'Desabonnement merci' },
];

async function checkRoute(route) {
  try {
    const res = await fetch(`${BASE}${route.path}`, { redirect: 'follow' });
    const ok = res.status === route.expect;
    const status = ok ? '✓' : '✗';
    console.log(`${status} ${route.name.padEnd(40)} ${route.path.padEnd(40)} → ${res.status} (attendu ${route.expect})`);
    return ok;
  } catch (err) {
    console.log(`✗ ${route.name.padEnd(40)} ${route.path.padEnd(40)} → ERREUR: ${err.message}`);
    return false;
  }
}

async function main() {
  console.log(`\n=== Smoke test Sensident ===\nBase: ${BASE}\n`);
  let passed = 0;
  for (const r of ROUTES) {
    if (await checkRoute(r)) passed++;
  }
  console.log(`\n${passed}/${ROUTES.length} routes OK.`);
  if (passed === ROUTES.length) {
    console.log('✅ Tous les smoke tests passent.');
    process.exit(0);
  } else {
    console.log('⚠ Certains tests echouent. Voir le detail ci-dessus.');
    process.exit(1);
  }
}

main();
