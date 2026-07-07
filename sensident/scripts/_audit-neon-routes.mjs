// scripts/_audit-neon-routes.mjs
// Audit des routes /api/* qui utilisent eq(*cabinetId) Drizzle sans branche Neon raw SQL.
// Affiche les fichiers a risque de crash Neon avec le contexte exact.

import fs from 'node:fs';
import path from 'node:path';

const ROOTS = [
  'src/app/api/practitioner',
  'src/app/api/cabinet',
  'src/app/api/library',
  'src/app/api/newsletter',
  'src/app/api/billing',
  'src/app/api/patient',
  'src/app/api/reactions',
  'src/app/api/track',
  'src/app/api/stripe',
];

function walkRouteFiles(dir) {
  if (!fs.existsSync(dir)) return [];
  const out = [];
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, e.name);
    if (e.isDirectory()) out.push(...walkRouteFiles(full));
    else if (e.isFile() && e.name === 'route.ts') out.push(full);
  }
  return out;
}

const reports = [];

for (const root of ROOTS) {
  const files = walkRouteFiles(root);
  for (const file of files) {
    const content = fs.readFileSync(file, 'utf8');

    // Pattern 1: eq(*cabinetId) Drizzle
    // On matche eq(IDENT.cabinetId, ...) dans le code, mais on exclut les blocs
    // commentés et les chaines (entre guillemets).
    const lines = content.split('\n');
    const matches = [];
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      // Enlever les commentaires en ligne pour le scan
      const stripped = line.replace(/\/\/.*$/, '');
      if (/eq\([a-zA-Z_]+\.cabinetId\b/.test(stripped)) {
        matches.push({ line: i + 1, text: line.trim() });
      }
    }

    if (matches.length === 0) continue;

    // Verifier si le fichier a une branche DB_DIALECT === 'postgresql' rawSqlClient
    // qui ferait double-emploi (pattern safe).
    // Heuristique: presence de `rawSqlClient` ET d'un bloc `if (DB_DIALECT === 'postgresql')`.
    const hasNeonBranch = /DB_DIALECT\s*===\s*['"]postgresql['"]/.test(content) &&
                          /rawSqlClient/.test(content);

    // On ignore les fichiers qui ont deja une branche Neon.
    if (hasNeonBranch) continue;

    reports.push({ file, matches });
  }
}

console.log(`=== ${reports.length} fichier(s) a risque Neon ===\n`);
for (const r of reports) {
  console.log(`--- ${r.file} ---`);
  for (const m of r.matches) {
    console.log(`  L${m.line}: ${m.text}`);
  }
  console.log();
}