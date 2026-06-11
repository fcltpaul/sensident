/**
 * Sensident — Seed articles catalogue (10 articles total)
 *
 * 1 article deja insere (brossage BASS) + 9 nouveaux (brouillons factuels).
 * A valider par Dr Thibault avant publication.
 */
import { createClient } from '@libsql/client';
import path from 'node:path';

const dbFile = process.env.DATABASE_URL?.replace('file:', '') || path.join(process.cwd(), 'dev.db');
const client = createClient({ url: `file:${dbFile}` });

const articles = [
  {
    slug: 'brossage-dents-technique-bass',
    title: 'Brossage des dents : la methode BASS, en 5 slides',
    excerpt: 'La technique de brossage la plus recommandee par les dentistes. 2 minutes, 2 fois par jour.',
    status: 'draft',
  },
  {
    slug: 'brossette-interdentaire-pourquoi',
    title: 'Brossette interdentaire : pourquoi c est non negociable',
    excerpt: 'La brosse a dents seule nettoie 60% de la surface. Les 40% restants sont entre les dents. La brossette est la solution.',
    status: 'draft',
  },
  {
    slug: 'fluor-dentifrice-adulte',
    title: 'Fluor dans le dentifrice : combien, pourquoi, lequel',
    excerpt: 'Le fluor reste le seul actif prouve efficace contre les caries. Dosage selon l age, fluorure de sodium vs amine.',
    status: 'draft',
  },
  {
    slug: 'caries-enfant-prevention',
    title: 'Caries de l enfant : 5 habitudes qui font la difference',
    excerpt: 'Avant 6 ans, les caries de la petite enfance touchent 1 enfant sur 4. Les bons reflexes parentaux.',
    status: 'draft',
  },
  {
    slug: 'gencive-saigne-pas-normal',
    title: 'Ma gencive saigne quand je brosse : c est grave ?',
    excerpt: 'Non, mais il faut agir. Saignement = inflammation = gingivite debutante. Reversible en 2 semaines de brossette + bonne technique.',
    status: 'draft',
  },
  {
    slug: 'detartrage-frequence',
    title: 'Detartrage : tous les 6 mois ou plus ?',
    excerpt: 'La frequence ideale depend de votre salive, de votre hygiene et de vos facteurs de risque. Guide pratique.',
    status: 'draft',
  },
  {
    slug: 'brosse-electrique-manuelle',
    title: 'Brosse electrique vs manuelle : ce que dit la science',
    excerpt: 'Les etudes montrent une legere superiorite de l electrique sur la reduction de plaque. Mais la technique compte plus que l outil.',
    status: 'draft',
  },
  {
    slug: 'alimentation-caries',
    title: 'Alimentation et caries : le vrai du faux sur le sucre',
    excerpt: 'Ce n est pas la quantite de sucre qui compte, c est la frequence d exposition. 1 bonbon par heure = plus de caries que 10 d un coup.',
    status: 'draft',
  },
  {
    slug: 'bain-de-bouche-utile',
    title: 'Bain de bouche : utile, inutile, ou risqué ?',
    excerpt: 'Pas tous egaux. Le bain de bouche quotidien n est pas recommande sans raison medicale. Certains font plus de mal que de bien.',
    status: 'draft',
  },
  {
    slug: 'sensibilite-dentinaire-causes',
    title: 'Dents sensibles au froid : 5 causes frequentes',
    excerpt: 'La sensibilite dentinaire touche 1 adulte sur 4. Causes, solutions, et quand consulter en urgence.',
    status: 'draft',
  },
];

async function main() {
  console.log(`Insertion/mise a jour de ${articles.length} articles brouillons...`);
  for (const a of articles) {
    const body = `# ${a.title}\n\n## En bref\n\n${a.excerpt}\n\n## Contenu a rediger\n\nCet article est un brouillon. La structure et le titre ont ete valides par Paul. Le contenu editorial (texte, sources, exemples) reste a ecrire par Paul et a faire valider par le Dr Francois Thibault avant publication.\n\n## Plan previsionnel\n\n- Slide 1 : acroche patient (pourquoi c est important pour moi)\n- Slide 2 : mecanisme (ce qui se passe dans la bouche)\n- Slide 3 : geste concret (ce que je peux faire)\n- Slide 4 : erreur classique (ce qu il ne faut pas faire)\n- Slide 5 : quand consulter (signaux d alerte)\n\n## Sources a integrer (a confirmer)\n\n- UFSBD (Union Francaise pour la Sante Bucco-Dentaire)\n- HAS (Haute Autorite de Sante)\n- ADF (Association Dentaire Francaise)\n- Articles scientifiques a identifier (PubMed)\n\n## Validation scientifique requise\n\nDr Francois Thibault, chirurgien-dentiste, comite scientifique Sensident.\n`;
    const existing = await client.execute({ sql: 'SELECT slug FROM articles WHERE slug = ?', args: [a.slug] });
    if (existing.rows.length > 0) {
      await client.execute({
        sql: `UPDATE articles SET title=?, excerpt=?, body_markdown=?, status=? WHERE slug=?`,
        args: [a.title, a.excerpt, body, a.status, a.slug],
      });
    } else {
      await client.execute({
        sql: `INSERT INTO articles (slug, title, excerpt, body_markdown, status) VALUES (?, ?, ?, ?, ?)`,
        args: [a.slug, a.title, a.excerpt, body, a.status],
      });
    }
    console.log(`  + ${a.slug}`);
  }
  console.log(`\n${articles.length} articles en BDD. Statut: brouillons (draft).`);
  console.log(`Prochaine etape: Paul redige le contenu de chaque article (5-slides + long), Dr Thibault valide, puis passage en "validated" / "published".`);
  client.close();
}

main().catch((e) => { console.error(e); process.exit(1); });
