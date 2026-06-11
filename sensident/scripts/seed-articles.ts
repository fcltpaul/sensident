/**
 * Sensident — Seed articles catalogue (1 exemple)
 *
 * Insere 1 article exemple en BDD pour tester le rendu.
 * Paul ecrira les 9 autres articles au format 5-slides + long.
 */
import { createClient } from '@libsql/client';
import path from 'node:path';

const dbFile = process.env.DATABASE_URL?.replace('file:', '') || path.join(process.cwd(), 'dev.db');
const client = createClient({ url: `file:${dbFile}` });

console.log('Insertion d\'1 article exemple (a completer par Paul)...');

async function main() {
  const article = {
    slug: 'brossage-dents-technique-bass',
    title: 'Brossage des dents : la methode BASS, en 5 slides',
    excerpt: 'La technique de brossage la plus recommandee par les dentistes. 2 minutes, 2 fois par jour. Simple, efficace, prouvee.',
    status: 'draft',
    bodyMarkdown: `# Brossage des dents : la methode BASS, en detail

## Introduction

La technique de brossage BASS est enseignee dans toutes les facultes dentaires francaises. Elle a ete decrite pour la premiere fois en 1948 par le Dr Charles C. Bass, et elle reste la reference.

**Pourquoi cette methode ?** Parce qu'elle cible la zone gingivale — le sillon entre la gencive et la dent — la ou s'accumule la plaque dentaire responsable de 80% des problemes bucco-dentaires courants.

## Le materiel : brosse souple

- **Brosse a poils souples** (souple ou ultra-souple, jamais medium ou dur)
- Tete de brosse petite (atteint les molaires du fond)
- Manche confortable

**Brosse electrique ?** Oui, les brosses electriques oscillantes-rotatives (Oral-B) ou soniques (Philips Sonicare) sont aussi efficaces que la methode BASS manuelle. L'important, c'est la technique, pas l'outil.

## Etape 1 : le bon angle (45 degres)

Incline la brosse a **45 degres vers la gencive**. Les brins doivent longer la jonction entre la partie rose (gencive) et la partie blanche (dent).

**Erreur classique** : brosse perpendiculaire a la dent (90 degres). C'est trop agressif et ca ne nettoie pas le sillon gingival.

## Etape 2 : micro-vibrations (10-15 fois)

Une fois positionne, fais **10 a 15 micro-mouvements horizontaux** sans deplacer la brosse. Puis passe a la dent suivante.

## Etape 3 : 2 minutes, quadrants

Decoupe ta bouche en 4 quadrants : haut-droit, haut-gauche, bas-droit, bas-gauche. **30 secondes par quadrant**, soit 2 minutes au total.

## Completer avec brossette et fil

Le brossage des dents atteint environ **60% de la surface dentaire**. Les 40% restants sont entre les dents, la ou la brosse ne passe pas.

**Solution** :
- **Brossette interdentaire** (recommandee)
- **Fil dentaire** : si pas de brossette, technique du "C" autour de chaque dent

**Quand ?** Le soir, apres le diner, avant le brossage. Une fois par jour suffit.

## Sources

- Bass CC. "The necessary personal oral hygiene for prevention of caries and periodontoclasia." *New Orleans Med Surg J* 1948.
- American Dental Association. "Brushing Your Teeth." 2023.
- UFSBD. "Recommandations de brossage." 2022.
`,
  };

  const existing = await client.execute({ sql: 'SELECT slug FROM articles WHERE slug = ?', args: [article.slug] });
  if (existing.rows.length > 0) {
    await client.execute({
      sql: `UPDATE articles SET title=?, excerpt=?, body_markdown=?, status=? WHERE slug=?`,
      args: [article.title, article.excerpt, article.bodyMarkdown, article.status, article.slug],
    });
    console.log(`Article "${article.title}" mis a jour.`);
  } else {
    await client.execute({
      sql: `INSERT INTO articles (slug, title, excerpt, body_markdown, status) VALUES (?, ?, ?, ?, ?)`,
      args: [article.slug, article.title, article.excerpt, article.bodyMarkdown, article.status],
    });
    console.log(`Article "${article.title}" insere.`);
  }

  console.log('\nPaul : ecris 9 autres articles similaires via /admin/articles/new, puis bascule status en "validated" apres relecture Dr Thibault.');

  client.close();
}

main().catch((e) => { console.error(e); process.exit(1); });
