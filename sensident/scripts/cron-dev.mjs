/**
 * Sensident — Dev loop : declenche le cron toutes les X secondes
 *
 * En prod, le cron est declenche par pg_cron (sur Neon/Scaleway) ou
 * GitHub Actions schedule. En dev, on simule avec ce script.
 *
 * Usage : node --env-file=.env scripts/cron-dev.mjs [intervalSeconds]
 *   intervalSeconds defaut = 60
 *
 * Exemple : node --env-file=.env scripts/cron-dev.mjs 30
 *
 * HDS : tape dev.db local. Aucun contact Neon. CRON_SECRET signe chaque appel.
 */

import { createHmac } from 'node:crypto';

const CRON_SECRET = process.env.CRON_SECRET;
if (!CRON_SECRET) {
  console.error('CRON_SECRET manquant dans .env');
  process.exit(1);
}

const interval = parseInt(process.argv[2] || '60', 10);
const baseUrl = process.env.CRON_BASE_URL || 'http://localhost:3001';
const url = `${baseUrl}/api/cron/process-scheduled-newsletters`;

let runCount = 0;

async function tick() {
  runCount++;
  const ts = Date.now();
  const body = '';
  const sig = createHmac('sha256', CRON_SECRET).update(`${ts}.${body}`).digest('hex');
  const token = `${ts}.${sig}`;

  process.stdout.write(`[${new Date().toISOString()}] tick #${runCount} ... `);
  try {
    const r = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
    const text = await r.text();
    let summary = '';
    try {
      const j = JSON.parse(text);
      summary = j.dryRun
        ? `DRY due=${j.due}`
        : `processed=${j.processed} sent=${j.sent} failed=${j.failed} duration=${j.durationMs}ms`;
    } catch {
      summary = `non-JSON: ${text.slice(0, 100)}`;
    }
    console.log(`HTTP ${r.status} ${summary}`);
  } catch (e) {
    console.log(`ERR ${e.message}`);
  }
}

console.log(`\n  \u23f1\ufe0f  Sensident cron dev loop`);
console.log(`  URL       : ${url}`);
console.log(`  Interval  : ${interval}s`);
console.log(`  Secret    : ${CRON_SECRET.slice(0, 14)}...`);
console.log(`  Arret     : Ctrl+C\n`);

// Premier tick immediat, puis interval
tick();
setInterval(tick, interval * 1000);

// Gestion arret propre
process.on('SIGINT', () => {
  console.log(`\n  Arret apres ${runCount} ticks.`);
  process.exit(0);
});
