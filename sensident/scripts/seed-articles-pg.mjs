/**
 * Seed les 10 articles + liaisons article_categories sur Neon PostgreSQL.
 * Reprend les donnees de seed-full.ts mais en SQL direct pour PG.
 */
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import postgres from 'postgres';

const envPath = resolve(import.meta.dirname, '..', '.env');
const env = readFileSync(envPath, 'utf-8');
const url = env.split('\n').find(l => l.startsWith('DATABASE_URL='))?.split('=').slice(1).join('=');
if (!url) { console.error('No DATABASE_URL'); process.exit(1); }

const sql = postgres(url, { ssl: 'require' });

// Get category id by code
const getCat = async (code) => {
  const r = await sql.unsafe("SELECT id FROM categories WHERE code = $1", [code]);
  return r[0]?.id;
};

const catIds = {};
for (const code of ['hygiene', 'alimentation', 'enfants', 'carie', 'gingivite', 'prevention', 'soins', 'pathologie']) {
  catIds[code] = await getCat(code);
}
console.log('Category IDs loaded');

// Import articles data from seed-full.ts format
const articlesData = [
  {
    slug: "brossage-efficace",
    title: "Les 5 gestes clés pour un brossage vraiment efficace",
    excerpt: "Vous brossez vos dents tous les jours, mais êtes-vous sûr(e) de le faire correctement ? Découvrez les 5 gestes qui font la différence.",
    categoryCode: "hygiene",
    bodyMd: "# Les 5 gestes clés pour un brossage vraiment efficace\n\n## 1. Choisir la bonne brosse\n**Une brosse à dents souple ou medium ?** La réponse est simple : souple. Les brosses à dents souples nettoient aussi efficacement que les brosses medium ou dures, tout en respectant vos gencives et votre émail. Les brosses dures peuvent provoquer des récessions gingivales (gencives qui se rétractent) et une usure prématurée de l'émail.\n\n**Quand changer de brosse ?** Tous les 3 mois, ou dès que les poils sont usés. Une brosse usée nettoie moins bien et abîme les gencives.\n\n**Manuelle ou électrique ?** Les deux sont efficaces si la technique est bonne. L'électrique peut aider les personnes moins habiles ou les enfants, mais ce n'est pas une baguette magique.\n\n## 2. La bonne quantité de dentifrice\n**Pour un adulte :** un grain de riz suffit. Oui, vous avez bien lu. Pas besoin de couvrir toute la brosse. Une noisette, c'est trop — c'est du gaspillage et ça n'améliore pas le nettoyage.\n\n**Pour un enfant de moins de 3 ans :** une trace fine, pas plus grosse qu'un grain de riz.\n\n**Pour un enfant de 3 à 6 ans :** un petit pois.\n\n## 3. La technique de brossage\n**Mouvement :** de la gencive vers la dent (du rose vers le blanc). Pas de mouvement horizontal agressif ! Imaginez que vous « balayez » la plaque dentaire vers l'extérieur.\n\n**Durée :** 2 minutes, pas une de moins. Pour vous aider : une brosse électrique avec minuteur intégré, une chanson courte, ou le chronomètre de votre téléphone.\n\n**Zones à ne pas oublier :**\n- Les faces externes (joues)\n- Les faces internes (langue/palais)\n- Les faces du dessus (mastication)\n- **Dernière zone, la plus oubliée :** la face interne des incisives du bas, juste derrière la lèvre inférieure.\n\n## 4. Le bon geste pour la langue\n**La langue est un nid à bactéries.** Sa surface rugueuse retient les débris alimentaires et les bactéries responsables de la mauvaise haleine.\n\n**Comment faire ?** Brossez doucement votre langue de l'arrière vers l'avant, 3 à 4 passages. Vous pouvez aussi utiliser un gratte-langue (très efficace).\n\n## 5. Ne pas rincer abondamment\n**Surprenant mais vrai :** après le brossage, recrachez l'excès de dentifrice mais ne rincez pas à l'eau. Le fluor contenu dans le dentifrice continue d'agir plusieurs minutes après le brossage. En rinçant, vous éliminez ce bouclier protecteur.\n\n**Alternative :** si vous tenez à rincer, utilisez un bain de bouche fluoré plutôt que de l'eau.\n\n---\n\n**À retenir :** brosse souple, mouvement vertical, 2 minutes, langue incluse, PAS de rinçage.\n",
    readingTimeMin: 12,
    categories: ['hygiene'],
    slides: [
      { title: "Choisir la bonne brosse", body: "Souple plutôt que dure. Changez-la tous les 3 mois. Electrique ou manuelle, les deux fonctionnent — le plus important c'est la technique.", takeaway: "Brosse souple = gencives respectées" },
      { title: "La bonne dose de dentifrice", body: "Pour un adulte : un grain de riz. Pour un enfant : une trace fine. Pas besoin de couvrir toute la brosse !", takeaway: "Un grain de riz suffit" },
      { title: "La technique qui marche", body: "De la gencive vers la dent, jamais horizontal. 2 minutes, toutes les faces : externe, interne, dessus. N'oubliez pas le dos des incisives du bas.", takeaway: "Du rose vers le blanc" },
      { title: "La langue aussi !", body: "Une langue brossée = haleine fraîche. Brossez de l'arrière vers l'avant, 3-4 passages.", takeaway: "La langue aussi se brosse" },
      { title: "Ne rincez pas !", body: "Recrachez le surplus mais ne rincez pas. Le fluor continue d'agir après le brossage. Rincer = perdre la protection.", takeaway: "Crachez, ne rincez pas" },
    ],
  },
  {
    slug: "fil-brosse-interdentaire",
    title: "Fil dentaire et brossettes : les indispensables",
    excerpt: "La brosse à dents seule ne nettoie que 60% de la surface dentaire. Le reste se joue entre les dents.",
    categoryCode: "hygiene",
    bodyMd: "# Fil dentaire et brossettes : les indispensables\n\nContenu du fil dentaire et brossettes...",
    readingTimeMin: 8,
    categories: ['hygiene'],
    slides: [
      { title: "60% seulement", body: "La brosse nettoie les faces visibles. Entre les dents, les bactéries s'installent.", takeaway: "Brosse seule = nettoyage incomplet" },
      { title: "Fil dentaire", body: "Le fil dentaire passe là où la brosse ne va pas. A utiliser 1 fois par jour, de préférence le soir.", takeaway: "1 fois par jour, le soir" },
      { title: "Brossettes interdentaires", body: "Plus faciles à utiliser que le fil. Adaptées si vous avez des espaces entre les dents ou des bridges.", takeaway: "Alternative plus simple" },
      { title: "Quand ?", body: "Avant ou après le brossage, peu importe. L'important est de le faire.", takeaway: "Avant ou après" },
      { title: "Le geste juste", body: "Glissez le fil en douceur, formez un C autour de la dent, et remontez. Pas de mouvement de scie qui coupe la gencive.", takeaway: "Formez un C, pas de scie" },
    ],
  },
  {
    slug: "bain-de-bouche",
    title: "Bain de bouche : quand, comment, pourquoi ?",
    excerpt: "Le bain de bouche est-il vraiment nécessaire ? Découvrez quand l'utiliser et comment ne pas annuler ses effets.",
    categoryCode: "hygiene",
    bodyMd: "# Bain de bouche : quand, comment, pourquoi ?\n\nContenu bain de bouche...",
    readingTimeMin: 6,
    categories: ['hygiene'],
    slides: [
      { title: "Pas obligatoire", body: "Le bain de bouche est un complément, pas un indispensable. Brosse + fil suffisent pour une bonne hygiène.", takeaway: "Bain de bouche = optionnel" },
      { title: "Quand l'utiliser", body: "Après une chirurgie dentaire, en cas de gingivite, mauvaise haleine persistante, ou sur prescription du dentiste.", takeaway: "Sur prescription ou besoin spécifique" },
      { title: "Attention à l'alcool", body: "Préférez les bains de bouche sans alcool, moins agressifs pour la muqueuse buccale.", takeaway: "Sans alcool de préférence" },
      { title: "Le bon timing", body: "Utilisez-le à un moment différent du brossage pour ne pas rincer le fluor. Exemple : bain de bouche à midi.", takeaway: "Pas juste après le brossage" },
      { title: "Ne pas avaler", body: "Evident mais important : le bain de bouche ne s'avale pas. Surveillez les jeunes enfants.", takeaway: "Recrachez toujours" },
    ],
  },
  {
    slug: "abcdaire-enfant",
    title: "L'abécédaire de la santé dentaire de l'enfant",
    excerpt: "De la première dent aux molaires définitives, tout ce qu'il faut savoir pour accompagner la santé bucco-dentaire de votre enfant.",
    categoryCode: "enfants",
    bodyMd: "# Abécédaire dentaire de l'enfant\n\nContenu enfant...",
    readingTimeMin: 15,
    categories: ['enfants', 'prevention'],
    slides: [
      { title: "Première dent, premier brossage", body: "Dès l'apparition de la première dent, brossez-la avec une brosse souple adaptée et une trace de dentifrice fluoré.", takeaway: "Dès la première dent" },
      { title: "0-3 ans", body: "Brossez vous-même les dents de l'enfant. Quantité : trace fine de dentifrice. Pas de bain de bouche.", takeaway: "Petite dose, geste parent" },
      { title: "3-6 ans", body: "L'enfant commence à se brosser seul mais vous devez repasser derrière. Quantité : un petit pois.", takeaway: "L'enfant apprend, vous vérifiez" },
      { title: "6-12 ans", body: "Place aux molaires définitives. Surveillez le brossage de la zone du fond. Pensez aux sillants dentaires chez le dentiste.", takeaway: "Sillants dentaires = protection" },
      { title: "Adolescent", body: "Risque de négligence. Rappelez les bases. L'appareil orthodontique demande un surcroît d'hygiène.", takeaway: "Orthodontie = hygiène renforcée" },
    ],
  },
  {
    slug: "sucre-invisible",
    title: "Les sucres invisibles qui abîment vos dents",
    excerpt: "Le sucre se cache partout, même dans les aliments que vous pensez sains. Voici les pires ennemis de vos dents.",
    categoryCode: "alimentation",
    bodyMd: "# Les sucres invisibles\n\nContenu sucre...",
    readingTimeMin: 10,
    categories: ['alimentation', 'prevention'],
    slides: [
      { title: "Sucres cachés", body: "Jus de fruits, compotes, céréales, sauces : le sucre est partout. Vérifiez les étiquettes.", takeaway: "Sucre invisible = partout" },
      { title: "Boissons sucrées", body: "Soda, jus, boissons énergétiques : le sucre liquide attaque immédiatement l'émail. Un soda = 6 à 10 morceaux de sucre.", takeaway: "Sucre liquide = attaque directe" },
      { title: "Fréquence > quantité", body: "Grignoter du sucre toute la journée est pire que manger un gros gâteau au dessert. A chaque prise sucrée, vos dents subissent une attaque acide.", takeaway: "Grignotage = pire que le dessert" },
      { title: "Les aliments amis", body: "Fromage (calcium + salive), pomme (fibres), eau. Ces aliments aident à neutraliser l'acidité.", takeaway: "Fromage, pomme, eau" },
      { title: "Le bon réflexe", body: "Après un repas sucré, rincez-vous la bouche à l'eau. Et attendez 30 minutes avant de vous brosser les dents (l'émail est ramolli).", takeaway: "Rincer à l'eau, attendre 30min" },
    ],
  },
  {
    slug: "gingivite-alerte",
    title: "Gingivite : les signes qui ne trompent pas",
    excerpt: "Des gencives qui saignent ? Ce n'est pas normal. Découvrez comment reconnaître et traiter la gingivite avant qu'elle ne devienne une parodontite.",
    categoryCode: "gingivite",
    bodyMd: "# Gingivite : alerte rouge\n\nContenu gingivite...",
    readingTimeMin: 10,
    categories: ['gingivite', 'prevention'],
    slides: [
      { title: "Saignement", body: "Si vos gencives saignent au brossage, c'est le signe d'une inflammation. Ce n'est pas normal.", takeaway: "Saignement = inflammation" },
      { title: "Rougeur et gonflement", body: "Une gencive saine est rose pâle et ferme. Rouge, gonflée, luisante = gingivite.", takeaway: "Rose pâle = sain" },
      { title: "Réversible", body: "Bonne nouvelle : la gingivite se soigne. Un brossage rigoureux + détartrage suffisent à la faire disparaître.", takeaway: "Se soigne bien" },
      { title: "Si on laisse faire", body: "La gingivite non traitée évolue en parodontite : perte d'os, déchaussement, mobilité dentaire. Irréversible.", takeaway: "Parodontite = irréversible" },
      { title: "Consultez", body: "Au moindre doute, consultez votre dentiste. Un détartrage régulier (1-2 fois par an) prévient la gingivite.", takeaway: "Détartrage 1-2 fois par an" },
    ],
  },
  {
    slug: "carie-tout-savoir",
    title: "La carie de A à Z : de la prévention au traitement",
    excerpt: "La carie est une maladie infectieuse. Comprendre comment elle se forme est le meilleur moyen de l'éviter.",
    categoryCode: "carie",
    bodyMd: "# La carie de A à Z\n\nContenu carie...",
    readingTimeMin: 14,
    categories: ['carie', 'prevention'],
    slides: [
      { title: "C'est quoi une carie ?", body: "C'est une infection de la dent causée par des bactéries. Elles transforment le sucre en acide qui dissout l'émail.", takeaway: "Bactéries + sucre = acide = carie" },
      { title: "Les 4 stades", body: "1. Tache blanche (réversible) → 2. Carie de l'émail → 3. Carie de la dentine (douleur) → 4. Pulpite (nerf touché).", takeaway: "Tache blanche = dernier stade réversible" },
      { title: "Détection précoce", body: "Seul le dentiste peut détecter une carie débutante. Les radios la voient avant qu'elle ne soit visible à l'oeil nu.", takeaway: "Radio = détection précoce" },
      { title: "Traitement", body: "Petite carie = composite (plaque blanche). Grosse carie = couronne. Carie du nerf = dévitalisation.", takeaway: "Plus on attend, plus c'est lourd" },
      { title: "Prévention", body: "Fluor, brossage, détartrage, sillants dentaires. La carie se prévaut à 80%.", takeaway: "80% des caries sont évitables" },
    ],
  },
  {
    slug: "brossage-adulte-technique",
    title: "La technique de brossage recommandée par les dentistes",
    excerpt: "Méthode BASS, brossage circulaire, mouvement rotatif : que choisir ? Explications simples pour un brossage optimal.",
    categoryCode: "hygiene",
    bodyMd: "# Technique de brossage recommandée\n\nContenu technique brossage...",
    readingTimeMin: 8,
    categories: ['hygiene', 'prevention'],
    slides: [
      { title: "Méthode BASS", body: "Brosse à 45° vers la gencive, petits mouvements vibratoires. La méthode de référence enseignée aux dentistes.", takeaway: "45° vers la gencive" },
      { title: "Ordre à suivre", body: "1. Faces externes → 2. Faces internes → 3. Dessus → 4. Langue. Respectez toujours le même ordre pour ne rien oublier.", takeaway: "Externe → Interne → Dessus → Langue" },
      { title: "Pression", body: "Une pression trop forte abîme gencives et émail. Tenez votre brosse comme un crayon : légèrement, sans serrer.", takeaway: "Pression légère, comme un crayon" },
      { title: "Durée", body: "2 minutes minimum. La plupart des gens brossent 45 secondes. Mettez un minuteur.", takeaway: "2 minutes, pas 45 secondes" },
      { title: "Après le brossage", body: "Recrachez, ne rincez pas. Le fluor reste actif. Et attendez au moins 30 minutes après un repas acide.", takeaway: "Ne rincez pas" },
    ],
  },
  {
    slug: "alimentation-acide",
    title: "Alimentation et érosion dentaire : les aliments acides",
    excerpt: "L'acidité attaque l'émail. Certains aliments sains sont paradoxalement très acides. Comment les consommer sans risque ?",
    categoryCode: "alimentation",
    bodyMd: "# Alimentation acide et érosion dentaire\n\nContenu alimentation acide...",
    readingTimeMin: 9,
    categories: ['alimentation', 'prevention'],
    slides: [
      { title: "Aliments acides", body: "Agrumes, tomates, vinaigre, fruits rouges, sodas (acide phosphorique). Même les thés aux fruits peuvent être acides.", takeaway: "Acide = attaque chimique de l'émail" },
      { title: "L'effet de l'acidité", body: "L'acide ramollit l'émail. Brossez-vous dans les 30 minutes suivant un repas acide et vous arrachez une couche d'émail.", takeaway: "Brosser tout de suite = catastrophe" },
      { title: "Le bon geste", body: "Après un repas acide, rincez à l'eau, mâchez un chewing-gum sans sucre, et attendez 30-60 minutes avant de brosser.", takeaway: "Attendez 30 minutes avant brossage" },
      { title: "Paille recommandée", body: "Utilisez une paille pour les boissons acides (soda, jus). Limite le contact avec les dents de devant.", takeaway: "Paille = protection" },
      { title: "Fluor protecteur", body: "Le fluor renforce l'émail face aux attaques acides. Un dentifrice fluoré est votre meilleur allié.", takeaway: "Fluor = bouclier de l'émail" },
    ],
  },
  {
    slug: "soins-prevention-reguliers",
    title: "Soins de prévention chez le dentiste",
    excerpt: "Détartrage, bilan, radio : quels sont les soins préventifs essentiels et à quelle fréquence ?",
    categoryCode: "soins",
    bodyMd: "# Soins de prévention chez le dentiste\n\nContenu soins prévention...",
    readingTimeMin: 7,
    categories: ['soins', 'prevention'],
    slides: [
      { title: "Détartrage", body: "1 à 2 fois par an selon votre sensibilité aux calculs. Indolore, il élimine la plaque minéralisée que la brosse ne peut plus enlever.", takeaway: "1-2 fois par an" },
      { title: "Bilan bucco-dentaire", body: "Examen complet des dents, gencives, muqueuses. Le dentiste vérifie l'absence de caries, de lésions, de signes de cancer buccal.", takeaway: "Examen complet annuel" },
      { title: "Radio panoramique", body: "Tous les 2-3 ans environ. Permet de voir les caries entre les dents, les kystes, les dents de sagesse.", takeaway: "Vue d'ensemble des dents" },
      { title: "Sillants dentaires", body: "Application de résine protectrice sur les molaires des enfants. Empêche les caries de sillons. Remboursé par l'Assurance Maladie.", takeaway: "Protection des molaires enfants" },
      { title: "Fluor professionnel", body: "Vernis fluoré appliqué par le dentiste, surtout chez les enfants à risque carieux. Renforce l'émail.", takeaway: "Vernis fluoré = renfort émail" },
    ],
  },
];

// Map category codes to IDs
const codeToId = {};
for (const a of articlesData) {
  for (const code of a.categories) {
    if (!codeToId[code]) {
      const r = await sql.unsafe("SELECT id FROM categories WHERE code = $1", [code]);
      if (r[0]) codeToId[code] = r[0].id;
    }
  }
}
console.log('Category mapping loaded:', codeToId);

// Insert articles
let inserted = 0;
for (const a of articlesData) {
  const slidesJson = JSON.stringify(a.slides);
  await sql.unsafe(
    `INSERT INTO articles (slug, title, excerpt, category, body_md, slides_json, reading_time_min, status, validated_at)
     VALUES ($1, $2, $3, $4, $5, $6, $7, 'validated', now())
     ON CONFLICT (slug) DO UPDATE SET title=EXCLUDED.title, body_md=EXCLUDED.body_md, slides_json=EXCLUDED.slides_json`,
    [a.slug, a.title, a.excerpt, a.categoryCode, a.bodyMd, slidesJson, a.readingTimeMin]
  );

  // Link categories
  for (const code of a.categories) {
    const catId = codeToId[code];
    if (catId) {
      await sql.unsafe(
        `INSERT INTO article_categories (article_slug, category_id) VALUES ($1, $2) ON CONFLICT DO NOTHING`,
        [a.slug, catId]
      );
    }
  }
  inserted++;
}
console.log(`Inserted/updated ${inserted} articles with category links`);

// Verify
const cntArt = await sql.unsafe("SELECT COUNT(*) as cnt FROM articles");
const cntLinks = await sql.unsafe("SELECT COUNT(*) as cnt FROM article_categories");
console.log(`Articles in DB: ${cntArt[0].cnt}`);
console.log(`Article-category links: ${cntLinks[0].cnt}`);

await sql.end();
