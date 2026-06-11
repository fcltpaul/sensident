// Audit statique non destructif (lecture seule)
const fs = require('fs');
const path = require('path');

function walk(dir, out = []) {
  for (const f of fs.readdirSync(dir)) {
    const p = path.join(dir, f);
    const s = fs.statSync(p);
    if (s.isDirectory()) walk(p, out);
    else if (f.endsWith('.ts') || f.endsWith('.tsx')) out.push(p);
  }
  return out;
}

const files = walk('src');
const findings = {
  pgCastInApp: [],
  pgFuncsInApp: [],
  rawSqlNow: [],
  ddlInApp: [],
  consoleLog: [],
  longFiles: [],
};

for (const f of files) {
  const c = fs.readFileSync(f, 'utf8');
  const lines = c.split(/\r?\n/);
  const rel = f.replace(/\\/g, '/');

  // PG casts :: dans le code applicatif (hors scripts SQL)
  lines.forEach((l, i) => {
    if (/\b::(int|bigint|text|uuid|timestamp|boolean|jsonb|date|json)\b/i.test(l)) {
      findings.pgCastInApp.push(`${rel}:${i + 1} ${l.trim()}`);
    }
  });

  // now() / gen_random_uuid() / EXTRACT() / age() à l'intérieur de sql`...` ou raw
  const sqlRaw = c.match(/sql`[^`]*`/g) || [];
  for (const chunk of sqlRaw) {
    if (/\bnow\s*\(/i.test(chunk)) findings.rawSqlNow.push(`${rel}: sql\`${chunk.slice(0, 80)}...`);
    if (/\bgen_random_uuid\s*\(/i.test(chunk)) findings.rawSqlNow.push(`${rel}: sql\`${chunk.slice(0, 80)}...`);
  }

  // Fonctions PG dans du JS nu (en dehors de Date.now() / helpers JS)
  lines.forEach((l, i) => {
    if (/\bgen_random_uuid\s*\(/.test(l) && !/Date\.now/.test(l)) {
      findings.pgFuncsInApp.push(`${rel}:${i + 1} ${l.trim()}`);
    }
    if (/\bEXTRACT\s*\(\s*(HOUR|YEAR|MONTH|DAY)\s+FROM/i.test(l)) {
      findings.pgFuncsInApp.push(`${rel}:${i + 1} ${l.trim()}`);
    }
  });

  // console.log résiduels
  if (/console\.log\(/.test(c) && !/scripts\//.test(rel)) {
    const m = c.match(/console\.log\(/g) || [];
    findings.consoleLog.push(`${rel}: ${m.length} occurrences`);
  }

  // Fichiers longs (>300 lignes) à scinder
  if (lines.length > 300) findings.longFiles.push(`${rel}: ${lines.length} lignes`);
}

console.log('=== AUDIT STATIQUE NON DESTRUCTIF ===\n');
console.log(`Fichiers scannés: ${files.length}\n`);

console.log(`PG casts (::) dans code app: ${findings.pgCastInApp.length}`);
findings.pgCastInApp.slice(0, 15).forEach(x => console.log('  -', x));

console.log(`\nFonctions PG-only hors helpers: ${findings.pgFuncsInApp.length}`);
findings.pgFuncsInApp.slice(0, 15).forEach(x => console.log('  -', x));

console.log(`\nnow()/gen_random_uuid() dans sql\`\`: ${findings.rawSqlNow.length}`);
findings.rawSqlNow.slice(0, 15).forEach(x => console.log('  -', x));

console.log(`\nconsole.log en code app: ${findings.consoleLog.length}`);
findings.consoleLog.slice(0, 15).forEach(x => console.log('  -', x));

console.log(`\nFichiers >300 lignes: ${findings.longFiles.length}`);
findings.longFiles.slice(0, 15).forEach(x => console.log('  -', x));
