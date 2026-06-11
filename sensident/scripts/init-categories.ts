/**
 * Sensident — Seed categories hierarchiques
 *
 * 3 grandes categories racine, 10 sous-categories total.
 * Aligne sur la liste d'articles que Paul a demandee :
 *   Caries (3 sous) / Langue / Cancer langue / Salive / Collage / Abces / Maladies rares / Gingivite
 */
import { createClient } from '@libsql/client';
import path from 'node:path';

const dbFile = process.env.DATABASE_URL?.replace('file:', '') || path.join(process.cwd(), 'dev.db');
const client = createClient({ url: `file:${dbFile}` });

const CATEGORIES = [
  // Racines
  { code: 'prevention',  name: 'Prevention',         description: 'Gestes et habitudes pour eviter les problemes dentaires', icon: 'Shield',     color: '#3B82F6', position: 1 },
  { code: 'pathologie',  name: 'Pathologies',        description: 'Maladies et infections de la bouche et des dents',         icon: 'AlertCircle', color: '#EF4444', position: 2 },
  { code: 'soins',       name: 'Soins dentaires',    description: 'Les soins pratiques et techniques au cabinet',             icon: 'Wrench',     color: '#10B981', position: 3 },

  // Sous-categories prevention
  { code: 'hygiene',         parent: 'prevention',  name: 'Hygiene bucco-dentaire', description: 'Brossage, brossette, fil, gratte-langue',  icon: 'Brush',      color: '#06B6D4' },
  { code: 'alimentation',    parent: 'prevention',  name: 'Alimentation',           description: 'Ce qu\'on mange boit, et son impact sur les dents', icon: 'Apple',     color: '#84CC16' },
  { code: 'enfants',         parent: 'prevention',  name: 'Prevention enfants',     description: 'Suivi bucco-dentaire de 0 a 12 ans',         icon: 'Baby',       color: '#F59E0B' },

  // Sous-categories pathologie
  { code: 'carie',           parent: 'pathologie',  name: 'Les caries',             description: 'Tout sur la carie dentaire',                  icon: 'Bug',        color: '#DC2626' },
  { code: 'gingivite',       parent: 'pathologie',  name: 'Gingivite et parodontie', description: 'Maladies des gencives',                    icon: 'Droplet',    color: '#B91C1C' },
  { code: 'langue',          parent: 'pathologie',  name: 'Pathologies de la langue', description: 'Infections, lesions, cancer de la langue',   icon: 'MessageCircle', color: '#991B1B' },
  { code: 'cancer-buccal',   parent: 'pathologie',  name: 'Cancers de la bouche',   description: 'Detection precoce et prevention',           icon: 'AlertTriangle', color: '#7F1D1D' },
  { code: 'maladies-rares',  parent: 'pathologie',  name: 'Maladies rares',         description: 'Pathologies bucco-dentaires rares',          icon: 'Sparkles',   color: '#581C87' },
  { code: 'salive',          parent: 'pathologie',  name: 'Salive et glandes',      description: 'Role de la salive, pathologies des glandes', icon: 'Droplets',  color: '#0891B2' },

  // Sous-categories soins
  { code: 'collage',         parent: 'soins',       name: 'Technique de collage',    description: 'Restaurations composites, adhesion',         icon: 'Layers',     color: '#0EA5E9' },
  { code: 'abces',           parent: 'soins',       name: 'Abces dentaires',        description: 'Diagnostic et traitement d\'urgence',         icon: 'Zap',        color: '#EA580C' },
];

async function main() {
  console.log('Insertion des categories...');

  const idByCode: Record<string, string> = {};

  // D'abord les racines
  for (const c of CATEGORIES.filter((c) => !('parent' in c))) {
    const id = `cat-${c.code}`;
    idByCode[c.code] = id;
    await client.execute({
      sql: `INSERT OR IGNORE INTO categories (id, code, name, description, parent_id, icon, color, position) VALUES (?, ?, ?, ?, NULL, ?, ?, ?)`,
      args: [id, c.code, c.name, c.description ?? null, c.icon ?? null, c.color ?? null, c.position ?? 0],
    });
  }

  // Puis les enfants
  for (const c of CATEGORIES.filter((c) => 'parent' in c)) {
    const id = `cat-${c.code}`;
    const parentId = idByCode[(c as any).parent];
    idByCode[c.code] = id;
    await client.execute({
      sql: `INSERT OR IGNORE INTO categories (id, code, name, description, parent_id, icon, color, position) VALUES (?, ?, ?, ?, ?, ?, ?, 0)`,
      args: [id, c.code, c.name, c.description ?? null, parentId, c.icon ?? null, c.color ?? null],
    });
  }

  console.log(`✅ ${CATEGORIES.length} categories inserees (3 racines + ${CATEGORIES.length - 3} sous-categories).`);
  console.log('\nArbre :');
  console.log('  Prevention/');
  console.log('    - Hygiene bucco-dentaire');
  console.log('    - Alimentation');
  console.log('    - Prevention enfants');
  console.log('  Pathologies/');
  console.log('    - Les caries');
  console.log('    - Gingivite et parodontie');
  console.log('    - Pathologies de la langue');
  console.log('    - Cancers de la bouche');
  console.log('    - Maladies rares');
  console.log('    - Salive et glandes');
  console.log('  Soins dentaires/');
  console.log('    - Technique de collage');
  console.log('    - Abces dentaires');
}

main().catch((e) => { console.error(e); process.exit(1); });
