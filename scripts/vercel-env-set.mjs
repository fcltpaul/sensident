#!/usr/bin/env node
/**
 * vercel-env-set.mjs — Ajoute/met a jour une variable d'env Vercel pour le projet Sensident.
 * Lit le token depuis token/vercel-token.txt et la valeur depuis argv ou stdin.
 *
 * Usage:
 *   node vercel-env-set.mjs DIAG_SECRET "valeur"
 *   echo "valeur" | node vercel-env-set.mjs DIAG_SECRET
 *
 * Targets: production + preview + development
 */
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const ROOT = process.cwd();
const [, , KEY, ...rest] = process.argv;
const VALUE = rest.join(' ').trim() || readFileSync(0, 'utf8').trim();

if (!KEY || !VALUE) {
  console.error('Usage: node vercel-env-set.mjs <KEY> <VALUE>');
  process.exit(1);
}

const TOKEN_PATH = join(ROOT, 'token', 'vercel-token.txt');
let TOKEN;
try {
  TOKEN = readFileSync(TOKEN_PATH, 'utf8').trim();
} catch {
  console.error('Token introuvable:', TOKEN_PATH);
  process.exit(1);
}

const PROJECT_ID = 'prj_ZGKFzM775ucAjf9THjEyiZH5dcDa';
const TEAM_ID = 'team_PgCi8gd6Qb1sCLOvepZoIEth';
const TARGETS = ['production', 'preview', 'development'];

async function listExisting() {
  const r = await fetch(
    `https://api.vercel.com/v10/projects/${PROJECT_ID}/env?teamId=${TEAM_ID}`,
    { headers: { Authorization: `Bearer ${TOKEN}` } },
  );
  if (!r.ok) {
    console.error('List env failed:', r.status, await r.text());
    process.exit(1);
  }
  return (await r.json()).envs ?? [];
}

async function upsert() {
  const existing = await listExisting();
  const match = existing.find((e) => e.key === KEY);
  if (match) {
    const r = await fetch(
      `https://api.vercel.com/v10/projects/${PROJECT_ID}/env/${match.id}?teamId=${TEAM_ID}`,
      {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${TOKEN}`, 'content-type': 'application/json' },
        body: JSON.stringify({ value: VALUE }),
      },
    );
    if (!r.ok) {
      console.error('Patch env failed:', r.status, await r.text());
      process.exit(1);
    }
    console.log(`✓ Updated ${KEY} (id=${match.id})`);
  } else {
    const r = await fetch(
      `https://api.vercel.com/v10/projects/${PROJECT_ID}/env?teamId=${TEAM_ID}`,
      {
        method: 'POST',
        headers: { Authorization: `Bearer ${TOKEN}`, 'content-type': 'application/json' },
        body: JSON.stringify({
          key: KEY,
          value: VALUE,
          type: 'plain',
          target: TARGETS,
        }),
      },
    );
    if (!r.ok) {
      console.error('Create env failed:', r.status, await r.text());
      process.exit(1);
    }
    const created = await r.json();
    console.log(`✓ Created ${KEY} (id=${created.id}, targets=${TARGETS.join(',')})`);
  }
}

upsert().catch((e) => {
  console.error('Unhandled error:', e);
  process.exit(1);
});