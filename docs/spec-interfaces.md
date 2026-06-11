# Spec — 3 interfaces Sensident

> Document de reference pour le developpement des interfaces Patient, Dentiste et Admin.
> Version : 11/06/2026
> Auteur : Tartrinator / Paul

---

## 1. Interface Patient — Bibliotheque personnelle

### Acces
- Lien magique dans l'email newsletter
- Lien "Voir toutes mes ressources" en bas de chaque newsletter email
- Session durable (lien magique), pas de mot de passe

### URL
- Bibliotheque : `c/[slug]/bibliotheque`
- Article : `c/[slug]/bibliotheque/[articleSlug]`

### Layout general
```
Header : "Cabinet du Dr. <nom> — Votre espace prevention bucco-dentaire"
├── [Ma derniere newsletter]  [Tous mes articles]   ← onglets
└── Contenu de l'onglet
```

### Onglet 1 — Ma derniere newsletter
La newsletter la plus recente recue par le patient.
- Titre de l'article + date d'envoi
- Miniature des 5 slides (carrousel)
- Bouton "Lire l'article complet"
- Bouton "Voir toutes mes ressources"

Si le patient n'a jamais recu de newsletter : message vide avec CTA "Consultez nos ressources".

### Onglet 2 — Tous mes articles
Grille d'articles en cartes.

**Ordre d'affichage :**
1. Epingles par le dentiste (badge "Recommande" visible)
2. Newsletters envoyees (date decroissante)
3. Non envoyes mais actives (score de pertinence interne decroissant, NON visible)

**Filtres :**
- Thematiques (dropdown, "Toutes" par defaut)
- Publie / Non publie (toggle, "Tous" par defaut)

**Tri disponible :** aucun (ordre impose — pas de selecteur de tri)

**Carte article :**
```
┌────────────────────────────┐
│ [icone] Hygiene quotidienne│
│                            │
│ 5 astuces pour des dents   │
│ en bonne sante             │
│                            │
│ 12 min  |  Dr. Dupont     │
│ [Nouveau] badge si < 7j   │
└────────────────────────────┘
```

### Page article detaillee
```
← Retour a la bibliotheque
───────────────
Categorie : Hygiene quotidienne
Titre de l'article
Dr. Dupont — 12 juin 2026
───────────────
[Slides 1-5 — carrousel avec navigation]
───────────────
Article complet (body_md)
───────────────
Cette information vous a ete utile ?
  👍 (compteur)    👎 (compteur)
───────────────
← Article precedent   Article suivant →
```

### Reactions patient
- Anonymes (stockees par email hashé)
- 👍 et 👎 uniquement
- Compteur visible par tout le monde
- Un patient ne peut voter qu'une fois par article
- Pas de pseudos, pas de noms

### Tracking (existant, conserve)
- Heartbeat JS toutes les 15s
- Scroll depth
- SendBeacon a fermeture
- Routes : `/api/track/heartbeat`, `/api/track/end`

---

## 2. Interface Dentiste — Onglet "Bibliotheque"

### Emplacement
7e onglet du dashboard, apres "Mon compte".
URL : `/dashboard/library`

### Vue catalogue
Liste des articles du catalogue Sensident (mutualise, 10 articles valides).

**Tri par defaut :**
1. Pertinence (score propre aux patients de CE cabinet)
2. Nouvellement disponibles (jamais envoyes par ce cabinet, tries par date d'ajout au catalogue)
3. Titre alphabetique

**Filtres :**
1. Publie / Non publie (deja envoye en newsletter)
2. Programmée / Non programmée (date d'envoi future planifiee)
3. Thematiques (categories)
4. Epingle / Non epingle (dans la bibliotheque patient)
5. Deja envoye / Jamais envoye par ce cabinet

### Ligne d'article dans la liste
```
┌─────────────────────────────────────────────────────────────────┐
│ [☑] Article "5 astuces..."              Hygiene quotidienne    │
│     ⭐ Epingle                            Score cabinet: 4.2   │
│     Vues: 124 | Temps moyen: 8min | Reac: 👍12 👎1           │
│     Envoye le 01/06/2026                                       │
│                                                                 │
│     [Programmer] [Envoyer a un patient] [Apercu]              │
└─────────────────────────────────────────────────────────────────┘
```

### Colonnes / infos affichees
| Champ | Source |
|-------|--------|
| Checkbox ☑ | `cabinet_library_articles.is_visible` |
| Titre | catalogue |
| Categorie | catalogue |
| Epingle ⭐ | `cabinet_library_articles.is_pinned` |
| Score cabinet | calcule depuis `reading_sessions` de ce cabinet |
| Vues | count `reading_sessions` |
| Temps moyen | avg heartbeat duration |
| Reac 👍👎 | count `patient_reactions` |
| Date envoi | `newsletter_sends` date max |

### Actions

#### Programmer
Redirige vers l'onglet Newsletter avec l'article pre-rempli (composer).

#### Envoyer a un patient
- Modal avec liste des patients inscrits (email + nom si fourni)
- Selection → envoie un magic link qui redirige directement vers l'article
- Route API : `POST /api/newsletter/send-to-patient`
  - Body : `{ cabinetId, articleId, patientEmailHash }`
  - Cree un magic link temporaire + envoie email

#### Apercu
- Ouvre un nouvel onglet avec l'URL `c/[slug]/bibliotheque/[articleSlug]`
- Permet de voir exactement ce que le patient voit

### Stats visibles par article (score cabinet uniquement)
- Score de pertinence (0-5, calcule depuis `reading_sessions` + `article_heartbeats`)
- Nombre de vues
- Temps de lecture moyen
- Reactions 👍 / 👎 (count)

---

## 3. Interface Admin — Stats globales

### Emplacement
Panel admin existant, nouvelle page.
URL : `/admin/stats`

### Indicateurs (haut de page)
```
┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐
│ Patients │ │ Dentistes│ │ Articles │ │ Temps    │
│ opt-in   │ │ actifs   │ │ publies  │ │ lecture  │
│ 1,234    │ │ 12       │ │ 10/10    │ │ 9min avg │
└──────────┘ └──────────┘ └──────────┘ └──────────┘
```

**Definitions :**
- Patients opt-in : count distinct `patient_consents` (tous cabinets)
- Dentistes actifs : cabinets avec au moins 1 newsletter envoyee
- Articles publies : count `cabinet_library_articles.is_visible = true`
- Temps lecture moyen : avg heartbeats duration / sessions (tous cabinets)

### Top articles (score agrege TOUS cabinets)
```
┌─────────────────────────────────────────────────────────────────┐
│ #1  "5 astuces..."    Score: 4.8/5   Reac: 👍45 👎2           │
│     Actif chez: 8/12 cabinets  |  325 lectures totales         │
│─────────────────────────────────────────────────────────────────│
│ #2  "Le sucre..."     Score: 4.2/5   Reac: 👍32 👎5           │
│     Actif chez: 6/12 cabinets  |  210 lectures totales         │
└─────────────────────────────────────────────────────────────────┘
```

Tri : par score decroissant.

### Per cabinet pour un article (click drill-down)
```
Article "5 astuces..." — Tous cabinets
┌──────────────────────────────────────────────────────────┐
│ Cabinet           | Active | Vues | Score | Reac 👍👎    │
│──────────────────────────────────────────────────────────│
│ Dr. Dupont        |  Oui   | 124  | 4.2  | 12 | 1      │
│ Dr. Martin        |  Oui   | 89   | 3.8  | 8  | 0      │
│ Dr. Petit         |  Non   | —    | —    | —  | —      │
└──────────────────────────────────────────────────────────┘
```

"Actif" = visible dans la bibliotheque du cabinet (`is_visible = true`).

### Vue agregee reactions
```
┌────────────────────────────────────┐
│ Reactions totales (tous articles)  │
│                                    │
│ 👍 254  (91.7%)                    │
│ 👎 23   (8.3%)                    │
│                                    │
│ Par article :                      │
│ "5 astuces..."      👍45  👎2     │
│ "Le sucre..."       👍32  👎5     │
│ "Blanchiment"       👍12  👎10    │
└────────────────────────────────────┘
```

### Ratios activation
```
┌──────────────────────────────────────┐
│ Taux d'activation par article        │
│                                      │
│ "5 astuces..."       8/12  (66%)    │
│ "Le sucre..."        6/12  (50%)    │
│ "Blanchiment"        3/12  (25%)    │
└──────────────────────────────────────┘
```

---

## 4. Modifications BDD

### Table `cabinet_library_articles`
```sql
CREATE TABLE cabinet_library_articles (
  id           TEXT PRIMARY KEY,
  cabinet_id   TEXT NOT NULL REFERENCES cabinets(id),
  article_id   TEXT NOT NULL REFERENCES articles(id),
  is_visible   BOOLEAN NOT NULL DEFAULT false,
  is_pinned    BOOLEAN NOT NULL DEFAULT false,
  pin_order    INTEGER NOT NULL DEFAULT 0,
  created_at   TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at   TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE(cabinet_id, article_id)
);
```

### Table `categories`
```sql
CREATE TABLE categories (
  id         TEXT PRIMARY KEY,
  name       TEXT NOT NULL UNIQUE,
  slug       TEXT NOT NULL UNIQUE,
  icon       TEXT,  -- emoji ou icone
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
```

### Table pivot `article_categories`
```sql
CREATE TABLE article_categories (
  article_id  TEXT NOT NULL REFERENCES articles(id),
  category_id TEXT NOT NULL REFERENCES categories(id),
  PRIMARY KEY (article_id, category_id)
);
```

### Table `patient_reactions`
```sql
CREATE TABLE patient_reactions (
  id               TEXT PRIMARY KEY,
  article_id       TEXT NOT NULL REFERENCES articles(id),
  cabinet_id       TEXT NOT NULL REFERENCES cabinets(id),
  patient_email_hash TEXT NOT NULL,
  reaction         TEXT NOT NULL CHECK (reaction IN ('up', 'down')),
  created_at       TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE(article_id, cabinet_id, patient_email_hash)
);
```

### Ajout a `reading_sessions`
- `article_id` (TEXT, FK) — deja present dans le schema actuel ?
  → A verifier dans le schema existant.

### Catégories seed (provisoires)
1. `hygiene-quotidienne` — Hygiene quotidienne
2. `alimentation` — Alimentation
3. `soins-specifiques` — Soins specifiques
4. `prevention` — Prevention
5. `enfants` — Enfants

### Score de pertinence cabinet
Fonction SQL a creer dans la vue `cabinet_article_scores` :
```
score = (vues * 0.3) + (temps_moyen_normalise * 0.4) + (ratio_positif * 0.3)
```
Ou :
- `vues` = nombre de sessions de lecture
- `temps_moyen_normalise` = temps moyen / temps_max_attendu (12min)
- `ratio_positif` = 👍 / (👍 + 👎)

---

## 5. Routes API

### POST /api/newsletter/send-to-patient
Envoyer un article directement a un patient (magic link).
```json
{
  "cabinetId": "uuid",
  "articleId": "uuid",
  "patientEmail": "patient@email.com"
}
```
Reponse : `{ "success": true, "magicLink": "..." }`

### GET /api/admin/stats
Stats globales pour l'interface admin.
Reponse : `{ "totalPatients", "totalDentists", "topArticles": [...], "reactions": {...} }`

---

## 6. Templates newsletter

### Ajout dans le template HTML
Apres les 5 slides, ajouter :
```html
<div style="text-align:center; margin-top:24px;">
  <p style="font-size:14px; color:#666;">
    Vous voulez en savoir plus ?
  </p>
  <a href="{{ARTICLE_COMPLETE_URL}}" style="display:inline-block; padding:12px 24px; background:#0066CC; color:#fff; text-decoration:none; border-radius:6px;">
    Lire l'article complet →
  </a>
  <p style="margin-top:12px; font-size:12px; color:#999;">
    <a href="{{ALL_RESOURCES_URL}}" style="color:#999;">
      Voir toutes mes ressources de prevention
    </a>
  </p>
</div>
```

Variables a injecter dans le template :
- `{{ARTICLE_COMPLETE_URL}}` → `c/[slug]/bibliotheque/[articleSlug]?token=...`
- `{{ALL_RESOURCES_URL}}` → `c/[slug]/bibliotheque?token=...`

---

## 7. Checklist implementation

### Phase 1 — Socle BDD
- [ ] Creer table `categories`
- [ ] Creer table `article_categories`
- [ ] Creer table `cabinet_library_articles`
- [ ] Creer table `patient_reactions`
- [ ] Ajouter categories seed (5 categories)
- [ ] Associer chaque article a sa categorie (seed)
- [ ] Creer vue `cabinet_article_scores`

### Phase 2 — Interface patient
- [ ] Page `c/[slug]/bibliotheque` avec 2 onglets
- [ ] Page `c/[slug]/bibliotheque/[articleSlug]` avec slides + body + reactions
- [ ] Filtres (thematiques, publie/non)
- [ ] Tri (epingle > envoye > non envoye)
- [ ] Bouton reaction 👍👎 (appel API + compteur live)

### Phase 3 — Interface dentiste
- [ ] Page `/dashboard/library` avec liste catalogue
- [ ] Checkbox visible + epingle par article
- [ ] Filtres (publie, programme, thematiques, epingle, deja envoye)
- [ ] Modal "Envoyer a un patient"
- [ ] Bouton "Programmer" → redirect newsletter
- [ ] Stats visibles par article (score, vues, temps, reactions)

### Phase 4 — Interface admin
- [ ] Page `/admin/stats`
- [ ] 4 indicateurs haut de page
- [ ] Top articles tableau
- [ ] Drill-down par article (per cabinet)
- [ ] Reactions agregees
- [ ] Ratios activation

### Phase 5 — Newsletter template
- [ ] Ajouter lien "Lire l'article complet"
- [ ] Ajouter lien "Voir toutes mes ressources"
- [ ] Injecter token magic link dans les variables du template

### Phase 6 — Routes API
- [ ] `POST /api/newsletter/send-to-patient`
- [ ] `GET /api/admin/stats`
- [ ] `POST /api/reactions` (creer/mettre a jour reaction)
- [ ] `GET /api/reactions/[articleId]` (recuperer compteurs)

---

## 8. Notes

- Les categories sont provisoires, a valider par Dr Thibault
- Le score de pertinence est un algo simple (vues * 0.3 + temps * 0.4 + ratio * 0.3), a ajuster
- Les reactions sont anonymes (stockees par email hash)
- Le dentiste voit ses stats cabinet uniquement, pas les stats des autres cabinets
- L'admin voit l'agregat de tous les cabinets
- Pas de marque-page patient (retire de la spec)
- Pas de notification dentiste quand nouvel article ajoute
- Le dentiste peut voir un apercu exact de ce que le patient voit
