/**
 * Sensident — Seed 2 articles placeholders (pour démo)
 *
 * Note : Paul ecrira les 9 vrais articles + Dr Thibault validera.
 * Ces 2 articles servent juste a tester le flux newsletter.
 */
import { createClient } from '@libsql/client';
import path from 'node:path';

const dbFile = process.env.DATABASE_URL?.replace('file:', '') || path.join(process.cwd(), 'dev.db');
const client = createClient({ url: `file:${dbFile}` });

interface Article {
  slug: string;
  title: string;
  excerpt: string;
  category_code: string;  // ancien systeme (legacy, conserver pour compat)
  body_md: string;
  slides: Array<{ title: string; body: string; takeaway?: string }>;
  reading_time_min: number;
  status: 'draft' | 'validated';
  categories: string[];  // nouveaux codes de categories
}

const articles: Article[] = [
  {
    slug: 'brossage-dents-technique-bass',
    title: 'Brossage des dents : la méthode BASS, en 5 slides',
    excerpt: 'La technique de brossage la plus recommandée par les dentistes. 2 minutes, 2 fois par jour.',
    category_code: 'hygiene',
    body_md: '# Brossage BASS\n\nTechnique de référence en fac dentaire.\n\n## Etape 1 : 45 degres\nInclinez la brosse a 45 vers la gencive.\n\n## Etape 2 : micro-vibrations\n10 a 15 mouvements horizontaux sans deplacer la brosse.\n\n## Etape 3 : 2 minutes\n30 secondes par quadrant.\n\nSource : UFSBD, 2022.',
    slides: [
      { title: 'Pourquoi la methode BASS ?', body: 'Cible le sillon gingival, la ou s\'accumulent 80% des bacteries responsables des caries et gingivites.', takeaway: 'C\'est l\'angle, pas le temps, qui compte.' },
      { title: 'Le bon angle : 45 degres', body: 'Inclinez la brosse a 45 vers la gencive. Les brins doivent longer la jonction entre la dent rose et la dent blanche.', takeaway: 'Si vous sentez vos gencives "gratter", c\'est bon signe.' },
      { title: 'Micro-vibrations', body: '10 a 15 micro-mouvements horizontaux sans deplacer la brosse. Puis on passe a la dent suivante.', takeaway: 'Bouger la brosse, c\'est l\'erreur classique.' },
      { title: '2 minutes, 2 fois par jour', body: '30 secondes par quadrant. Utilisez un minuteur ou votre chanson preferee.', takeaway: 'La regularite prime sur l\'intensite.' },
      { title: 'N\'oubliez pas : langue, brossette, fil', body: 'Le brossage seul nettoie 60% de la surface. Brossette interdentaire le soir, fil dentaire en complement.', takeaway: 'Les 40% restants sont entre les dents.' },
    ],
    reading_time_min: 3,
    status: 'draft',
    categories: ['hygiene'],
  },
  {
    slug: 'carie-prevention-quotidienne',
    title: 'La carie : comment la prévenir au quotidien',
    excerpt: '4 gestes simples pour éviter 80% des caries. Sans jargon, applicable dès demain.',
    category_code: 'carie',
    body_md: '# Prevenir la carie\n\nLa carie est la maladie chronique la plus frequente en France. Bonne nouvelle : 4 gestes simples permettent d\'eviter la majorite d\'entre elles.\n\n## 1. Brossage 2x/jour\n2 minutes, methode BASS.\n\n## 2. Brossette interdentaire le soir\nUne fois par jour suffit.\n\n## 3. Alimentation\nEviter les grignotages sucres. L\'eau est la seule boisson qui n\'abime pas les dents.\n\n## 4. Visites de controle\n1 a 2 fois par an, meme sans douleur.\n\nSource : UFSBD, 2022 ; HAS, 2010.',
    slides: [
      { title: 'La carie, c\'est quoi ?', body: 'Une destruction de l\'email par les acides produits par les bacteries qui se nourrissent de sucre.', takeaway: 'C\'est une maladie infectieuse, pas une fatalite.' },
      { title: 'Le geste n°1 : 2 brossages/jour', body: 'Matin et soir, 2 minutes, methode BASS. La plaque met 24h a se transformer en tartre.', takeaway: 'Sautez un seul brossage, la plaque double.' },
      { title: 'Le geste n°2 : brossette', body: 'Une brossette interdentaire le soir, entre toutes les dents. C\'est le geste qui sauve le plus de dents.', takeaway: 'La brosse a dents seule laisse 40% de la surface non nettoyee.' },
      { title: 'Le geste n°3 : pas de grignotage', body: 'Chaque grignotage sucre relance une attaque acide de 20 minutes. Limiter a 3 prises alimentaires par jour.', takeaway: 'Un bonbon le matin + un le soir > 1 bonbon le matin et 1 le soir (meme quantite).' },
      { title: 'Le geste n°4 : 1 visite/an', body: 'Un controle annuel chez le dentiste detecte les caries avant qu\'elles ne fassent mal. Pas d\'attente que ca fasse mal.', takeaway: 'Une carie depistee tot = un soin simple et court.' },
    ],
    reading_time_min: 4,
    status: 'draft',
    categories: ['carie', 'hygiene'],
  },
];

async function main() {
  // Recuperer les categories par code
  const cats = await client.execute('SELECT id, code FROM categories');
  const catByCode = Object.fromEntries(cats.rows.map((c: any) => [c.code, c.id]));

  for (const a of articles) {
    const slidesJson = JSON.stringify(a.slides);
    const bodyMd = a.body_md;

    // Upsert article
    const existing = await client.execute({ sql: 'SELECT slug FROM articles WHERE slug = ?', args: [a.slug] });
    if (existing.rows.length > 0) {
      await client.execute({
        sql: `UPDATE articles SET title=?, excerpt=?, category=?, body_md=?, slides_json=?, reading_time_min=?, status=? WHERE slug=?`,
        args: [a.title, a.excerpt, a.category_code, bodyMd, slidesJson, a.reading_time_min, a.status, a.slug],
      });
    } else {
      await client.execute({
        sql: `INSERT INTO articles (slug, title, excerpt, category, body_md, slides_json, reading_time_min, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        args: [a.slug, a.title, a.excerpt, a.category_code, bodyMd, slidesJson, a.reading_time_min, a.status],
      });
    }

    // Lier aux categories
    for (const code of a.categories) {
      const catId = catByCode[code];
      if (!catId) {
        console.warn(`⚠ Categorie ${code} introuvable, skip`);
        continue;
      }
      await client.execute({
        sql: `INSERT OR IGNORE INTO article_categories (article_slug, category_id) VALUES (?, ?)`,
        args: [a.slug, catId],
      });
    }

    console.log(`✅ ${a.title} (${a.categories.join(', ')})`);
  }

  console.log(`\n${articles.length} articles inseres.`);
  console.log('Note : ces 2 articles sont en status "draft". Va sur /admin/articles pour les valider (apres le Dr Thibault).');
}

main().catch((e) => { console.error(e); process.exit(1); });
