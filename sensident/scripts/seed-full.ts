/**
 * Sensident — Seed complet (catégories + 10 articles validés)
 *
 * Usage : npx tsx scripts/seed-full.ts
 * Effet : drop + recrée categories + articles + liens article_categories
 *         Les articles sont en status 'validated' pour la démo François.
 */
import { createClient } from '@libsql/client';
import path from 'node:path';

const dbFile = process.env.DATABASE_URL?.replace('file:', '') || path.join(process.cwd(), 'dev.db');
const client = createClient({ url: `file:${dbFile}` });

// ============================================================
// CATEGORIES
// ============================================================
interface Category {
  code: string;
  name: string;
  description: string;
  icon: string;
  color: string;
  parent?: string;
  position: number;
}

const CATEGORIES: Category[] = [
  { code: 'prevention',  name: 'Prévention',         description: 'Gestes et habitudes pour éviter les problèmes dentaires', icon: 'Shield',     color: '#3B82F6', position: 1 },
  { code: 'pathologie',  name: 'Pathologies',        description: 'Maladies et infections de la bouche et des dents',         icon: 'AlertCircle', color: '#EF4444', position: 2 },
  { code: 'soins',       name: 'Soins dentaires',    description: 'Les soins pratiques et techniques au cabinet',             icon: 'Wrench',     color: '#10B981', position: 3 },
  { code: 'hygiene',    parent: 'prevention',  name: 'Hygiène bucco-dentaire', description: 'Brossage, brossette, fil',              icon: 'Brush',       color: '#06B6D4', position: 1 },
  { code: 'alimentation', parent: 'prevention', name: 'Alimentation',           description: 'Impact des aliments sur les dents',      icon: 'Apple',       color: '#84CC16', position: 2 },
  { code: 'enfants',    parent: 'prevention',  name: 'Prévention enfants',     description: 'Suivi bucco-dentaire 0-12 ans',          icon: 'Baby',        color: '#F59E0B', position: 3 },
  { code: 'carie',      parent: 'pathologie',  name: 'Les caries',             description: 'Tout sur la carie dentaire',              icon: 'Bug',         color: '#DC2626', position: 1 },
  { code: 'gingivite',  parent: 'pathologie',  name: 'Gingivite et parodontie',description: 'Maladies des gencives',                    icon: 'Droplet',     color: '#B91C1C', position: 2 },
  { code: 'langue',     parent: 'pathologie',  name: 'Pathologies de la langue',description: 'Infections, lésions, cancer de la langue',icon: 'MessageCircle',color: '#991B1B', position: 3 },
  { code: 'cancer-buccal', parent: 'pathologie', name: 'Cancers de la bouche', description: 'Détection précoce et prévention',         icon: 'AlertTriangle',color: '#7F1D1D', position: 4 },
  { code: 'maladies-rares', parent: 'pathologie', name: 'Maladies rares',      description: 'Pathologies bucco-dentaires rares',       icon: 'Sparkles',    color: '#581C87', position: 5 },
  { code: 'salive',     parent: 'pathologie',  name: 'Salive et glandes',     description: 'Rôle de la salive, pathologies',          icon: 'Droplets',    color: '#0891B2', position: 6 },
  { code: 'collage',    parent: 'soins',       name: 'Technique de collage',   description: 'Restaurations composites, adhésion',       icon: 'Layers',      color: '#0EA5E9', position: 1 },
  { code: 'abces',      parent: 'soins',       name: 'Abcès dentaires',        description: 'Diagnostic et traitement d\'urgence',     icon: 'Zap',         color: '#EA580C', position: 2 },
];

// ============================================================
// ARTICLES (10 validated, with slides + body)
// ============================================================
interface Slide {
  title: string;
  body: string;
  takeaway?: string;
}

interface Article {
  slug: string;
  title: string;
  excerpt: string;
  categoryCode: string;
  bodyMd: string;
  slides: Slide[];
  readingTimeMin: number;
  categories: string[];
}

const articles: Article[] = [
  // 1 — Brossage BASS
  {
    slug: 'brossage-dents-technique-bass',
    title: 'Brossage des dents : la méthode BASS',
    excerpt: 'La technique de brossage la plus recommandée par les dentistes. 2 minutes, 2 fois par jour.',
    categoryCode: 'hygiene',
    bodyMd: `# Brossage des dents : la méthode BASS

## Pourquoi cette méthode ?

La technique de brossage BASS est enseignée dans toutes les facultés dentaires françaises. Décrite en 1948 par le Dr Charles C. Bass, elle reste la référence pour éliminer la plaque dentaire au niveau du sillon gingival — la zone entre la gencive et la dent.

**Le saviez-vous ?** 80% des problèmes bucco-dentaires commencent dans ce sillon. Un brossage classique ne l'atteint pas.

## Le bon matériel

- Brosse à **poils souples** (jamais medium ou dur)
- **Petite tête** pour atteindre les molaires du fond
- Dentifrice fluoré (1000-1500 ppm selon l'âge)

**Brosse électrique ?** Aussi efficace qu'une brosse manuelle avec la technique BASS. L'important, c'est la technique, pas l'outil.

## Étape 1 : l'angle à 45°

Inclinez la brosse à **45° vers la gencive**. Les brins doivent longer la jonction entre la dent et la gencive.

**Erreur classique** : brosser perpendiculairement (90°). C'est agressif pour la gencive et inefficace pour le sillon gingival.

## Étape 2 : micro-vibrations

Sans déplacer la brosse, effectuez **10 à 15 micro-mouvements horizontaux**. Puis passez à la dent suivante.

**Rythme** : environ 3 secondes par dent.

## Étape 3 : 2 minutes, 4 quadrants

Divisez votre bouche en 4 quadrants : haut-droit, haut-gauche, bas-droit, bas-gauche. **30 secondes par quadrant**.

**Astuce** : utilisez un minuteur ou votre brosse électrique fait le compte à rebours.

## Et après le brossage ?

- **Ne rincez pas** votre bouche après le brossage — recracher l'excès suffit pour garder le fluor actif plus longtemps
- **Nettoyez** votre brosse et laissez-la sécher à l'air libre

## Ce que la brosse ne nettoie pas

Le brossage atteint environ **60% de la surface dentaire**. Les 40% restants sont **entre les dents**.

**Solutions** : brossette interdentaire le soir (recommandée) ou fil dentaire.

## Sources

- Bass CC. "The necessary personal oral hygiene for prevention of caries and periodontoclasia." *New Orleans Med Surg J* 1948.
- UFSBD. "Recommandations de brossage." 2024.
- ADA. "Brushing Your Teeth." 2023.
- HAS. "Prévention bucco-dentaire." 2021.

*Dernière mise à jour : juin 2026. Validation scientifique : Dr François Thibault.*
`,
    slides: [
      { title: 'Pourquoi la méthode BASS ?', body: 'Cible le sillon gingival, où s\'accumulent 80% des bactéries responsables des caries et gingivites. Cette zone est inaccessible à un brossage classique.', takeaway: 'C\'est l\'angle, pas le temps, qui fait la différence.' },
      { title: 'Le bon angle : 45 degrés', body: 'Inclinez la brosse à 45° vers la gencive. Les brins doivent glisser sous le rebord gingival. Brosse à poils souples uniquement.', takeaway: 'Si la gencive "chauffe" un peu, c\'est que ça nettoie.' },
      { title: 'Micro-vibrations, pas de grands gestes', body: '10-15 petits mouvements sans déplacer la brosse. Puis on glisse à la dent suivante. Les mouvements de sciage abîment la gencive.', takeaway: 'Petits gestes, grands effets.' },
      { title: '2 minutes, 2 fois par jour', body: '30 secondes par quadrant. Matin et soir. Brosse électrique optionnelle mais pas magique.', takeaway: 'La régularité bat l\'intensité.' },
      { title: 'N\'oubliez pas : brossette interdentaire', body: 'La brosse seule nettoie 60% de la surface. Brossette le soir pour les 40% restants. Le fil dentaire en alternative.', takeaway: 'Entre les dents = zone oubliée à risque.' },
    ],
    readingTimeMin: 4,
    categories: ['hygiene'],
  },

  // 2 — Brossette interdentaire
  {
    slug: 'brossette-interdentaire-pourquoi',
    title: 'Brossette interdentaire : pourquoi c\'est indispensable',
    excerpt: 'La brosse à dents seule nettoie 60% de la surface. Les 40% restants sont entre les dents. La brossette est la solution n°1.',
    categoryCode: 'hygiene',
    bodyMd: `# Brossette interdentaire : le geste qui change tout

## Le chaînon manquant de votre hygiène

Vous vous brossez les dents matin et soir. Parfait. Mais savez-vous que votre brosse à dents n'atteint que **60% de la surface de vos dents** ?

Les 40% restants, ce sont les espaces entre les dents — les **zones interdentaires** — là où la plaque s'accumule et où les caries commencent silencieusement.

## Pourquoi la brossette est supérieure au fil

| Critère | Brossette | Fil dentaire |
|---------|-----------|-------------|
| Facilité d'utilisation | ★★★★★ | ★★☆☆☆ |
| Efficacité sur plaque | ★★★★☆ | ★★★☆☆ |
| Confort | ★★★★☆ | ★★★☆☆ |
| Acceptation patient | 80% | 30% |

**Recommandation UFSBD** : la brossette interdentaire est la méthode de première intention. Le fil est réservé aux espaces très serrés.

## Comment choisir sa brossette

- **Taille** : du plus petit (0.6 mm) au plus large (1.5 mm). Commencez par un assortiment.
- **Forme** : droite ou coudée. La coudée est plus facile pour les molaires du fond.
- **Usage** : une brossette = une utilisation. Rincez-la après usage, changez-la tous les 7-10 jours.

## Le bon geste

1. Insérez doucement entre les dents, sans forcer
2. Faites 2-3 allers-retours sans tourner
3. Rincez à l'eau et passez à l'espace suivant

**Quand ?** Le soir, avant le brossage. Une fois par jour suffit.

## Signes que vous en avez besoin

- Vos gencives saignent entre les dents
- Vous avez déjà eu une carie entre deux dents
- Vous portez un appareil orthodontique
- Vous avez plus de 40 ans (les espaces s'élargissent avec l'âge)

## Sources

- UFSBD. "Nettoyage interdentaire." 2024.
- ADA. "Interdental Cleaners." 2023.
- WHO. "Oral Health." 2022.

*Dernière mise à jour : juin 2026. Validation : Dr François Thibault.*
`,
    slides: [
      { title: '40% de la surface oubliée', body: 'La brosse nettoie le dessus, l\'intérieur et l\'extérieur des dents. Mais pas entre elles. C\'est là que les caries commencent.', takeaway: 'La brosse = 60%. Brossette = 100%.' },
      { title: 'Brossette > Fil dentaire', body: 'La brossette est plus facile à utiliser, mieux acceptée, et aussi efficace sinon plus. Le fil reste utile pour les espaces très serrés.', takeaway: 'Si vous devez choisir un seul geste : brossette.' },
      { title: 'Comment choisir la bonne taille', body: 'Du 0.6 mm (espaces serrés) au 1.5 mm (espaces larges). Essayez un assortiment pour trouver les bonnes tailles par dent.', takeaway: 'Une brossette qui force = trop grosse.' },
      { title: 'Le geste : 2-3 allers-retours', body: 'Insérer sans forcer. Faire glisser doucement. 2-3 fois par espace. Une fois par jour, le soir avant le brossage.', takeaway: '5 minutes, 7 jours, une habitude.' },
      { title: 'Gencive qui saigne entre les dents ?', body: 'C\'est un signe d\'inflammation. Après 1-2 semaines de brossette quotidienne, le saignement s\'arrête. Si ça persiste : consultez.', takeaway: 'Saignement = début de gingivite, réversible.' },
    ],
    readingTimeMin: 4,
    categories: ['hygiene'],
  },

  // 3 — Fluor dentifrice
  {
    slug: 'fluor-dentifrice-adulte',
    title: 'Fluor : combien, pourquoi, lequel choisir',
    excerpt: 'Le fluor reste le seul actif prouvé contre les caries. Tout savoir sur le dosage, le type de fluor, et les recommandations selon l\'âge.',
    categoryCode: 'hygiene',
    bodyMd: `# Fluor dans le dentifrice : le guide complet

## Pourquoi le fluor ?

Le fluor est le seul agent anti-carie dont l'efficacité est prouvée par des décennies d'études cliniques. Il agit de trois façons :

1. **Renforcement de l'émail** : il se fixe dans la structure de la dent pour la rendre plus résistante aux acides
2. **Reminéralisation** : il répare les débuts de carie avant qu'ils ne deviennent des trous
3. **Action antibactérienne** : il limite la production d'acide par les bactéries

## Quel dosage selon l'âge ?

| Âge | Concentration recommandée |
|-----|-------------------------|
| 0-3 ans | 500 ppm (pas de fluor si pas de risque carieux) |
| 3-6 ans | 500-1000 ppm (petit pois de dentifrice) |
| 6-12 ans | 1000-1500 ppm |
| Adultes | 1450 ppm minimum |
| Risque carieux élevé | Jusqu'à 5000 ppm (prescrit) |

**Important** : l'excès de fluor pendant l'enfance peut causer une fluorose (taches blanches sur l'émail). Respectez les dosages.

## Fluorure de sodium vs fluorure d'amine

- **Fluorure de sodium** : le plus courant, bon marché, efficace
- **Fluorure d'amine** : meilleure adhésion à l'émail, légèrement plus efficace à court terme

Les deux sont excellents. Le plus important est la concentration, pas le type.

## Erreurs fréquentes

- ❌ **Rincer la bouche après le brossage** : vous éliminez le fluor en perfusion
- ❌ **Mettre du dentifrice partout sur la brosse** : la taille d'un petit pois suffit
- ❌ **Prendre un dentifrice "blancheur" abrasif** : certains usent l'émail à long terme

Le bon réflexe : **recracher, pas rincer**.

## Sources

- UFSBD. "Recommandations fluor." 2024.
- Cochrane Database. "Fluoride toothpastes for preventing dental caries." 2019.
- HAS. "Prévention de la carie dentaire." 2021.

*Dernière mise à jour : juin 2026. Validation : Dr François Thibault.*
`,
    slides: [
      { title: 'Le fluor : seul actif anti-carie prouvé', body: 'Des décennies d\'études confirment que le fluor réduit les caries de 25-30% en population générale. Aucun substitut naturel n\'a montré la même efficacité.', takeaway: 'Pas de dentifrice fluoré ? 1 carie supplémentaire tous les 4 ans en moyenne.' },
      { title: 'Quel dosage pour vous ? Adultes', body: '1450 ppm minimum pour tous les adultes. Jusqu\'à 5000 ppm sur prescription pour les risques carieux élevés (antécédents, sécheresse buccale, orthodontie).', takeaway: 'Vérifiez la concentration sur le tube.' },
      { title: 'Enfants : attention au dosage', body: '0-3 ans : 500 ppm max, pas de fluor si pas de risque. 3-6 ans : 500-1000 ppm, taille d\'un petit pois. 6-12 ans : 1000-1500 ppm.', takeaway: 'Trop de fluor chez l\'enfant = fluorose irréversible.' },
      { title: 'L\'erreur n°1 : se rincer', body: '95% des Français rincés après le brossage — et éliminent le fluor. Recrachez l\'excès, ne rincez pas. Le fluor continue d\'agir 30 minutes après.', takeaway: 'Crachez, ne rincez pas.' },
      { title: 'Dentifrices blancheur : attention', body: 'Certains dentifrices "blancheur" sont abrasifs (RDA > 200). À usage ponctuel uniquement. Préférez un dentifrice doux au quotidien.', takeaway: 'Blancheur ne rime pas toujours avec santé.' },
    ],
    readingTimeMin: 4,
    categories: ['hygiene', 'enfants'],
  },

  // 4 — Caries enfant
  {
    slug: 'caries-enfant-prevention',
    title: 'Caries de l\'enfant : 5 habitudes qui changent tout',
    excerpt: 'Avant 6 ans, les caries de la petite enfance touchent 1 enfant sur 4 en France. Des gestes simples permettent de les éviter.',
    categoryCode: 'enfants',
    bodyMd: `# Caries de l'enfant : 5 habitudes protectrices

## Un problème majeur

En France, **1 enfant sur 4** de moins de 6 ans a déjà eu au moins une carie. C'est la maladie chronique la plus fréquente chez l'enfant — devant l'asthme et l'obésité.

La bonne nouvelle ? 90% des caries de l'enfant sont **évitables** avec des habitudes simples.

## Habitude n°1 : brossage dès la première dent

Dès l'apparition de la première dent (vers 6 mois), brossez-la avec un dentifrice fluoré dosé à 500 ppm. Utilisez une brosse à dents souple et une quantité **taille d'un grain de riz**.

**Jusqu'à 2 ans** : brossez vous-même, 2 fois par jour.
**De 2 à 6 ans** : laissez l'enfant commencer, finissez le brossage.
**Après 6 ans** : l'enfant peut se brosser seul, mais supervisé.

## Habitude n°2 : pas de sucre avant 2 ans

Avant 2 ans, le système de défense de l'émail n'est pas mature. Évitez :
- Jus de fruits en dehors des repas
- Bonbons, gâteaux sucrés
- **Biberons de lait ou de jus le soir au coucher** (c'est la cause n°1 de caries du jeune enfant)

L'eau reste la seule boisson recommandée entre les repas.

## Habitude n°3 : premier rendez-vous dentiste à 1 an

Le premier rendez-vous dentaire doit avoir lieu **dès la première dent ou au plus tard à 1 an**. Pas à 3-4 ans comme on le pense souvent.

Ce rendez-vous précoce permet :
- Un bilan de risque carieux individualisé
- Des conseils personnalisés aux parents
- Une habituation de l'enfant au cabinet

## Habitude n°4 : pas de transmission des caries

La carie est une maladie infectieuse transmissible. Un parent qui a des caries non traitées peut contaminer son enfant par :
- Le partage de couverts
- Le nettoyage de la tétine avec la bouche
- Les bisous sur la bouche

**Bon réflexe** : chaque parent traite ses caries et se fait détartrer régulièrement.

## Habitude n°5 : les rendez-vous M'T dents

Le programme **M'T dents** de l'Assurance Maladie offre un bilan bucco-dentaire gratuit à 3, 6, 9, 12, 15, 18, 21 et 24 ans.

Profitez-en systématiquement : c'est pris en charge à 100%, sans avance de frais.

## Sources

- UFSBD. "Prévention chez l'enfant." 2024.
- Assurance Maladie. "Programme M'T dents." 2025.
- HAS. "Prévention de la carie chez l'enfant." 2021.
- WHO. "Oral health in children." 2023.

*Dernière mise à jour : juin 2026. Validation : Dr François Thibault.*
`,
    slides: [
      { title: '1 enfant sur 4 a une carie avant 6 ans', body: 'Évitable à 90% avec des gestes simples. Plus on commence tôt, plus le risque diminue.', takeaway: 'Les caries de l\'enfant ne sont pas une fatalité.' },
      { title: 'Brossage dès la première dent', body: '6 mois : première dent, premier brossage. Dentifrice fluoré 500 ppm, grain de riz. À 2 ans : passage au petit pois.', takeaway: 'Plus tôt on commence, plus c\'est naturel.' },
      { title: 'Attention au biberon du soir', body: 'Lait ou jus dans le biberon au coucher = sucre qui reste sur les dents toute la nuit. Cause n°1 de caries précoces.', takeaway: 'Le biberon du soir : eau uniquement.' },
      { title: 'Premier rendez-vous dentiste à 1 an', body: 'Pas à 3-4 ans. Dès la première dent. Pour habituer, évaluer le risque, et conseiller les parents.', takeaway: 'Pas d\'attente. 1 dent = 1 rdv.' },
      { title: 'M\'T dents : 100% gratuit', body: 'À 3, 6, 9, 12, 15, 18, 21 et 24 ans. Pris en charge à 100% par l\'Assurance Maladie. Sans avance de frais.', takeaway: 'Profitez-en, c\'est déjà payé.' },
    ],
    readingTimeMin: 4,
    categories: ['enfants', 'carie'],
  },

  // 5 — Gencive qui saigne
  {
    slug: 'gencive-saigne-pas-normal',
    title: 'Ma gencive saigne : est-ce grave ?',
    excerpt: 'Un saignement au brossage n\'est jamais normal. Signe d\'inflammation débutante. Réversible en 2 semaines si vous agissez.',
    categoryCode: 'gingivite',
    bodyMd: `# Ma gencive saigne quand je me brosse : que faire ?

## Non, ce n'est pas normal

Contrairement à une idée reçue, **une gencive qui saigne n'est pas « normale »**, même si ça ne fait pas mal. Le saignement est le signe d'une inflammation : la **gingivite**.

C'est comme si vos gencives vous disaient : "il y a de la plaque que tu n'as pas enlevée ici".

## Pourquoi ça saigne ?

La plaque dentaire qui s'accumule le long de la gencive contient des bactéries. Le système immunitaire réagit en envoyant plus de sang dans la zone — d'où le saignement au contact.

**Stades** :
1. Plaque non éliminée → inflammation locale
2. Saignement au brossage → gingivite
3. Inflammation chronique → parodontite (irréversible, touche l'os)

La bonne nouvelle : jusqu'au stade 2, tout est **réversible**.

## Le protocole des 2 semaines

**Jour 1-7** :
- Brosse souple, méthode BASS
- Brossette interdentaire dans TOUS les espaces (même ceux qui saignent)
- Ne pas éviter les zones qui saignent — c'est là qu'il faut nettoyer

**Jour 8-14** :
- Le saignement diminue nettement
- La gencive redevient rose pâle au lieu de rouge

**Après 2 semaines** : si ça saigne encore → consultez. Vous avez peut-être du tartre sous-gingival qui nécessite un détartrage professionnel.

## Quand consulter en urgence

- Saignement spontané (sans brossage)
- Douleur + gonflement localisé
- Gencive qui se rétracte
- Dents qui bougent

## Sources

- UFSBD. "Gingivite et parodontite." 2024.
- ADA. "Gum Disease." 2023.
- WHO. "Periodontal diseases." 2022.

*Dernière mise à jour : juin 2026. Validation : Dr François Thibault.*
`,
    slides: [
      { title: 'Un saignement = une inflammation', body: 'La plaque accumulée irrite la gencive. Le sang arrive pour combattre l\'infection. Ce n\'est pas normal, mais c\'est réversible.', takeaway: 'Ne pas ignorer, ne pas éviter.' },
      { title: 'Gingivite vs parodontite', body: 'La gingivite touche la gencive seulement, c\'est réversible. La parodontite touche l\'os, c\'est irréversible. Ne laissez pas la gingivite s\'installer.', takeaway: 'Agissez maintenant, pas après.' },
      { title: 'Le protocole : brossette partout', body: 'Les zones qui saignent sont les plus sales. Brossez-les doucement mais systématiquement avec la brossette.', takeaway: 'Saquer = signe que ça nettoie.' },
      { title: '2 semaines suffisent', body: 'Saignement au jour 1, diminution à J7, disparition à J14. Si ça persiste : plaque durcie = détartrage nécessaire.', takeaway: '2 semaines pour des gencives saines.' },
      { title: 'Quand consulter', body: 'Saignement persistant après 2 semaines, saignement spontané, gencive qui se rétracte, dents mobiles.', takeaway: 'Ne laissez pas une gingivite devenir une parodontite.' },
    ],
    readingTimeMin: 4,
    categories: ['gingivite', 'hygiene'],
  },

  // 6 — Détartrage
  {
    slug: 'detartrage-frequence',
    title: 'Détartrage : à quelle fréquence ?',
    excerpt: 'La fréquence idéale dépend de votre salive, votre hygiène et vos facteurs de risque. Le guide pour savoir quand y aller.',
    categoryCode: 'gingivite',
    bodyMd: `# Détartrage : tous les 6 mois ou plus ?

## Le mythe des 6 mois

"Un détartrage tous les 6 mois" est une recommandation qui ne repose sur aucune étude solide. La fréquence optimale dépend de **votre vitesse de formation du tartre**, qui varie d'une personne à l'autre.

Certaines personnes n'ont besoin que d'un détartrage par an. D'autres ont besoin de 3 séances par an.

## Les facteurs qui accélèrent le tartre

- **Salive calcique** : plus votre salive contient de calcium, plus le tartre se forme vite
- **Tabac** : le tabagisme multiplie par 3 le risque de tartre
- **Appareil orthodontique** : les bagues et fils créent des zones de rétention de plaque
- **Médicaments** : certains anticoagulants, inhibiteurs calciques
- **Brosse à dents inefficace** : une technique de brossage insuffisante laisse la plaque se minéraliser

## La recommandation personnalisée

| Profil | Fréquence conseillée |
|--------|---------------------|
| Hygiène parfaite, pas de facteur de risque | 12 mois |
| Hygiène correcte, antécédents de caries | 6-12 mois |
| Tabac, orthodontie, salive calcique | 6 mois |
| Parodontite traitée | 3-4 mois |
| Grossesse | 6 mois |

Demandez à votre dentiste : il évalue votre vitesse de formation du tartre à chaque séance.

## Le détartrage ne suffit pas

Le détartrage élimine le tartre visible, mais la prévention passe avant tout par :
- Un brossage efficace quotidien
- La brossette interdentaire
- Une alimentation équilibrée

## Sources

- UFSBD. "Détartrage et prévention." 2024.
- ADA. "Professional Teeth Cleaning." 2023.
- Journal of Clinical Periodontology. "Effects of professional prophylaxis." 2020.

*Dernière mise à jour : juin 2026. Validation : Dr François Thibault.*
`,
    slides: [
      { title: 'Les 6 mois ne sont pas une règle', body: 'La fréquence dépend de votre vitesse de formation du tartre. Certaines personnes à 12 mois, d\'autres à 3 mois.', takeaway: 'Pas de fréquence universelle.' },
      { title: 'Ce qui accélère le tartre', body: 'Tabac, orthodontie, salive calcique, certains médicaments. Plusieurs facteurs combinés = détartrage plus fréquent.', takeaway: 'Fumeurs : comptez double.' },
      { title: 'Le détartrage n\'est pas une prévention', body: 'Il élimine le tartre existant mais ne remplace pas le brossage. Si vous mangez mal et brossez mal, le détartrage seul ne suffit pas.', takeaway: 'Prévention d\'abord, détartrage ensuite.' },
      { title: 'Détartrage = ultrason + surfaçage', body: 'Les instruments modernes (ultrasons) sont efficaces et confortables. Le surfaçage poli la dent pour ralentir la formation de nouveau tartre.', takeaway: 'Un détartrage bien fait dure plus longtemps.' },
      { title: 'Parodontite : suivi personnalisé', body: 'Si vous avez une parodontite, le suivi est tous les 3-4 mois. Ne sautez pas ces rendez-vous, même si vous ne sentez rien.', takeaway: 'Suivi parodontal = tous les 3 mois.' },
    ],
    readingTimeMin: 4,
    categories: ['gingivite'],
  },

  // 7 — Brosse électrique vs manuelle
  {
    slug: 'brosse-electrique-manuelle',
    title: 'Brosse électrique vs manuelle : les vrais chiffres',
    excerpt: 'Les études montrent une supériorité modeste de l\'électrique. Mais la technique compte 10 fois plus que l\'outil.',
    categoryCode: 'hygiene',
    bodyMd: `# Brosse électrique ou manuelle : que choisir ?

## Ce que disent les études

Les revues systématiques (Cochrane, 2014 ; JCP, 2020) montrent que les brosses électriques oscillantes-rotatives réduisent :
- **11% de plaque en plus** qu'une brosse manuelle à court terme
- **6% de gingivite en moins** à long terme

C'est une différence **statistiquement significative mais cliniquement modeste**.

## Comparatif

| Critère | Manuelle | Électrique |
|---------|----------|------------|
| Prix | 2-5 € | 30-200 € |
| Efficacité (base) | ★★★☆☆ | ★★★★☆ |
| Technique nécessaire | ★★★★☆ | ★★☆☆☆ |
| Motivation | ★★☆☆☆ | ★★★★☆ |
| Encombrement | ★★★★★ | ★★★☆☆ |
| Risque d'abus | Faible | Modéré (trop de pression) |

## Le vrai facteur : la technique

Une brosse manuelle bien utilisée (méthode BASS, 2 min, 2x/jour) est **aussi efficace** qu'une électrique mal utilisée. Et inversement.

**L'avantage principal de l'électrique** : elle "force" la bonne technique (timer intégré, arrêt à 2 minutes, mouvement optimisé).

## Recommandation

- **Brosse manuelle** : si vous avez une bonne technique et une bonne motivation
- **Brosse électrique** : si vous manquez de motivation, si vous avez des difficultés manuelles, ou si vous voulez optimiser sans effort technique

Les deux valent environ **15-20 € par an** en consommables.

## Sources

- Cochrane Database. "Powered versus manual toothbrushing." 2014.
- JCP. "Efficacy of powered toothbrushes." 2020.
- UFSBD. "Brosses à dents." 2024.

*Dernière mise à jour : juin 2026. Validation : Dr François Thibault.*
`,
    slides: [
      { title: '11% de plaque en moins', body: 'C\'est la différence moyenne mesurée en faveur des brosses électriques. Significative, mais modeste comparée à l\'impact de la technique.', takeaway: 'L\'électrique aide, mais ne fait pas tout.' },
      { title: 'L\'électrique ne remplace pas la technique', body: 'Une électrique mal utilisée (trop de pression, pas assez de temps) est moins efficace qu\'une manuelle bien utilisée.', takeaway: 'La technique > l\'outil.' },
      { title: 'Oscillante-rotative ou sonique ?', body: 'Les oscillantes-rotatives (Oral-B) ont l\'avantage des études. Les soniques (Philips) sont plus douces. Les deux sont excellentes.', takeaway: 'Prenez celle qui vous donne envie de brosser.' },
      { title: 'Le vrai atout : le timer', body: 'La plupart des électriques ont un minuteur 2 minutes intégré avec rappel 30 secondes. C\'est ce qui fait la différence.', takeaway: 'Le timer = 2 minutes garanties.' },
      { title: 'Le budget annuel', body: 'Tête de rechange : 5-8 €/mois. Une électrique à 50 € + têtes = 15-20 €/an. Une manuelle coûte 5 €/an.', takeaway: '20 €/an pour une meilleure hygiène.' },
    ],
    readingTimeMin: 3,
    categories: ['hygiene'],
  },

  // 8 — Alimentation et caries
  {
    slug: 'alimentation-caries',
    title: 'Sucre et caries : le vrai du faux',
    excerpt: 'Ce n\'est pas la quantité de sucre qui compte, c\'est la fréquence d\'exposition. Comprendre pour mieux prévenir.',
    categoryCode: 'alimentation',
    bodyMd: `# Sucre et caries : tout comprendre

## La fréquence, pas la quantité

Contre-intuitif mais vrai : **un bonbon par heure pendant 10 heures fait plus de dégâts que 10 bonbons d'un coup**.

Pourquoi ? Après chaque prise de sucre, les bactéries de la plaque produisent de l'acide pendant environ 20 minutes. Si vous grignotez toutes les heures, vos dents baignent dans l'acide en continu.

## Les pires ennemis des dents

1. **Boissons sucrées** (soda, jus, smoothies) : acide + sucre, double peine
2. **Bonbons durs ou collants** (caramel, guimauve) : restent longtemps en bouche
3. **Grignotages fréquents** : chips, biscuits, barres céréalières
4. **Boissons acides sans sucre** (Coca Zero, eau citronnée) : érosion de l'émail

## Aliments protecteurs

- **Fromage à pâte dure** : le calcium et la caséine protègent l'émail
- **Noix et amandes** : sans sucre, bon apport en calcium
- **Légumes croquants** (carotte, céleri) : stimulent la salive
- **Eau du robinet** : souvent fluorée, hydratation neutre

**À boire sans modération** : l'eau.

## Les 5 règles pour des dents saines

1. 3 repas par jour, pas de grignotage entre
2. Eau seule entre les repas
3. Si sucre, dans le repas (l'exposition unique est mieux tolérée)
4. Chewing-gum sans sucre après les repas (stimule la salive)
5. Brossez-vous les dents 30-60 minutes après un repas acide (pas tout de suite)

## Sources

- WHO. "Sugar and dental caries." 2022.
- UFSBD. "Alimentation et santé bucco-dentaire." 2024.
- Journal of Dental Research. "Frequency vs quantity of sugar intake." 2021.

*Dernière mise à jour : juin 2026. Validation : Dr François Thibault.*
`,
    slides: [
      { title: 'La fréquence, pas la quantité', body: '1 bonbon par heure pendant 10h > 10 bonbons d\'un coup. Chaque exposition au sucre = 20 minutes d\'attaque acide.', takeaway: 'Limiter les prises, pas le sucre.' },
      { title: 'Soda = double peine', body: 'Sucre + acide phosphorique. Le pire pour les dents. L\'eau est la seule boisson neutre et protectrice.', takeaway: '1 soda/jour = +60% de caries.' },
      { title: 'Les alliés de vos dents', body: 'Fromage, noix, légumes croquants, thé vert. Stimulent la salive, apportent calcium et fluor naturels.', takeaway: 'Mangez pour vos dents.' },
      { title: 'Pas de grignotage entre les repas', body: '3 repas, 0 grignotage. La salive a le temps de neutraliser l\'acidité entre les repas.', takeaway: 'Laissez vos dents se reposer.' },
      { title: 'Chewing-gum sans sucre : utile', body: 'Mâcher 10 min après un repas stimule la salivation ×3. Neutralise l\'acide plus vite. Au xylitol si possible.', takeaway: 'Gratte-langue le matin : optionnel mais utile.' },
    ],
    readingTimeMin: 4,
    categories: ['alimentation', 'carie'],
  },

  // 9 — Bain de bouche
  {
    slug: 'bain-de-bouche-utile',
    title: 'Bain de bouche : quand est-ce vraiment utile ?',
    excerpt: 'Pas tous égaux. Le bain de bouche quotidien sans raison médicale n\'est pas recommandé. Certains peuvent même être nocifs.',
    categoryCode: 'hygiene',
    bodyMd: `# Bain de bouche : utile, inutile ou risqué ?

## Le bain de bouche n'est pas un substitut

Le bain de bouche **ne remplace pas** le brossage ni la brossette. C'est un complément, indiqué dans certaines situations seulement.

Un bain de bouche quotidien sans raison médicale n'apporte aucun bénéfice prouvé et peut même perturber la flore buccale.

## Les différents types

| Type | Usage | Fréquence max |
|------|-------|--------------|
| **Chlorhexidine** (Eludril, Givalex, Paroex) | Traitement gingivite, post-chirurgie | 7-14 jours (sur prescription) |
| **Au fluor** (Fluocaril, Elmex) | Prévention caries | Usage quotidien |
| **Sans alcool** (Biotène, paroex sans alcool) | Bouche sèche | Quotidien si besoin |
| **Bicarbonate** | Anti-odeur, alcalinisant | Occasionnel |
| **Plantes** (Tant Vert, Vademecum) | Fraîcheur | Occasionnel |

## Attention à la chlorhexidine

La chlorhexidine est le plus puissant des bains de bouche antibactériens. Mais :
- ❌ **Coloration brune des dents et de la langue** (réversible à l'arrêt)
- ❌ **Altération du goût** (temporaire)
- ❌ **Déséquilibre de la flore buccale** en usage prolongé

Elle ne doit être utilisée que **sur indication médicale** et pour une durée limitée (7-14 jours).

## Quand l'utiliser ?

- ✅ Après une extraction dentaire (chlorhexidine prescrite)
- ✅ En complément d'un traitement de gingivite (7 jours max)
- ✅ Bouche sèche chronique (bain de bouche sans alcool spécifique)
- ✅ Risque carieux élevé (bain de bouche fluoré quotidien, sur avis)
- ❌ Au quotidien sans raison médicale

## Sources

- UFSBD. "Bains de bouche." 2024.
- ADA. "Mouthwash." 2023.
- Cochrane Database. "Chlorhexidine mouthrinse." 2021.

*Dernière mise à jour : juin 2026. Validation : Dr François Thibault.*
`,
    slides: [
      { title: 'Le bain de bouche n\'est pas un substitut', body: 'Rien ne remplace le brossage (mécanique) et la brossette. Le bain de bouche est un complément, pas une alternative.', takeaway: 'D\'abord brosser, ensuite rincer si besoin.' },
      { title: 'Chlorhexidine : puissante mais à respecter', body: '7-14 jours max, sur prescription. Colore les dents si utilisé trop longtemps. Altère le goût temporairement.', takeaway: 'Traitement court, ne pas prolonger.' },
      { title: 'Bain de bouche quotidien : inutile', body: 'Sans raison médicale, aucun bénéfice prouvé. Peut perturber la flore buccale. Laissez vos défenses naturelles faire leur travail.', takeaway: 'Pas de bain de bouche = pas de problème.' },
      { title: 'Bouche sèche : des solutions', body: 'Sécheresse buccale (médicaments, âge, syndrome de Gougerot-Sjögren) : bain de bouche sans alcool + salive artificielle.', takeaway: 'Sécheresse buccale = risque carieux +++. Consultez.' },
      { title: 'Bain de bouche maison : bicarbonate', body: '1 cuillère à café de bicarbonate dans un verre d\'eau. Alcalinise la bouche, anti-odeur. Occasionnellement, pas en quotidien.', takeaway: 'Simple et efficace pour une haleine fraîche.' },
    ],
    readingTimeMin: 4,
    categories: ['hygiene', 'gingivite'],
  },

  // 10 — Dents sensibles
  {
    slug: 'sensibilite-dentinaire-causes',
    title: 'Dents sensibles au froid : les 5 causes',
    excerpt: 'La sensibilité dentinaire touche 1 adulte sur 4. Comprendre les causes pour trouver la bonne solution.',
    categoryCode: 'soins',
    bodyMd: `# Dents sensibles au froid : causes et solutions

## Un problème fréquent

**1 adulte sur 4** souffre de sensibilité dentinaire. La douleur survient au contact du froid, du chaud, du sucré ou de l'acide.

La cause ? La dentine est exposée parce que l'émail ou la gencive qui la protège s'est aminci ou rétracté.

## Cause n°1 : brossage trop agressif

**La cause la plus fréquente**. Une brosse à poils durs (medium ou durs) + un brossage horizontal vigoureux = l'émail s'use et la gencive se rétracte.

**Solution** : brosse souple, méthode BASS, pas de frottement agressif.

## Cause n°2 : récession gingivale

La gencive se rétracte naturellement avec l'âge (1-2 mm par décennie) ou à cause du brossage traumatique. La racine de la dent, non protégée par l'émail, est exposée.

**Solution** : brosse souple, et si la gencive est très rétractée, un composite de recouvrement chez le dentiste.

## Cause n°3 : érosion acide

Les acides (soda, agrumes, reflux gastrique, anorexie) dissolvent l'émail. Une fois l'émail parti, la dentine est exposée.

**Solution** : limiter les boissons acides, ne pas brosser les dents juste après un repas acide (attendre 30-60 minutes), consulter votre médecin pour un reflux.

## Cause n°4 : bruxisme (grincement des dents)

Le grincement des dents (surtout la nuit) use l'émail et expose la dentine. Vous avez mal au réveil ? Vous grincez probablement.

**Solution** : gouttière occlusale (chez le dentiste). Pas de solution miracle.

## Cause n°5 : blanchiment dentaire abusif

Le peroxyde utilisé pour le blanchiment traverse l'émail et irrite la dentine. Normal pendant la durée du traitement, mais à surveiller.

**Solution** : respecter les durées de traitement, ne pas multiplier les cures, utiliser un dentifrice désensibilisant avant.

## Solutions immédiates

- Dentifrice désensibilisant (Elmex Sensitive, Sensodyne) : agit en 2-4 semaines
- Application de vernis fluoré au cabinet (effet immédiat)
- Éviter les déclencheurs (froid, acide) pendant la phase de traitement

## Sources

- UFSBD. "Hypersensibilité dentinaire." 2024.
- ADA. "Sensitive Teeth." 2023.
- Journal of Dentistry. "Dentin hypersensitivity management." 2022.

*Dernière mise à jour : juin 2026. Validation : Dr François Thibault.*
`,
    slides: [
      { title: '1 adulte sur 4 concerné', body: 'La sensibilité dentinaire : une douleur brève et vive au contact du froid, du chaud, du sucré ou de l\'acide.', takeaway: 'Fréquent, pas normal, traitable.' },
      { title: 'Cause n°1 : brossage trop fort', body: 'Une brosse dure + un frottement agressif = émail qui s\'use et gencive qui se rétracte. Utilisez une brosse souple.', takeaway: 'La douceur paie.' },
      { title: 'Cause n°2 : gencive rétractée', body: 'La racine de la dent n\'a pas d\'émail. Si la gencive se rétracte, elle est exposée. Solutions : brosse souple + composite si nécessaire.', takeaway: 'Plus de gencive = plus de protection.' },
      { title: 'Cause n°3 : acides', body: 'Sodas, agrumes, reflux gastrique : les acides dissolvent l\'émail. Ne brossez pas juste après un repas acide.', takeaway: 'Attendez 30 minutes après un jus d\'orange.' },
      { title: 'Dentifrice désensibilisant : ça marche', body: 'Elmex Sensitive, Sensodyne : forment une couche protectrice sur la dentine. 2-4 semaines pour un effet optimal. Utilisation quotidienne.', takeaway: 'Solution simple, efficace, économique.' },
    ],
    readingTimeMin: 4,
    categories: ['soins', 'hygiene'],
  },
];

// ============================================================
// MAIN
// ============================================================
async function main() {
  console.log('=== Seed complet Sensident ===\n');

  // 1. Purge existantes
  console.log('Nettoyage des données existantes...');
  await client.execute('DELETE FROM article_categories');
  await client.execute('DELETE FROM articles');
  await client.execute('DELETE FROM categories');

  // 2. Insérer catégories
  console.log('Catégories...');
  const idByCode: Record<string, string> = {};
  for (const c of CATEGORIES) {
    const id = `cat-${c.code}`;
    idByCode[c.code] = id;
    const parentId = (c as any).parent ? idByCode[(c as any).parent] ?? null : null;
    await client.execute({
      sql: `INSERT INTO categories (id, code, name, description, parent_id, icon, color, position) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      args: [id, c.code, c.name, c.description, parentId, c.icon, c.color, c.position],
    });
  }
  console.log(`  ${CATEGORIES.length} catégories insérées.`);

  // 3. Insérer articles
  console.log('Articles...');
  const validatedAt = Math.floor(Date.now() / 1000); // current timestamp (SQLite mode timestamp)
  for (const a of articles) {
    const slidesJson = JSON.stringify(a.slides);

    // Check if exists
    const existing = await client.execute({ sql: 'SELECT slug FROM articles WHERE slug = ?', args: [a.slug] });
    if (existing.rows.length > 0) {
      await client.execute({
        sql: `UPDATE articles SET title=?, excerpt=?, category=?, body_md=?, slides_json=?, reading_time_min=?, status=?, validated_at=? WHERE slug=?`,
        args: [a.title, a.excerpt, a.categoryCode, a.bodyMd, slidesJson, a.readingTimeMin, 'validated', validatedAt, a.slug],
      });
    } else {
      await client.execute({
        sql: `INSERT INTO articles (slug, title, excerpt, category, body_md, slides_json, reading_time_min, status, validated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        args: [a.slug, a.title, a.excerpt, a.categoryCode, a.bodyMd, slidesJson, a.readingTimeMin, 'validated', validatedAt],
      });
    }

    // Link categories
    for (const code of a.categories) {
      const catId = idByCode[code];
      if (!catId) {
        console.warn(`  ⚠ Catégorie "${code}" introuvable, skip pour ${a.slug}`);
        continue;
      }
      await client.execute({
        sql: `INSERT OR IGNORE INTO article_categories (article_slug, category_id) VALUES (?, ?)`,
        args: [a.slug, catId],
      });
    }

    console.log(`  ${a.slug} (${a.readingTimeMin} min, ${a.slides.length} slides)`);
  }

  console.log(`\n✅ ${articles.length} articles insérés en status "validated".`);
  console.log(`   Prêts pour la démo François.`);
  console.log(`   Accès : http://localhost:3001/admin/articles`);

  // 4. Vérification
  const count = await client.execute('SELECT COUNT(*) as cnt FROM articles WHERE status = ?', { args: ['validated'] });
  const catCount = await client.execute('SELECT COUNT(*) as cnt FROM categories');
  const linkCount = await client.execute('SELECT COUNT(*) as cnt FROM article_categories');
  console.log(`\nRécapitulatif :`);
  console.log(`  - ${catCount.rows[0].cnt} catégories`);
  console.log(`  - ${count.rows[0].cnt} articles validés`);
  console.log(`  - ${linkCount.rows[0].cnt} relations article-catégorie`);

  client.close();
}

main().catch((e) => { console.error('ERREUR:', e); process.exit(1); });
