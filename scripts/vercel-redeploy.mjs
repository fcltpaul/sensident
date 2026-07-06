#!/usr/bin/env node
/**
 * vercel-redeploy.mjs — Déclenche un redéploiement Vercel (sans nouveau commit)
 * en faisant un "noop" via l'API deployment. Utile pour forcer la prise en
 * compte d'un env var après modification.
 *
 * Usage : node vercel-redeploy.mjs
 */
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const TOKEN = readFileSync(join(process.cwd(), 'token', 'vercel-token.txt'), 'utf8').trim();
const PROJECT_ID = 'prj_ZGKFzM775ucAjf9THjEyiZH5dcDa';
const TEAM_ID = 'team_PgCi8gd6Qb1sCLOvepZoIEth';

(async () => {
  // 1) Récupérer le dernier déploiement READY
  const list = await fetch(
    `https://api.vercel.com/v6/deployments?projectId=${PROJECT_ID}&teamId=${TEAM_ID}&limit=1&state=READY`,
    { headers: { Authorization: `Bearer ${TOKEN}` } },
  );
  if (!list.ok) {
    console.error('List failed:', list.status, await list.text());
    process.exit(1);
  }
  const j = await list.json();
  const latest = j.deployments?.[0];
  if (!latest) {
    console.error('No READY deployment found');
    process.exit(1);
  }
  console.log('Latest READY:', latest.uid, latest.url);

  // 2) Récupérer les gitInfo du dernier déploiement (pour re-deploy avec le même commit)
  const det = await fetch(
    `https://api.vercel.com/v6/deployments/${latest.uid}?teamId=${TEAM_ID}`,
    { headers: { Authorization: `Bearer ${TOKEN}` } },
  );
  const d = await det.json();
  const meta = d.gitSource?.ref || d.gitSource?.sha || d.gitSource?.type;
  console.log('Git meta:', meta);

  // 3) Déclencher un redeploy
  const trigger = await fetch(
    `https://api.vercel.com/v13/deployments?teamId=${TEAM_ID}`,
    {
      method: 'POST',
      headers: { Authorization: `Bearer ${TOKEN}`, 'content-type': 'application/json' },
      body: JSON.stringify({
        name: d.name || 'sensident_v0',
        target: 'production',
        gitSource: {
          type: 'github',
          ref: 'main',
          repoId: d.gitSource?.repoId,
          orgId: d.gitSource?.orgId,
          sha: d.gitSource?.sha,
        },
      }),
    },
  );
  if (!trigger.ok) {
    console.error('Trigger failed:', trigger.status, await trigger.text());
    process.exit(1);
  }
  const t = await trigger.json();
  console.log('New deployment:', t.id, t.url, 'state:', t.readyState);
})();