/**
 * Sensident — Seed 8 catégories sur Neon
 */
import { randomUUID } from 'node:crypto';
import postgres from 'postgres';
import fs from 'node:fs';

const env = fs.readFileSync('.env', 'utf-8');
const url = env.split('\n').find(l => l.startsWith('DATABASE_URL=')).split('=').slice(1).join('=');
const sql = postgres(url, { ssl: 'require', max: 1 });

const CATEGORIES = [
  { code: 'hygiene', name: 'Hygiène quotidienne', description: 'Brossage, fil dentaire, bain de bouche', icon: 'tooth', color: '#0D9488', position: 1 },
  { code: 'alimentation', name: 'Alimentation', description: 'Sucre, acide, hydratation', icon: 'apple', color: '#F59E0B', position: 2 },
  { code: 'enfants', name: 'Enfants', description: 'Prévention dès le plus jeune âge', icon: 'baby', color: '#EC4899', position: 3 },
  { code: 'carie', name: 'Carie', description: 'Comprendre et prévenir la carie', icon: 'bug', color: '#EF4444', position: 4 },
  { code: 'gingivite', name: 'Gencives & parodonte', description: 'Gingivite, parodontite, saignements', icon: 'heart', color: '#DC2626', position: 5 },
  { code: 'prevention', name: 'Prévention globale', description: 'Santé bucco-dentaire et santé générale', icon: 'shield', color: '#8B5CF6', position: 6 },
  { code: 'soins', name: 'Soins réguliers', description: 'Détartrage, bilans, soins préventifs', icon: 'stethoscope', color: '#3B82F6', position: 7 },
  { code: 'pathologie', name: 'Pathologies', description: 'Carie, aphte, sensibilité, bruxisme', icon: 'alert', color: '#F97316', position: 8 },
];

async function main() {
  console.log('🌱 Seed catégories Neon\n');
  for (const c of CATEGORIES) {
    try {
      await sql`
        INSERT INTO categories (id, code, name, description, icon, color, position, created_at)
        VALUES (${randomUUID()}, ${c.code}, ${c.name}, ${c.description}, ${c.icon}, ${c.color}, ${c.position}, now())
        ON CONFLICT (code) DO UPDATE SET name=EXCLUDED.name, description=EXCLUDED.description
      `;
      console.log(`  ✅ ${c.code}`);
    } catch (e) {
      console.log(`  ❌ ${c.code}: ${e.message}`);
    }
  }

  // Insérer aussi les templates newsletter de base
  const TEMPLATES = [
    { code: 'classic-5', name: 'Classique 5 slides', description: 'Newsletter classique 5 slides, 1 par sujet', react_email_path: 'emails/newsletter-classic-5.tsx', is_active: true },
    { code: 'minimal-3', name: 'Minimaliste 3 slides', description: 'Version courte 3 slides', react_email_path: 'emails/newsletter-minimal-3.tsx', is_active: true },
    { code: 'warm-5', name: 'Chaleureuse 5 slides', description: 'Ton chaleureux, 5 slides', react_email_path: 'emails/newsletter-warm-5.tsx', is_active: true },
    { code: 'expert-5', name: 'Experte 5 slides', description: 'Ton expert, données scientifiques', react_email_path: 'emails/newsletter-expert-5.tsx', is_active: true },
    { code: 'family-5', name: 'Famille 5 slides', description: 'Adaptée aux familles avec enfants', react_email_path: 'emails/newsletter-family-5.tsx', is_active: true },
  ];

  console.log('\n🌱 Seed templates newsletter\n');
  for (const t of TEMPLATES) {
    try {
      await sql`
        INSERT INTO newsletter_templates (id, code, name, description, react_email_path, is_active, created_at)
        VALUES (${randomUUID()}, ${t.code}, ${t.name}, ${t.description}, ${t.react_email_path}, ${t.is_active}, now())
        ON CONFLICT (code) DO UPDATE SET name=EXCLUDED.name
      `;
      console.log(`  ✅ ${t.code}`);
    } catch (e) {
      console.log(`  ❌ ${t.code}: ${e.message}`);
    }
  }

  await sql.end();
  console.log('\n✅ Terminé');
}

main().catch(async e => { console.error('❌', e.message); await sql.end(); process.exit(1); });
