#!/usr/bin/env node
/**
 * probe-vercel-deploy.mjs — Récupère les URLs d'un déploiement Vercel.
 */
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const TOKEN = readFileSync(join(process.cwd(), 'token', 'vercel-token.txt'), 'utf8').trim();
const DEPLOY_ID = process.argv[2] || 'dpl_95D2oz2y';

(async () => {
  const r = await fetch(`https://api.vercel.com/v6/deployments/${DEPLOY_ID}`, {
    headers: { Authorization: `Bearer ${TOKEN}` },
  });
  if (!r.ok) {
    console.error('Status:', r.status, await r.text());
    process.exit(1);
  }
  const j = await r.json();
  console.log('UID:', j.uid);
  console.log('URL:', j.url);
  console.log('Alias:', (j.aliases || []).join(', '));
  console.log('State:', j.readyState || j.state);
})();