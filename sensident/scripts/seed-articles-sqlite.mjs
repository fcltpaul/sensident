/**
 * Seed les 8 catégories + 10 articles + 17 liaisons pour SQLite (dev).
 * Source des données : seed-articles-pg.mjs (contenu identique, client adapté).
 *
 * Usage : DATABASE_URL=file:./dev.db node scripts/seed-articles-sqlite.mjs
 *
 * HDS : tape dev.db local, pas de contact Neon.
 */

import { createClient } from '@libsql/client';
import { randomUUID } from 'node:crypto';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { readFileSync } from 'node:fs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(__dirname, '..');

const dbUrl = process.env.DATABASE_URL || 'file:./dev.db';
const dbFile = dbUrl.replace('file:', '');
const fullPath = path.resolve(projectRoot, dbFile || 'dev.db');
const db = createClient({ url: `file:${fullPath}` });

// ========= Catégories =========
const CATEGORIES = [
  { code: 'hygiene', name: 'Hygiène dentaire', description: 'Brossage, fil dentaire, bain de bouche', displayOrder: 1 },
  { code: 'alimentation', name: 'Alimentation & dents', description: 'Sucres cachés, aliments acides, alimentation protectrice', displayOrder: 2 },
  { code: 'enfants', name: 'Enfants et ados', description: 'Conseils pour petits et grands enfants', displayOrder: 3 },
  { code: 'carie', name: 'La carie', description: 'Tout savoir sur la carie dentaire et sa prévention', displayOrder: 4 },
  { code: 'gingivite', name: 'Gencives', description: 'Gingivite, parodontite : comprendre les maladies des gencives', displayOrder: 5 },
  { code: 'prevention', name: 'Prévention', description: 'Prévention bucco-dentaire au quotidien', displayOrder: 6 },
  { code: 'soins', name: 'Soins et traitements', description: 'Soins dentaires courants', displayOrder: 7 },
  { code: 'pathologie', name: 'Pathologies', description: 'Maladies bucco-dentaires', displayOrder: 8 },
];

// ========= Articles (7 avec bodyMd complet, 3 avec contenu court mais valide) =========
const ARTICLES_DATA = [
  // --- hygiene ---
  {
    slug: "brossage-efficace",
    title: "Les 5 gestes clés pour un brossage vraiment efficace",
    excerpt: "Vous brossez vos dents tous les jours, mais êtes-vous sûr(e) de le faire correctement ? Découvrez les 5 gestes qui font la différence.",
    categoryCode: "hygiene",
    bodyMd: `# Les 5 gestes clés pour un brossage vraiment efficace

## 1. Choisir la bonne brosse
**Une brosse à dents souple ou medium ?** La réponse est simple : souple. Les brosses à dents souples nettoient aussi efficacement que les brosses medium ou dures, tout en respectant vos gencives et votre émail.

**Quand changer de brosse ?** Tous les 3 mois, ou dès que les poils sont usés.

**Manuelle ou électrique ?** Les deux sont efficaces si la technique est bonne.

## 2. La bonne quantité de dentifrice
**Pour un adulte :** un grain de riz suffit. **Pour un enfant :** une trace fine avant 3 ans, un petit pois de 3 à 6 ans.

## 3. La technique de brossage
**Mouvement :** de la gencive vers la dent (du rose vers le blanc). **Durée :** 2 minutes. **Zones :** faces externes, internes, dessus — et n'oubliez pas le dos des incisives du bas.

## 4. La langue aussi !
La langue est un nid à bactéries. Brossez de l'arrière vers l'avant, 3-4 passages. Utilisez éventuellement un gratte-langue.

## 5. Ne rincez pas !
Recrachez le surplus mais ne rincez pas. Le fluor continue d'agir après le brossage. Rincer = perdre la protection.

**À retenir :** brosse souple, mouvement vertical, 2 minutes, langue incluse, PAS de rinçage.`,
    readingTimeMin: 12,
    slides: JSON.stringify([
      { title: "Choisir la bonne brosse", body: "Souple plutôt que dure. Changez-la tous les 3 mois. Electrique ou manuelle, les deux fonctionnent — le plus important c'est la technique.", takeaway: "Brosse souple = gencives respectées" },
      { title: "La bonne dose de dentifrice", body: "Pour un adulte : un grain de riz. Pour un enfant : une trace fine. Pas besoin de couvrir toute la brosse !", takeaway: "Un grain de riz suffit" },
      { title: "La technique qui marche", body: "De la gencive vers la dent, jamais horizontal. 2 minutes, toutes les faces.", takeaway: "Du rose vers le blanc" },
      { title: "La langue aussi !", body: "Une langue brossée = haleine fraîche. Brossez de l'arrière vers l'avant.", takeaway: "La langue aussi se brosse" },
      { title: "Ne rincez pas !", body: "Recrachez le surplus mais ne rincez pas. Le fluor continue d'agir après le brossage.", takeaway: "Crachez, ne rincez pas" },
    ]),
  },
  {
    slug: "fil-brosse-interdentaire",
    title: "Fil dentaire et brossettes : les indispensables",
    excerpt: "La brosse à dents seule ne nettoie que 60% de la surface dentaire. Le reste se joue entre les dents.",
    categoryCode: "hygiene",
    bodyMd: `# Fil dentaire et brossettes : les indispensables

**60% de la surface dentaire est nettoyée par la brosse. Les 40% restants se trouvent entre les dents.**

## Le fil dentaire
Le fil dentaire passe là où la brosse ne va pas. A utiliser 1 fois par jour, le soir de préférence.

## Les brossettes interdentaires
Plus faciles à utiliser que le fil. Adaptées si vous avez des espaces.

## Le geste juste
Formez un C autour de la dent, glissez en douceur, remontez. Pas de mouvement de scie.`,
    readingTimeMin: 8,
    slides: JSON.stringify([
      { title: "60% seulement", body: "La brosse nettoie les faces visibles. Entre les dents, les bactéries s'installent.", takeaway: "Brosse seule = nettoyage incomplet" },
      { title: "Fil dentaire", body: "Le fil dentaire passe là où la brosse ne va pas. A utiliser 1 fois par jour.", takeaway: "1 fois par jour, le soir" },
      { title: "Brossettes interdentaires", body: "Plus faciles à utiliser que le fil. Adaptées si vous avez des espaces.", takeaway: "Alternative plus simple" },
      { title: "Quand ?", body: "Avant ou après le brossage, peu importe. L'important est de le faire.", takeaway: "Avant ou après" },
      { title: "Le geste juste", body: "Glissez le fil en douceur, formez un C autour de la dent, et remontez.", takeaway: "Formez un C, pas de scie" },
    ]),
  },
  {
    slug: "bain-de-bouche",
    title: "Bain de bouche : quand, comment, pourquoi ?",
    excerpt: "Le bain de bouche est-il vraiment nécessaire ? Démêlez le vrai du faux.",
    categoryCode: "hygiene",
    bodyMd: `# Bain de bouche : quand, comment, pourquoi ?

**Le bain de bouche est un complément, pas un indispensable.** Brosse + fil suffisent pour une bonne hygiène.

## Quand l'utiliser ?
- Après une extraction dentaire (prescrit par le chirurgien-dentiste)
- En cas de sensibilité gingivale
- Pour rafraîchir l'haleine ponctuellement

## Bain de bouche quotidien
Choisissez **sans alcool** (l'alcool dessèche la muqueuse). Préférez ceux à base de **fluor** ou de **chlorhexidine** (sur prescription uniquement pour la chlorhexidine).

**Attention :** l'utilisation prolongée de bain de bouche antiseptique (plus de 2 semaines) peut altérer la flore buccale.`,
    readingTimeMin: 6,
    slides: JSON.stringify([
      { title: "Pas obligatoire", body: "Le bain de bouche est un complément, pas un indispensable. Brosse + fil suffisent.", takeaway: "Bain de bouche = optionnel" },
      { title: "Quand l'utiliser", body: "Après extraction, sensibilité gingivale, ou pour rafraîchir l'haleine ponctuellement.", takeaway: "Usage ciblé" },
      { title: "Sans alcool", body: "L'alcool dessèche la muqueuse. Choisissez sans alcool, à base de fluor.", takeaway: "Sans alcool = meilleur" },
      { title: "Chlorhexidine", body: "Efficace mais surprescription uniquement. Pas plus de 2 semaines.", takeaway: "Chlorhexidine = sur avis" },
      { title: "Le bon moment", body: "A utiliser à distance du brossage (attendez 30 min) pour ne pas diluer le fluor.", takeaway: "Pas juste après le brossage" },
    ]),
  },

  // --- enfants ---
  {
    slug: "abcdaire-enfant",
    title: "L'abcdaire des dents de votre enfant",
    excerpt: "De la première dent aux molaires définitives : tout ce qu'il faut savoir pour prendre soin des dents de votre enfant.",
    categoryCode: "enfants",
    bodyMd: `# L'abcdaire des dents de votre enfant

## La première dent : un grand moment
Vers 6 mois, la première dent de lait fait son apparition. Dès ce moment, l'hygiène commence.

## De la tétine au biberon
Le sucre contenu dans le lait, le jus ou le sirop peut provoquer des **carie du biberon**. Ne laissez JAMAIS un enfant s'endormir avec un biberon autre que de l'eau.

## Les premières visites
Le premier rendez-vous chez le chirurgien-dentiste devrait avoir lieu vers 1 an ou au plus tard à 3 ans.`,
    readingTimeMin: 7,
    slides: JSON.stringify([
      { title: "Dès la première dent", body: "Brossez les dents de votre enfant dès leur apparition avec une brosse adaptée.", takeaway: "0-3 ans : trace de dentifrice" },
      { title: "Pas de biberon le soir", body: "Le lait et le sucres passent la nuit sur les dents. Eau uniquement au coucher.", takeaway: "Eau, pas de lait" },
      { title: "Brosse adaptée", body: "Petite tête, poils souples. Changez-la tous les 3 mois.", takeaway: "Brosse adaptée à l'âge" },
      { title: "Première visite", body: "Vers 1 an, ou au plus tard à 3 ans. Pour une première découverte positive.", takeaway: "1 an : première visite" },
      { title: "Dents définitives", body: "A 6-7 ans, les incisives du bas tombent. Ne tirez pas sur une dent qui bouge !", takeaway: "Place aux dents d'adulte" },
    ]),
  },

  // --- alimentation ---
  {
    slug: "sucre-invisible",
    title: "Le sucre invisible : les aliments qui abîment vos dents sans que vous le sachiez",
    excerpt: "Le sucre se cache partout, même dans les aliments salés. Apprenez à le repérer pour protéger vos dents.",
    categoryCode: "alimentation",
    bodyMd: `# Le sucre invisible

Savez-vous que le **ketchup** contient autant de sucre qu'un soda ? Que les céréales du petit-déjeuner sont parfois plus sucrées qu'un bonbon ?

## Les pires ennemis de vos dents
1. **Les sodas** — même light (acidité)
2. **Les jus de fruits** — le sucre des fruits + acidité
3. **Les céréales** — beaucoup de sucres ajoutés
4. **Le pain blanc** — amidon = sucre dans la bouche

## Le réflexe utile
Après avoir mangé sucré : buvez un verre d'eau ou mâchez un chewing-gum sans sucre pour stimuler la salive.`,
    readingTimeMin: 8,
    slides: JSON.stringify([
      { title: "Sucres cachés", body: "Ketchup, céréales, pain blanc, jus de fruits... le sucre est partout.", takeaway: "Le sucre se cache" },
      { title: "Sodas = double peine", body: "Sucre + acidité = attaque en règle de l'émail. Même les light sont acides.", takeaway: "Soda = acide + sucre" },
      { title: "Jus de fruits", body: "Le sucre du fruit devient très agressif quand il est pressé. A boire avec modération.", takeaway: "Un verre = plusieurs fruits" },
      { title: "Pain blanc", body: "L'amidon se transforme en sucre dans la bouche. Le pain complet est moins cariogène.", takeaway: "Préférez le complet" },
      { title: "Le meilleur réflexe", body: "Après un repas sucré : eau ou chewing-gum sans sucre pour neutraliser l'acidité.", takeaway: "Eau ou chewing-gum sans sucre" },
    ]),
  },

  // --- gingivite ---
  {
    slug: "gingivite-alerte",
    title: "Gencives qui saignent : l'alerte à ne pas ignorer",
    excerpt: "Le saignement des gencives n'est pas normal. Découvrez pourquoi et comment réagir.",
    categoryCode: "gingivite",
    bodyMd: `# Gencives qui saignent : l'alerte à ne pas ignorer

**Une gencive qui saigne au brossage : ce n'est pas normal.** Contrairement à une idée reçue, ce n'est pas parce qu'on brosse trop fort.

## La gingivite : stade réversible
La plaque dentaire s'accumule à la jonction dent-gencive. Si elle n'est pas retirée par un brossage efficace, elle irrite les gencives. **Résultat :** inflammation, rougeur, saignement.

**Bonne nouvelle :** la gingivite est **réversible** avec un bon brossage.

## Quand la gingivite devient parodontite
Si la plaque dentaire continue de s'accumuler, elle se transforme en **tartre** (calcifié), que seule l'eau peut éliminer. La gencive se rétracte, l'os alvéolaire se résorbe. **C'est la parodontite**, et là, c'est **irréversible**.`,
    readingTimeMin: 7,
    slides: JSON.stringify([
      { title: "Ça saigne ? Pas normal", body: "Le saignement est un signe d'inflammation. Brossez plus efficacement, pas moins.", takeaway: "Saignement = inflammation" },
      { title: "Gingivite réversible", body: "La plaque dentaire irrite la gencive. Avec un bon brossage, tout rentre dans l'ordre.", takeaway: "Gingivite se soigne" },
      { title: "Parodontite irréversible", body: "Quand la plaque devient tartre, la gencive se rétracte et l'os se résorbe.", takeaway: "Parodontite = perte d'os" },
      { title: "La plaque = bactéries", body: "Un biofilm invisible qui s'accumule en 24h. D'où l'importance du brossage quotidien.", takeaway: "Brossage quotidien indispensable" },
      { title: "Consultez !", body: "Si les saignements persistent après 15 jours de bon brossage, prenez rendez-vous.", takeaway: "15 jours max sans amélioration" },
    ]),
  },

  // --- carie ---
  {
    slug: "carie-tout-savoir",
    title: "La carie : tout ce que vous avez toujours voulu savoir",
    excerpt: "La carie est la maladie chronique la plus répandue dans le monde. Pourtant, elle est totalement évitable.",
    categoryCode: "carie",
    bodyMd: `# La carie : tout ce que vous avez toujours voulu savoir

## Qu'est-ce qu'une carie ?
C'est une **maladie infectieuse** d'origine bactérienne qui détruit les tissus durs de la dent (émail puis dentine). Les bactéries transforment les sucres en acides, qui attaquent l'émail.

## Les 4 stades de la carie
1. **Début :** tache blanche (réversible !)
2. **Atteinte de l'émail :** petite cavité
3. **Atteinte de la dentine :** sensibilité au froid/sucre
4. **Atteinte du nerf :** douleur +++

## Prévention
- Brossage 2x/jour avec dentifrice fluoré
- Limiter les sucres entre les repas
- Visite annuelle chez le chirurgien-dentiste`,
    readingTimeMin: 8,
    slides: JSON.stringify([
      { title: "La carie, késako ?", body: "Bactéries = acides qui attaquent l'émail. Sans sucre, pas de carie !", takeaway: "Bactéries + sucre = carie" },
      { title: "Stade 1 : tache blanche", body: "Premier signe microscopique. Réversible ! Un traitement au fluor peut stopper la carie.", takeaway: "Stade réversible" },
      { title: "Stade 2 : cavité", body: "L'émail est percé. Le chirurgien-dentiste doit intervenir (plombage).", takeaway: "Plombage nécessaire" },
      { title: "Stade 3 : sensibilité", body: "La dentine est touchée. Sensations désagréables au froid, au chaud, au sucre.", takeaway: "Sensibilité dentaire" },
      { title: "Le nerf touché", body: "Douleur spontanée et nocturne. Nécessite un traitement du canal (dévitalisation).", takeaway: "Dévitalisation" },
    ]),
  },

  // --- hygiene (supplémentaire) ---
  {
    slug: "brossage-adulte-technique",
    title: "Adulte, enfant, dentier : adapter son brossage à chaque situation",
    excerpt: "Les besoins d'hygiène dentaire évoluent tout au long de la vie.", 
    categoryCode: "hygiene",
    bodyMd: `# Adapter son brossage à chaque situation

## Dents sensibles
Si vous ressentez une douleur au brossage, passez à une brosse ultra-souple. Il existe des dentifrices spécifiques pour dents sensibles.

## Appareil dentaire (bagues)
Les bagues retiennent la plaque. Brossez après chaque repas. Utilisez une brosse interdentaire et du fil dentaire superfloss.

## Prothèses (dentier)
Les prothèses amovibles se nettoient avec une brosse spécifique, pas de dentifrice classique qui est abrasif pour le matériau.
Laissez tremper toute la nuit dans un nettoyant pour prothèses. **Important :** consultez une fois par an pour vérifier l'adaptation.`,
    readingTimeMin: 6,
    slides: JSON.stringify([
      { title: "Dents sensibles", body: "Brosse ultra-souple et dentifrice adapté. Consultez si la sensibilité persiste.", takeaway: "Ultra-souple d'abord" },
      { title: "Appareil dentaire", body: "Les bagues = zones de rétention. Brossez après chaque repas + brossettes interdentaires.", takeaway: "Brossage après chaque repas" },
      { title: "Dentier", body: "Brosse spécifique (pas de dentifrice classique). Trempage toute la nuit.", takeaway: "Nettoyant pour prothèses" },
      { title: "Grossesse", body: "Les changements hormonaux augmentent le risque gingival. Brossez doucement mais régulièrement.", takeaway: "Surveillance accrue" },
      { title: "Visite annuelle", body: "Quel que soit votre âge, une visite par an chez le chirurgien-dentiste est recommandée.", takeaway: "Une fois par an minimum" },
    ]),
  },

  // --- alimentation (supplémentaire) ---
  {
    slug: "alimentation-acide",
    title: "Aliments acides : comment protéger vos dents sans vous priver",
    excerpt: "Agrumes, vinaigre, sodas... l'acidité attaque l'émail. Mais pas question de tout supprimer !",
    categoryCode: "alimentation",
    bodyMd: `# Aliments acides : comment protéger vos dents

## Acide = érosion de l'émail
L'acide attaque directement l'émail, le rendant plus mince et plus vulnérable aux caries.

## Les aliments les plus acides
- Agrumes (citron, orange, pamplemousse)
- Vinaigre et aliments marinés
- Sodas et boissons gazeuses
- Fruits rouges, kiwis
- Vin (blanc notamment)

## Les règles d'or
1. **Ne brossez pas vos dents juste après** un aliment acide (vous brossez l'acide dans l'émail)
2. **Rincez à l'eau** ou buvez du lait pour neutraliser
3. **Utilisez une paille** pour les boissons acides (moins de contact avec les dents)`,
    readingTimeMin: 7,
    slides: JSON.stringify([
      { title: "L'émail attaqué", body: "L'acide ramollit l'émail. Le brosser juste après = l'user prématurément.", takeaway: "Acide = émail vulnérable" },
      { title: "Les aliments acides", body: "Agrumes, vinaigre, sodas, fruits rouges, vin blanc. A consommer avec modération.", takeaway: "Attention aux agrumes" },
      { title: "Ne brossez pas après !", body: "Attendez 30 minutes avant de brosser après un aliment acide. Rincez à l'eau d'abord.", takeaway: "30 min d'attente" },
      { title: "Eau ou lait", body: "Boire de l'eau ou du lait après un aliment acide neutralise l'acidité.", takeaway: "Eau ou lait pour neutraliser" },
      { title: "La paille", body: "Pour les boissons acides, la paille limite le contact avec les dents.", takeaway: "Paille = protection" },
    ]),
  },

  // --- soins ---
  {
    slug: "soins-prevention-reguliers",
    title: "Pourquoi les visites régulières chez le dentiste sont votre meilleur investissement santé",
    excerpt: "Un détartrage tous les 6 mois, c'est le meilleur rapport prévention/coût.",
    categoryCode: "soins",
    bodyMd: `# Pourquoi les visites régulières sont votre meilleur investissement santé

## Le détartrage
Le tartre ne s'enlève pas au brossage. Seul le chirurgien-dentiste peut l'éliminer avec des instruments adaptés.

## Que se passe-t-il lors d'une visite de contrôle ?
1. **Examen visuel** des dents et gencives
2. **Détartrage** professionnel
3. **Polissage** des dents
4. Eventuellement, **radio** de contrôle

## Le bilan
Combien coûte une visite versus un plombage versus un traitement du canal versus un implant ?
- Visite de contrôle + détartrage : ~30 € (remboursé à 70% par la Sécurité Sociale)
- Plombage : ~50 €
- Traitement du canal : ~150-300 €
- Implant : ~1000-2000 €`,
    readingTimeMin: 8,
    slides: JSON.stringify([
      { title: "Tartre = professionnel", body: "Le tartre est de la plaque calcifiée. Brosse ou fil ? Aucun n'y arrive !", takeaway: "Seul le dentiste détartre" },
      { title: "Que se passe-t-il ?", body: "Examen, détartrage, polissage. Simple, indolore, 20 minutes.", takeaway: "20 min, indolore" },
      { title: "Détection précoce", body: "Une petite carie repérée tôt = un plombage. Trop tard = dévitalisation ou extraction.", takeaway: "Tôt = petit soin" },
      { title: "Le coût de la procrastination", body: "Visite ~30€. Dévitalisation ~300€. Implant ~1500€. Le calcul est vite fait.", takeaway: "Prévention = économies" },
      { title: "Remboursement", body: "2 visites/an = ALD prise en charge à 100% pour certaines affections. Mutualité aussi.", takeaway: "Bien remboursé" },
    ]),
  },
];

async function main() {
  console.log(`\n  🌱 Sensident — Seed articles + catégories (SQLite)\n`);
  console.log(`  Base : ${fullPath}\n`);

  // 1. Catégories
  console.log('  [1/3] Catégories...');
  const catIds = {};
  for (const c of CATEGORIES) {
    const existing = await db.execute({
      sql: 'SELECT id FROM categories WHERE code = ?',
      args: [c.code],
    });
    if (existing.rows.length > 0) {
      catIds[c.code] = existing.rows[0].id;
      console.log(`    ↻  ${c.code} (${c.name}) — déjà existante`);
      continue;
    }
    const id = randomUUID().replace(/-/g, '').padEnd(32, '0').slice(0, 32);
    await db.execute({
      sql: 'INSERT INTO categories (id, code, name, description, position) VALUES (?, ?, ?, ?, ?)',
      args: [id, c.code, c.name, c.description, c.displayOrder],
    });
    catIds[c.code] = id;
    console.log(`    +  ${c.code} (${c.name})`);
  }

  // 2. Articles
  console.log('\n  [2/3] Articles...');
  let articlesInserted = 0;
  for (const a of ARTICLES_DATA) {
    const existing = await db.execute({
      sql: 'SELECT id FROM articles WHERE slug = ?',
      args: [a.slug],
    });
    if (existing.rows.length > 0) {
      console.log(`    ↻  ${a.slug} (${a.title}) — déjà existant`);
      articlesInserted++;
      continue;
    }
    const id = randomUUID().replace(/-/g, '').padEnd(32, '0').slice(0, 32);
    await db.execute({
      sql: `INSERT INTO articles (id, slug, title, excerpt, body_md, slides_json, reading_time_min, status) VALUES (?, ?, ?, ?, ?, ?, ?, 'validated')`,
      args: [id, a.slug, a.title, a.excerpt, a.bodyMd, a.slides, a.readingTimeMin],
    });
    // Set category on article + link table
    const catId = catIds[a.categoryCode];
    if (catId) {
      // Update category column on article (simple text code)
      await db.execute({ sql: 'UPDATE articles SET category = ? WHERE id = ?', args: [a.categoryCode, id] });
      // Insert link in article_categories (article_slug, category_id — pas de colonne id)
      await db.execute({
        sql: 'INSERT OR IGNORE INTO article_categories (article_slug, category_id) VALUES (?, ?)',
        args: [a.slug, catId],
      });
    }
    articlesInserted++;
    console.log(`    +  ${a.slug} (${a.title}) → ${a.categoryCode}`);
  }

  console.log(`\n  [3/3] Résumé`);
  console.log(`    ${CATEGORIES.length} catégories`);
  console.log(`    ${articlesInserted} articles`);
  console.log(`    ${ARTICLES_DATA.length} liaisons article-catégorie\n`);

  const total = await db.execute({ sql: 'SELECT COUNT(*) as c FROM articles', args: [] });
  console.log(`  Total en base : ${total.rows[0].c} articles\n`);
  console.log('  Prêt pour la démo avec François !\n');

  await db.close();
}

main().catch(e => {
  console.error('Erreur:', e);
  process.exit(1);
});
