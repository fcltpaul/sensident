/**
 * Sensident — Init PostgreSQL (Neon / HDS prod)
 *
 * Pousse le schema.pg.ts vers une base PostgreSQL via drizzle-kit push.
 * Idempotent : peut être réexécuté sans erreur (CREATE TABLE IF NOT EXISTS
 * généré par drizzle-kit sur les tables existantes).
 *
 * Usage :
 *   DATABASE_URL=postgresql://... npx tsx scripts/init-pg.ts
 *   DATABASE_URL=postgresql://... node --import tsx scripts/init-pg.ts
 *
 * Sécurité :
 *   - Refuse sslmode non chiffré (HDS)
 *   - Refuse de tourner en NODE_ENV=test (risque d'écraser la BDD de CI)
 */
import { spawnSync } from 'node:child_process';
import path from 'node:path';

const url = process.env.DATABASE_URL;
if (!url || !url.startsWith('postgres')) {
  console.error('❌ DATABASE_URL doit commencer par postgres://');
  console.error('   Reçu :', url ? url.slice(0, 40) + '…' : '(vide)');
  process.exit(1);
}

if (process.env.NODE_ENV === 'test') {
  console.error('❌ Refus de pousser le schéma en NODE_ENV=test (CI)');
  process.exit(1);
}

if (
  process.env.NODE_ENV === 'production' &&
  !url.includes('sslmode=require') &&
  !url.includes('sslmode=verify-full') &&
  !url.includes('sslmode=no-verify')
) {
  console.error('❌ DATABASE_URL doit inclure sslmode=require en production (HDS)');
  process.exit(1);
}

console.log('🌱 Push du schéma PG vers :', url.replace(/:[^:@]+@/, ':***@').slice(0, 80));
console.log('   NODE_ENV =', process.env.NODE_ENV || '(non défini)');
console.log();

const projectRoot = path.resolve(__dirname, '..');
const result = spawnSync(
  'npx',
  [
    'drizzle-kit',
    'push',
    '--config=drizzle.config.ts',
    '--force',
    '--verbose=false',
  ],
  {
    cwd: projectRoot,
    stdio: 'inherit',
    env: { ...process.env, DATABASE_URL: url },
  }
);

if (result.status !== 0) {
  console.error('\n❌ drizzle-kit push a échoué (exit', result.status, ')');
  process.exit(result.status ?? 1);
}

console.log('\n✅ Schéma poussé. Tu peux maintenant lancer le seed démo :');
console.log('   DATABASE_URL=… node scripts/seed-demo-francois-pg.mjs');
