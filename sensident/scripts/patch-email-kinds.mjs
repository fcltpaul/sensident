// Patch rapide : ajoute kind: 'xxx' a chaque sendEmail() qui en a pas
import { readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const files = [
  {
    path: 'src/app/api/patient/forget/route.ts',
    // marqueur unique -> on insere `kind:` apres le sujet
    marker: 'subject: `[RGPD art.17] Demande d\'anonymisation de donnees patient`,',
    addition: "          kind: 'rgpd_forget_dpo',",
  },
];

for (const f of files) {
  const fullPath = join(process.cwd(), f.path);
  const content = readFileSync(fullPath, 'utf-8');
  if (!content.includes(f.marker)) {
    console.warn(`[skip] ${f.path}: marker not found`);
    continue;
  }
  if (content.includes(f.addition)) {
    console.log(`[ok] ${f.path}: kind already present`);
    continue;
  }
  const updated = content.replace(f.marker, f.marker + '\n' + f.addition);
  writeFileSync(fullPath, updated, 'utf-8');
  console.log(`[patched] ${f.path}`);
}
