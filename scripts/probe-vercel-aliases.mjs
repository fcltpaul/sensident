#!/usr/bin/env node
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
const TOKEN = readFileSync(join(process.cwd(), 'token', 'vercel-token.txt'), 'utf8').trim();
const PROJECT_ID = 'prj_ZGKFzM775ucAjf9THjEyiZH5dcDa';
const TEAM_ID = 'team_PgCi8gd6Qb1sCLOvepZoIEth';
(async () => {
  const r = await fetch(
    `https://api.vercel.com/v4/aliases?projectId=${PROJECT_ID}&teamId=${TEAM_ID}`,
    { headers: { Authorization: `Bearer ${TOKEN}` } },
  );
  if (!r.ok) { console.error(r.status, await r.text()); process.exit(1); }
  const j = await r.json();
  console.log('Aliases:');
  (j.aliases || []).slice(0, 5).forEach((a) => console.log(' ', a.alias, '→', a.deployment?.url));
})();