/**
 * Seed les categories sur Neon PostgreSQL.
 * Les categories sont deja dans le seed SQLite (seed-full.ts).
 * Ce script les cree sur PG pour que les filtres fonctionnent.
 */
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import postgres from 'postgres';

const envPath = resolve(import.meta.dirname, '..', '.env');
const env = readFileSync(envPath, 'utf-8');
const url = env.split('\n').find(l => l.startsWith('DATABASE_URL='))?.split('=').slice(1).join('=');
if (!url) { console.error('No DATABASE_URL'); process.exit(1); }

const sql = postgres(url, { ssl: 'require' });

const categories = [
  { code: 'prevention',      name: 'Prévention',          desc: 'Gestes et habitudes pour éviter les problèmes dentaires',      icon: 'Shield',      color: '#3B82F6', pos: 1, parent: null },
  { code: 'pathologie',      name: 'Pathologies',         desc: 'Maladies et infections de la bouche et des dents',             icon: 'AlertCircle', color: '#EF4444', pos: 2, parent: null },
  { code: 'soins',           name: 'Soins dentaires',     desc: 'Les soins pratiques et techniques au cabinet',                 icon: 'Wrench',      color: '#10B981', pos: 3, parent: null },
  { code: 'hygiene',         name: 'Hygiène bucco-dentaire', desc: 'Brossage, brossette, fil',                                   icon: 'Brush',       color: '#06B6D4', pos: 1, parent: 'prevention' },
  { code: 'alimentation',    name: 'Alimentation',        desc: 'Impact des aliments sur les dents',                             icon: 'Apple',       color: '#84CC16', pos: 2, parent: 'prevention' },
  { code: 'enfants',         name: 'Prévention enfants',  desc: 'Suivi bucco-dentaire 0-12 ans',                                 icon: 'Baby',        color: '#F59E0B', pos: 3, parent: 'prevention' },
  { code: 'carie',           name: 'Les caries',          desc: 'Tout sur la carie dentaire',                                    icon: 'Bug',         color: '#DC2626', pos: 1, parent: 'pathologie' },
  { code: 'gingivite',       name: 'Gingivite et parodontie', desc: 'Maladies des gencives',                                     icon: 'Droplet',     color: '#B91C1C', pos: 2, parent: 'pathologie' },
  { code: 'langue',          name: 'Pathologies de la langue', desc: 'Infections, lésions, cancer de la langue',                  icon: 'MessageCircle', color: '#991B1B', pos: 3, parent: 'pathologie' },
  { code: 'cancer-buccal',   name: 'Cancers de la bouche', desc: 'Détection précoce et prévention',                              icon: 'AlertTriangle', color: '#7F1D1D', pos: 4, parent: 'pathologie' },
  { code: 'maladies-rares',  name: 'Maladies rares',      desc: 'Pathologies bucco-dentaires rares',                            icon: 'Sparkles',    color: '#581C87', pos: 5, parent: 'pathologie' },
  { code: 'salive',          name: 'Salive et glandes',   desc: 'Rôle de la salive, pathologies des glandes salivaires',         icon: 'Droplets',    color: '#0891B2', pos: 6, parent: 'pathologie' },
  { code: 'collage',         name: 'Technique de collage', desc: 'Restaurations composites, adhésion',                            icon: 'Layers',      color: '#0EA5E9', pos: 1, parent: 'soins' },
  { code: 'abces',           name: 'Abcès dentaires',     desc: 'Diagnostic et traitement d\'urgence',                           icon: 'Zap',         color: '#EA580C', pos: 2, parent: 'soins' },
];

// Get parent id map
const parentIds = {};
for (const c of categories.filter(c => !c.parent)) {
  const r = await sql.unsafe("INSERT INTO categories (code, name, description, icon, color, position) VALUES ($1, $2, $3, $4, $5, $6) ON CONFLICT (code) DO UPDATE SET name=EXCLUDED.name RETURNING id", [c.code, c.name, c.desc, c.icon, c.color, c.pos]);
  parentIds[c.code] = r[0].id;
  console.log(`  ${c.code} -> ${r[0].id}`);
}

for (const c of categories.filter(c => c.parent)) {
  await sql.unsafe("INSERT INTO categories (code, name, description, icon, color, position, parent_id) VALUES ($1, $2, $3, $4, $5, $6, $7) ON CONFLICT (code) DO UPDATE SET name=EXCLUDED.name", [c.code, c.name, c.desc, c.icon, c.color, c.pos, parentIds[c.parent]]);
  console.log(`  ${c.code} (child of ${c.parent})`);
}

console.log('\nDone. 14 categories seeded on Neon.');
await sql.end();
