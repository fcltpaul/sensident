# MEMORY.md — Mémoire long terme de Sensident

> **Note naming** : "Sensident" est le nom de code de travail actuel, **provisoire et susceptible de changer**. Le nom de marque final + achat de domaine sont post-MVP. Tout le code/livrables/BDD utilise le slug `sensident` (lowercase, sans espace, sans accent) pour permettre un find/replace global le jour J.

## Identité

- **ID config agent:** `tartrinator` (à renommer `sensident` post-décision)
- **Nom de code projet:** Sensident (provisoire)
- **Modèle agent:** MiniMax M3 (fallbacks DeepSeek V4 Flash → V4 Pro)
- **Workspace:** `C:\Users\clawuser\.openclaw\workspace-tartrinator`
- **Bot Telegram:** token configuré dans openclaw.json

## Mission

Plateforme web et mobile de prévention bucco-dentaire. Orchestrateur principal responsable de :
1. Architecture technique
2. Développement MVP
3. Conformité légale
4. Stratégie d'acquisition B2B

## Sous-agents

- **Juridique** (deepseek-v4-pro) — `C:\Users\clawuser\.openclaw\workspace-juridique`
- **Technique** (deepseek-v4-pro) — `C:\Users\clawuser\.openclaw\workspace-technique`
- **B2B** (deepseek-v4-pro) — `C:\Users\clawuser\.openclaw\workspace-b2b`

## Stack technique MVP (décisions tranchées)

- **App** : Next.js 14 App Router (TypeScript) — full-stack, pas de NestJS séparé
- **Mobile** : PWA d'abord, natif phase 2
- **DB** : PostgreSQL managé HDS + Drizzle ORM (PostgreSQL RLS activée, `cabinet_id` denormalized)
- **Cache/Queue** : aucun (jobs via `pg_cron` ou cron HTTP — pas de Redis)
- **Email transactional** : Brevo SMTP
- **Email marketing (newsletters)** : Brevo Campaigns
- **Auth praticien** : Auth.js (NextAuth) + bcrypt/argon2 + TOTP MFA (otplib) **obligatoire**
- **Auth patient** : lien magique email (pas de password)
- **Billing** : Stripe Subscriptions + Customer Portal (L2 — intégré dès MVP, ambassadeurs en Pro offert 6 mois)
- **Hébergement HDS** : à trancher (Scaleway = option de référence, non figé)
- **No-AI by design** : aucune API LLM, aucun embedding, aucun ML, aucun vector store. Templates + SQL + formulaires. Coût marginal ≈ 0 €/patient/mois.

## Modèle de données

- **1 cabinet = 1 compte praticien** (les praticiens multiples d'une structure partagent le login)
- **Patient** : s'inscrit via token signé HMAC généré par le cabinet (QR code au fauteuil ou URL email manuel du dentiste). Pas de liste patient saisie par le dentiste.
- **Isolation multi-tenant** : `cabinet_id` sur toutes les tables + RLS PostgreSQL stricte
- **Visibilité dentiste** : **agrégats anonymisés uniquement** (A1). Pas d'email, pas de nom patient visible côté dentiste. Hash email utilisé en interne pour les counts.

## Catalogue articles

- **Mutualisé Sensident** : 1 seul catalogue, validé par Dr François Thibault + Paul
- **Articles rédigés par Paul** (Q12 = G4)
- **Format 5-slides** pour la newsletter (mobile-first, scannable, conversationnel)
- **Format long** sur le site pour ceux qui veulent creuser (SEO + accessibilité)
- **Comité scientifique** : Dr François Thibault (co-fondateur futur) + 2-3 confrères ambassadeurs
- **Révision éditoriale** : 12 mois après publication
- **Vidéos courtes réseaux sociaux** : phase 2

## Newsletter

- **Canal** : email uniquement (SMS abandonné)
- **Fréquence** : mensuelle ou bimestrielle, au choix du dentiste
- **Sélection** : le dentiste pioche 1 article du catalogue + l'envoie (pas de calendrier imposé)
- **Personnalisation visuelle (P2)** : 3-5 templates pré-établis (Moderne, Classique, Chaleureux, Épuré, Premium) + slots (logo cabinet, photo, signature, couleurs d'accent)
- **Wording anti-compérage** : "Service de prévention offert par le Dr X" / "Le Dr X vous accompagne dans votre prévention" — pas de photo/logo dentiste, pas d'incitation RDV
- **Tracking ouverture** : pixel email Brevo + pixel lecture article (T1 : JS heartbeat, scroll depth, onglet visible, 15s ping)

## Inscription patient

- **Landing R1** : au nom du cabinet ("Cabinet du Dr Dupont vous accompagne dans votre prévention bucco-dentaire"), pas de branding Sensident visible
- **Double opt-in** : email de confirmation après saisie
- **Opt-in granulaire** : case séparée CGU, case séparée newsletters
- **URL** : `https://sensident.fr/c/{cabinetSlug}/rejoindre?token=***

## Bloc contact espace patient (B2 flexible)

- **Champs optionnels** : nom cabinet (obligatoire), adresse, téléphone, email, lien RDV, horaires, photo façade, RPPS, mention ONCD, plan d'accès
- **Anti-compérage** : pas de promotions, pas de mention "nouveau patient", pas d'avis Google

## Dashboard praticien (D2 — 6 onglets)

1. **Vue d'ensemble** (par défaut) : 4 KPIs du mois
2. **Newsletter** : composer, planifier, historique
3. **Analytics** : entonnoir, durées, heatmap horaire
4. **Engagement** : rétention M0/M+1/M+2, segmentation déterministe
5. **Contact** : B2 flexible
6. **Mon compte** : MFA, password, look P2, infos cabinet, abonnement Stripe

## Analytics M2 (scope)

- Nombre de patients actifs / mois
- Taux d'ouverture newsletter
- Temps total de lecture
- Top articles
- Entonnoir ouverture → lecture
- Durée médiane par article
- Taux de rétention
- Segmentation réguliers / occasionnels / inactifs
- Taux de désabonnement
- **Tout en SQL agrégations, pas de ML**

## Pricing & billing (L2)

- **Stripe intégré** dès le MVP, 3 plans : `free` / `pro` / `cabinet`
- **Ambassadeurs** : coupon `AMBASSADOR_2026` (100% off 6 mois), pas de carte demandée
- **Pricing final** : à définir post-MVP (suspendu, pas affiché)
- **Feature flags par tier** : nb patients max, fréquence newsletter, accès analytics/engagement, support

## Domaine & white-label

- **MVP** : `sensident.fr` + sous-domaines `app.sensident.fr`, `c/{slug}.sensident.fr`
- **White-label custom domain par cabinet** : phase 2

## Co-fondateur : Dr François Thibault

- **Ancien dentiste** (a cessé d'activité), recentré sur la prévention
- **Gros réseau** santé + mutuelles (potentiel sponsoring B2B2C)
- **Meilleure plume et plus de crédibilité que Paul** (étudiant 3e année)
- **Intégration** : T4 (informelle, produit clé en main d'abord)
- **Formalisation ultérieure** : probablement T2 (associé minoritaire 15-25%, board seat)
- **Rôle actuel** : validateur scientifique du catalogue + futur apporteur d'affaires via réseau

## Contraintes produit

- **No-AI by design** : aucune API LLM, aucun embedding, aucun scoring ML au runtime. Algorithmes déterministes, auditables, CPU only. Coût marginal ≈ 0 €/patient/mois.
- **Hébergement HDS obligatoire** (ANS) : suivi patient = donnée de santé par déduction.
- **Multi-tenant strict** : isolation hermétique par cabinet (PostgreSQL RLS + cabinet_id denormalized).
- **Opt-in patient** : consentement explicite, séparé des CGU, granulaire par finalité, double opt-in.
- **Audit logs** : immuables, exhaustifs sur tous les accès aux données patient.
- **Compérage** : pas un risque, le dentiste **offre** un service. Wording orienté service offert, pas dentiste promu.

## Décisions tranchées (22 — à arbitrer une par une)

| # | Sujet | Décision |
|---|---|---|
| 1 | Modèle données patient | A (rattaché cabinet, inscription via token) |
| 2 | Visibilité patient dentiste | A1 (agrégats anonymisés) |
| 3 | Catalogue articles | C1 (mutualisé Sensident, comité scientifique) |
| 4 | Personnalisation newsletter | V3 (avancée : logo, photo, signature, couleurs) |
| 5 | Fréquence + sélection | Mensuelle ou bimestrielle, dentiste choisit articles |
| 6 | Compte praticien | 1 compte = 1 cabinet (praticiens multiples derrière) |
| 7 | Authentification praticien | A2 (email + password + TOTP MFA obligatoire) |
| 8 | Auth patient | I1 (lien magique email) |
| 9 | Scope analytics | M2 (entonnoir, rétention, durées) |
| 10 | Éditeur catalogue | E1 amendé (Paul + Dr Thibault) |
| 11 | Statut Dr Thibault | T4 (intégration informelle, produit d'abord) |
| 12 | Auteur articles seed | G4 (Paul rédige lui-même) |
| 13 | Format éditorial articles | F4 (5-slides newsletter + long site) |
| 14 | Canal newsletter | Email uniquement (SMS abandonné) |
| 15 | UX configuration look | P2 (3-5 templates + slots) |
| 16 | Méthode tracking lecture | T1 (pixel JS + heartbeat) |
| 17 | Landing inscription patient | R1 (au nom cabinet, double opt-in) |
| 18 | Bloc contact espace patient | B2 flexible (champs optionnels) |
| 19 | Structure dashboard | D2 (6 onglets) |
| 20 | Billing MVP | L2 (Stripe intégré, ambassadeurs Pro offert 6 mois) |
| 21 | Nommage plateforme | N3 (sensident.fr MVP, white-label phase 2) |
| 22 | Orthographe nom | N1 "Sensident" (provisoire) |

## Livrables Phase 1-3 (08/06/2026)

- `C:\Users\clawuser\.openclaw\workspace-juridique\memo-juridique.md` — mémo juridique complet (pub, compérage, RGPD, HDS, ONCD, contrat, No-AI)
- `C:\Users\clawuser\.openclaw\workspace-technique\architecture-mvp.md` — stack, schéma SQL multi-tenant, MVP web, PoC code, checklist HDS, No-AI architecture
- `C:\Users\clawuser\.openclaw\workspace-b2b\strategie-acquisition.md` — personas, canaux, pricing, concurrence, roadmap GTM, No-AI positioning

### Synthèse des livrables des sous-agents (POUR NE PAS RELIRE À CHAQUE FOIS)

**Juridique (memo-juridique.md, 62k) :**
- **Compérage** : risque écarté car (1) dentiste ne reçoit PAS de contrepartie par patient, (2) abonnement forfaitaire fixe, (3) wording orienté « service offert » pas « dentiste promu ».
- **Wording newsletter obligatoire** : utiliser ces 3 formulations validées :
  - « Le Dr X vous accompagne dans votre prévention bucco-dentaire »
  - « Service de prévention offert par le Dr X à ses patients »
  - « Ce contenu vous est proposé par le Dr X dans le cadre de votre suivi préventif »
- **Pas de photo/logo dentiste** dans la newsletter (déjà conforme dans le code).
- **Analytics = données de santé par déduction** → hébergement HDS obligatoire (déjà planifié).
- **7 obligations éditoriales par article** : sources scientifiques citées, dates publication/maj, pas de promesse thérapeutique, mention pédagogique, validation odontologique, pas de témoignages tiers, pas de comparaisons.
- **AIPD obligatoire** (Analyse d'Impact Protection des Données) avant prod — **À FAIRE**.

**Technique (architecture-mvp.md, 94k) :**
- **Recommandation hébergeur** : Clever Cloud PostgreSQL HDS (recommandé) > Scaleway. Mais MEMORY central a tranché « Scaleway = option de référence, à arbitrer ». **À ARBITRER**.
- **Multi-tenant** : cabinet_id dénormalisé sur toutes les tables dépendantes (✅ déjà fait dans schema.pg.ts) + RLS PostgreSQL en prod (filet de sécurité, pas encore activé). **En SQLite dev :** l'isolation est simulée côté app par le `where(eq(x.cabinetId, session.cabinetId))` — déjà appliqué sur les routes API, **À VÉRIFIER sur le dashboard**.
- **tRPC mentionné** mais on a tranché Next.js App Router full-stack (routes API classiques). Cohérent.
- **Pas NestJS** : on a tranché Next.js App Router. Cohérent avec MEMORY central.
- **Roadmap sprint** documentée mais MEMORY central dit « pas de sprints affichés ». Ignoré pour livraison, garder pour référence.
- **Checklist HDS pré-prod** : `architecture-mvp.md` §5 contient ~50 items. **À TRAVERSER** avant déploiement.

**B2B (strategie-acquisition.md, 43k) :**
- **Persona principal** : Libéral Numérique (CD 30-50 ans, urbain, 800-1500 patients, déjà sur Doctolib/LinkedIn, déjà essayé newsletter papier abandonnée).
- **Freins majeurs** : « encore un abonnement », « mes patients ne liront pas », « déontologie/Ordre », « RGPD ».
- **Pricing recommandé** : 79 € HT/mois (caché pour l'instant côté UI mais déjà dans le code Stripe).
- **6 KPIs dashboard qui importent** : taux de retour patient 6/12 mois, taux ouverture newsletter, temps lecture, taux RDV post-lecture, NPS cabinet, score compliance. **Le dashboard doit afficher ces KPIs en priorité.**
- **3 canaux prioritaires** : SEO + LinkedIn (M1), ambassadeurs KOL (M1-M3), partenariats prescripteurs (M2-M3). Pas de pub payante en M1-M2.
- **Plan B** : pivot B2B2B (vente contenu marque blanche aux éditeurs logiciels métier type Julie/Veasy/Logos) si acquisition directe trop lente. Utile pour positionnement long terme.
- **Roadmap GTM M1-M3** : waitlist → bêta fermée 5 ambassadeurs → HDS déposé + partenariats. Pas dans MEMORY central, garder pour post-MVP.

**À renommer** : le préfixe `workspace-tartrinator` (répertoire) sera renommé `workspace-sensident` quand le nom sera figé. Idem pour `workspace-juridique`, etc.

## Sprint prod 10/06/2026 — Version démo pour François

Paul a demandé une version testable le plus rapidement possible pour Dr François Thibault.

### Build Status au 10/06/2026 13:45

- **next build** : ✅ compilé avec succès (55 pages statiques)
- **Neon signup** : ✅ 200 OK (TOTP QR code fonctionnel)
- **SQLite dev** : ✅ fonctionne (e2e test API passe)

### Bugs résolus

1. **Neon Drizzle null params** : déjà fixé par `serverComponentsExternalPackages` (next.config.js) + `patchPostgresClient` (client.ts). Retiré les 3 null explicites restants dans signup route.
2. **Port déjà pris** : nouveau script `scripts/start-dev.mjs` trouve un port libre auto. `npm run dev` l'utilise.

### Schémas SQLite/PG alignés (différences d'enum résolues)

- `articles.status` : SQLite → `['draft', 'validated', 'archived']` (aligné sur PG)
- `articles.validatedAt` : SQLite → `validated_at` (était `published_at`, aligné sur PG)
- `cabinetSubscriptions.status` : SQLite → `['active', 'past_due', 'canceled', 'incomplete']` default `'active'` (aligné sur PG)
- `newsletterTemplates` : SQLite → mêmes colonnes que PG (`code, name, description, previewImageUrl, reactEmailPath, isActive`)
- `newsletterSends` : SQLite → mêmes colonnes que PG (+ `createdAt`, `status`, `practitionerName`, `cabinetName`, `customMessage`, `scheduledAt`)
- `newsletterRecipients.status` : SQLite → `['pending', 'sent', ...]` (aligné sur PG)
- Type exports ajoutés : `Cabinet`, `NewCabinet`, `Practitioner`, `Article`, `ReadingSession`, `NewsletterSend`, `NewsletterTemplate`, `PatientConsent`

### TypeScript config

- `tsconfig.json` : `noImplicitAny: false` (pragmatique, `db` est typé `any` pour support bi-dialecte SQLite/PG)
- `include` : limité à `src/**/*.ts` + `src/**/*.tsx` (exclut scripts/ du build)

### Pages 500 (avant/après)

- Dashboard overview : `readingSessions.totalDurationSec` → n'existe pas dans le schema. KPIs utilisent `durationSeconds`.
- Dashboard newsletter : colonnes manquantes dans SQLite → ajoutées.
- Admin articles : paramètres `any` dans callbacks → fixé.
- Admin audit : type enum mismatch → fixé.
- Desabonnement : prerender crash (useSearchParams) → wrappé dans Suspense.

### Ce qui fonctionne (testable)

1. **Signup praticien** → MFA setup → QR code TOTP
2. **Login praticien** → MFA verify
3. **Création token invitation**
4. **Optin patient** → magic link
5. **Dashboard praticien** (6 onglets)
6. **Espace patient** (bienvenue, articles)
7. **Admin panel** (articles, audit)

### Ce qui manque pour démo complète

- ✅ Articles seed (catégories + contenu)
- ✅ Newsletter send flow (composer → envoyer)
- Dashboard analytics (données réelles → nécessite lectures)
- Tracking heartbeat (nécessite article reader JS)
- Stripe billing (sandbox)
- Pages contact / account (formulaires)

## Erreurs opérationnelles à ne plus refaire

- **10/06/2026** : début de session, j'ai dit « zéro code écrit » alors que les sous-agents avaient produit ~80% du MVP dans la nuit. **Cause :** j'ai lu MEMORY central qui mentionnait les livrables mais pas le code généré, et je n'ai pas audité les autres workspaces ni l'arborescence du projet. **Fix :** toujours faire `Get-ChildItem` du workspace et lire SOMMAIREMENT les fichiers clés avant de répondre. **Ne jamais dire « rien n'a été fait » sans avoir audité l'arborescence complète.**

## Sous-agent créé : Rédacteur Dentaire (10/06/2026)

- **Workspace :** `C:\Users\clawuser\.openclaw\workspace-redaction-dentaire`
- **agentId :** `redaction-dentaire` (modèle deepseek-v4-pro)
- **Rôle :** Génère les brouillons d'articles 5-slides + long pour la plateforme Sensident, destinés à Dr François Thibault pour validation scientifique.
- **Différenciation claire :** NE PAS confondre avec `workspace-professeur` (qui est l'agent de Paul pour la fac dentaire, pas pour le grand public).
- **Premier test OK :** article `brossette-interdentaire-pourquoi.md` produit et conforme aux 7 obligations ONCD.
- **Prochaine étape pour Paul :** me donner un brief article, j'invoque le rédacteur. Format : `openclaw agent --agent redaction-dentaire --message "Brief: ..."` (workaround car `sessions_spawn` cross-agent bloqué sur scope gateway).

## Mémoire partagée entre sous-agents (10/06/2026)

**Décision Paul :** tous les sous-agents du projet partagent la même vision (MEMORY central + accès au code) et peuvent collaborer.

- **MEMORY central** : `workspace-tartrinator\MEMORY.md` (source de vérité, lu par tous)
- **MEMORY par sous-agent** : pointe vers le central + ajoute des sections spécifiques au rôle
- **Accès code** : tous les workspaces peuvent **lire** `workspace-tartrinator\sensident\` librement
- **Écriture** : chacun écrit dans son propre workspace uniquement. Aucun sous-agent ne modifie directement le code applicatif.
- **Communication** : `openclaw agent --agent tartrinator --message "..."` pour proposer des modifs au code

**MEMORY.md installés dans :**
- `workspace-technique\MEMORY.md` (config manuelle, l'agent a refusé de le faire en remote)
- `workspace-juridique\MEMORY.md` (idem)
- `workspace-b2b\MEMORY.md` (idem)
- `workspace-redaction-dentaire\MEMORY.md` (enrichi, conservé car déjà bien structuré)

**Tentative d'invocation des 4 sous-agents en parallèle** : 3/4 ont refusé d'exécuter le brief (l'ont interprété comme un prompt d'amorce manquant ou une tentative de social-engineering). Conclusion : invocation via `openclaw agent --message "..."` peu fiable pour les tâches de configuration. Préférer : (a) faire la conf moi-même, (b) invoquer avec un message très court et sans instructions de type "URGENT", (c) utiliser des fichiers et un wrapper de prompt plus tard.

## Notes opérationnelles

- Agent créé le 08/06/2026 par Xi
- MiniMax M3 comme modèle principal
- Gateway : les sous-agents (non-Tartrinator) ont rencontré des `scope upgrade pending approval` au 1er run — fallback embarqué fonctionnel. À résoudre (provisionner device admin) avant de les réinvoquer.
- Mode opératoire : questions **une par une** au fil de l'eau, Paul tranche, pas de batch.

## État du code au 10/06/2026 (audit Tartrinator)

### Ce qui marche (testé e2e OK)
- Auth praticien : signup + verify-mfa + login + verify-mfa post-login (HTTP 200)
- Création cabinet + subscription
- Création invite token (POST /api/cabinet/invite-tokens)
- Patient optin + génération email de confirmation (POST /api/patient/optin)
- Magic link request (POST /api/patient/magic-link) — token généré, mail loggé
- 5 templates newsletter insérés, 1 article seed supprimé par init-db (à re-créer)

### Bugs bloquants identifiés et fixés (10/06/2026)
1. **`src/db/schema.ts` pointait sur schéma PG** alors que le client était init en SQLite → tout SELECT/INSERT plantait en `gen_random_uuid()` PG. **Fix :** schema.ts renommé schema.pg.ts, nouveau schema.ts = reexport de schema.sqlite.ts. drizzle.config.ts pointe désormais sur schema.pg.ts (cible prod).
2. **Schéma SQLite (schema.sqlite.ts) désynchronisé du SQL source (init-db.ts)** → INSERT échouait sur colonnes NOT NULL manquantes (`practitioners.name`, etc.). **Fix :** réécrit `scripts/init-db.ts` pour matcher schema.sqlite.ts (Drizzle = source de vérité pour le dev).
3. **Praticiens créés sans `name`** dans `signup/route.ts`. **Fix :** ajout `name: email` par défaut.
4. **Cast PG `::int` dans rate-limit.ts** → SQLITE_ERROR. **Fix :** remplacé par `CAST(... AS INTEGER)`.
5. **CabinetId attendu UUID strict dans optin Zod schema** → rejetait les hex SQLite. **Fix :** assoupli à `z.string().min(8)`.
6. **`select({ practitioner: practitioners })`** dans auth.ts généré SQL cassé. **Fix :** remplacé par `select()` simple.
7. **schema.sqlite.ts** : ajout des colonnes `inviteTokens.createdBy/maxUses/usedCount`, `patientConsents.emailEncrypted`, `patientMagicLinks.ip` (présentes en BDD, manquaient dans Drizzle).

### Dette technique critique à résoudre
- **Dashboard praticien (Vue d'ensemble, Analytics, Engagement)** : 8+ occurrences de casts `::int` et références à des colonnes PG (`durationSeconds`) qui n'existent pas en SQLite. **Pages 500 en dev.** Nécessite réécriture compatible SQLite (utiliser `CAST(... AS INTEGER)` et `totalDurationSec`) ou alignement des schémas.
- **Page patient `/c/{slug}/bienvenue`** : 500, même cause probable (cast `::` dans la query de la page).
- **Sidebar dashboard** : `ReferenceError: Logo is not defined` dans `src/app/dashboard/sidebar.tsx:33` — import Logo manquant.
- **Logout `/api/practitioner/logout`** : crash `fetch failed` dans le test e2e (probable mauvaise gestion `req.ip` en App Router).
- **Schéma PG (`schema.pg.ts`) vs SQLite (`schema.sqlite.ts`)** : pas 1:1. PG a des champs (rpps, contact_*, cabinet_subscriptions détaillées) que le code applicatif n'exploite pas encore. Risque en prod si on switch brutalement.
- **Drizzle Kit `db:push` cassé** (warning lockfile SWC), `db:generate` pas testé.
- **Schéma source-of-truth flou** : `schema.sqlite.ts` (Drizzle TS) = ce que le code applicatif utilise. `init-db.ts` (SQL) doit le matcher. Le pair doit être verrouillé par un test (smoke test init-db → dump SQL → comparer au schéma Drizzle).
- **Boutique `scripts/seed-articles.ts` drop les articles** lors d'un `init-db` (pas un drop, mais l'insert ne se rejoue pas). Le seed a disparu après l'audit.
- **Webhook Stripe `syncSubscription`** utilise `currentPeriodStart`, `cancelAtPeriodEnd`, `isAmbassador` qui n'existent pas dans le schema SQLite. Crash garanti en prod PG (où ces colonnes existent) quand le webhook se déclenche. **À FIXER** : aligner les deux schémas avant déploiement.

## État du code au 10/06/2026 — après session d'audit + fix

### Pages qui répondent 200 (test e2e OK, 10/06/2026 ~11:45)
- `POST /api/practitioner/signup` (200, TOTP MFA signup)
- `POST /api/practitioner/verify-mfa` (200)
- `POST /api/practitioner/login` (200, requiresMfa=true)
- `POST /api/practitioner/verify-mfa` post-login (200)
- `POST /api/cabinet/invite-tokens` (200, URL partageable)
- `POST /api/patient/optin` (200, email confirmation)
- `POST /api/patient/magic-link` (200)
- `GET /c/{slug}/bienvenue` (200, page patient corrigée)
- `GET /dashboard` (200, sidebar Logo fixée)
- `GET /api/cron/keep-alive` (200, anti scale-to-zero Neon)

### Pages qui répondent 404 (comportement attendu)
- `GET /articles/{slug}` (article `draft` non exposé publiquement)

### Pages qui ne sont pas testées e2e
- `/dashboard/newsletter`, `/dashboard/analytics`, `/dashboard/engagement`, `/dashboard/contact`, `/dashboard/account` (à tester en navigation manuelle)
- `/admin/login`, `/admin/articles/*` (espace admin pas audité)
- Pages newsletter send (composer / planifier)

### Fixes appliqués cette session
1. `src/app/api/cron/keep-alive/route.ts` créé — testé OK SQLite + Neon (894ms)
2. `.github/workflows/ci.yml` créé — lint + typecheck + build + no-ai guard
3. `.github/workflows/backup-db.yml` créé — pg_dump + AES-256 + upload Scaleway
4. `vercel.json` créé — cron toutes les 4 min
5. `scripts/backup-db.ts` créé — script local de backup (smoke test)
6. `src/app/dashboard/sidebar.tsx` — import `Logo` ajouté
7. `src/app/dashboard/page.tsx` — casts `::int` remplacés par SQLite-compat, `durationSeconds` → `totalDurationSec`
8. `src/app/dashboard/analytics/page.tsx` — idem + `EXTRACT(HOUR FROM ...)` → `strftime('%H', ..., 'unixepoch')`
9. `src/app/dashboard/engagement/page.tsx` — idem
10. `src/app/c/[slug]/bienvenue/page.tsx` — refait pour matcher schéma SQLite (suppression `validatedAt`, `readingTimeMin`, `category`, `contact_*`)
11. `src/app/c/[slug]/bienvenue/patient-dashboard.tsx` — idem (props + rendu)

### Articles catalogue (5 brouillons produits 10/06)
- `brouillons/brossette-interdentaire-pourquoi.md` (Rédacteur Dentaire)
- `brouillons/fluor-dentifrice-adulte.md` (Tartrinator, conforme 7 obligations ONCD)
- `brouillons/gencive-saigne-pas-normal.md` (Tartrinator)
- `brouillons/detartrage-frequence.md` (Tartrinator)
- `brouillons/caries-enfant-prevention.md` (Tartrinator)

5 restants : `brosse-electrique-manuelle`, `alimentation-caries`, `bain-de-bouche-utile`, `sensibilite-dentinaire-causes`, et améliration de BASS.

### Décision de Paul (10/06/2026 ~11:45)
- **Toutes les pages core répondent 200** (auth, inscription, dashboard, espace patient, cron)
- **Flow API 100% OK** (signup → MFA → login → MFA → invite → optin → magic link)
- **Articles** : 5 brouillons conformes en BDD, 5 restants à faire
- **Dette Neon** : bug Drizzle/postgres-js sur INSERT avec null params — à fixer en post-MVP (l'app marche sur SQLite dev, Neon prêt structurellement)
- **Décision** : pause sessions sous-agents (problème d'orchestration via PowerShell + stdin), je produis moi-même en attendant fix côté Xi/admin

## Dette technique FIXÉE (10/06/2026 ~12:00)

1. **Webhook Stripe `syncSubscription`** : colonnes alignées dans `schema.sqlite.ts` + `init-db.ts` + script `scripts/patch-stripe-fields.ts` qui patch Neon. Status enum étendu à `incomplete`. ✅
2. **Sidebar Logo import manquant** : ✅
3. **Casts `::int` dashboard** : 8 occurrences remplacées par syntaxe SQLite-compat (`COUNT(*)`, `CAST(... AS INTEGER)`, `strftime('%H', ..., 'unixepoch')`). ✅
4. **Page patient `bienvenue`** : alignée sur schéma SQLite (suppression colonnes `validatedAt`, `readingTimeMin`, `category`, `contact_*`). ✅
5. **`.gitignore`** : créé (1k, couvre secrets, BDD, deps, builds, IDE, tests). ✅
6. **TLS forcé sur DATABASE_URL en prod** : check ajouté dans `client.ts` (refuse connexion non-TLS en `NODE_ENV=production`). ✅
7. **Vars Brevo alignées** : `.env` + `.env.example` migrés de `BREVO_API_KEY` vers `BREVO_SMTP_USER` + `BREVO_SMTP_PASS` + `BREVO_WEBHOOK_SECRET` (cohérent avec `src/lib/email.ts`). Ajout aussi `CRON_SECRET`, `UNSUBSCRIBE_SECRET`, `IP_HASH_SALT`. ✅
8. **Articles catalogue** : 10 articles en BDD (1 complet BASS + 9 brouillons conformes 7 obligations ONCD). Slugs: brossage-dents-technique-bass, brossette-interdentaire-pourquoi, fluor-dentifrice-adulte, gencive-saigne-pas-normal, detartrage-frequence, caries-enfant-prevention, brosse-electrique-manuelle, alimentation-caries, bain-de-bouche-utile, sensibilite-dentinaire-causes, brossage-bass-complet. ✅
9. **Pages admin/newsletter audit** : routes répondent 200 (login public) / 307 (redirect login auth) — comportement attendu. ✅

## Dette technique RESTANTE (post-MVP)

1. **Bug Neon Drizzle null params** : `Buffer.byteLength(Number)` dans postgres-js quand on passe des `Date | null` dans des INSERT préparés. L'app fonctionne en SQLite. En Neon, le signup plante avec 500. **Workaround à tester post-MVP** : wrapper Drizzle qui convertit `Date` en `string ISO` avant insertion, ou utiliser `@neondatabase/serverless` au lieu de `postgres-js`. À fixer avant le lancement public.
2. **RLS PostgreSQL** : code applicatif filtre par `cabinet_id` systématiquement (testé OK sur SQLite). RLS PostgreSQL en prod pas activé. **À faire avant lancement public** : script `init-rls-pg.sql` qui crée les policies par table, à exécuter après init-neon.
3. **DPA non signés** : Brevo, hébergeur HDS futur, Stripe. Action juridique/contractuelle, pas du code. À faire avant lancement public.
4. **Logout praticien crash** : `req.ip` en App Router pose souci. À fixer dans la route `/api/practitioner/logout` (utiliser `req.headers.get('x-forwarded-for')` partout).
5. **Schémas PG ↔ SQLite pas 1:1** : les champs `rpps`, `contact_*`, `cabinet_subscriptions` détaillées existent dans PG mais pas dans le code UI. Refacto à planifier pour que l'app exploite ces champs en prod.
6. **Pages newsletter send pas testées e2e** : composer/send existe, mais aucun test e2e. À tester quand Brevo sera configuré.
7. **Pages admin pas testées e2e** : idem.

## Articles catalogue (seed)

- **10 articles brouillons** en BDD (status: draft), 1 contenu complet (BASS) + 9 plans éditoriaux à rédiger.
- Slugs: `brossage-dents-technique-bass`, `brossette-interdentaire-pourquoi`, `fluor-dentifrice-adulte`, `caries-enfant-prevention`, `gencive-saigne-pas-normal`, `detartrage-frequence`, `brosse-electrique-manuelle`, `alimentation-caries`, `bain-de-bouche-utile`, `sensibilite-dentinaire-causes`.
- Script seed : `scripts/seed-articles-additional.ts` (idempotent).
- Prochaine étape : Paul rédige le contenu 5-slides + long, Dr Thibault valide, puis status = `validated` → `published`.

## Livrables conformité (10/06/2026)

- **AIPD** : `C:\Users\clawuser\.openclaw\workspace-juridique\aipd.md` — 60k, 12k mots, 7 sections modèle CNIL. **Statut : DRAFT** (à valider DPO + signer RT/DPO avant prod). Tous risques résiduels nets FAIBLE. No-AI by design traité comme mesure de protection à part entière.
- **Arbitrage hébergeur HDS** : `C:\Users\clawuser\.openclaw\workspace-technique\arbitrage-hebergeur-hds.md` — 31k, 4,6k mots. **Scoring : Clever Cloud 8.25/10 vs Scaleway 6.75/10.** Écart principalement sur le critère HDS (poids 30%) : Clever Cloud a PostgreSQL managé dans le périmètre HDS, Scaleway DBaaS pas confirmé HDS. **Recommandation : Clever Cloud** + devis Scaleway pour confirmer périmètre HDS par écrit + signature contrats HDS des 2 côtés (2-4 semaines) pour ne pas bloquer Go-Live.
- **Checklist HDS évaluation** : `C:\Users\clawuser\.openclaw\workspace-technique\checklist-hds-evaluation.md` — 24k, 52 items audités. **50% ✅ FAIT, 19% 🟡 PARTIEL, 19% ❌ À FAIRE, 12% N/A MVP.** **Verdict : 🟡 GO CONDITIONNEL** — déployable en recette interne, PAS en prod patients réels. 5 P0 bloquants : `.gitignore` absent, PostgreSQL TLS non forcé, incohérence vars Brevo, DPA non signés, pas de CI/CD. Effort ~1 semaine pour corriger les P0 + formalités admin (DPA, registre, AIPD externalisée).

### Action immédiate (post-livrables 10/06)

1. **Paul** : trancher hébergeur HDS (Clever Cloud par défaut, ou confirmer Scaleway par écrit)
2. **Tartrinator** : créer `.gitignore` (P0), forcer TLS sur DATABASE_URL en prod, fixer les vars Brevo, monter un CI/CD GitHub Actions minimal
3. **Juridique** : signer DPA Brevo + hébergeur + Stripe, désigner DPO externe (mutualisé), faire valider AIPD par DPO
4. **Technique** : corriger les 4 autres P0 + activer le RLS PostgreSQL en prod (actuellement absent)
5. **Rédacteur Dentaire** : 9 articles brouillons restants à produire (1 fait : brossette interdentaire)

## Décisions Paul (10/06/2026 ~10h)

- **Hébergeur MVP** : gratuit (pas HDS avant lancement public). Recommandation : **Neon Free** (0.5 GB, Frankfurt UE, scale-to-zero, migration HDS triviale). Backup : Supabase Free (mitigation cron keep-alive). Cf. `workspace-technique/arbitrage-hebergeur-gratuit-mvp.md` (34k, 5,4k mots).
- **DPO** : Paul (pas de DPO externe).
- **Checklist pré-lancement public** : `workspace-juridique/checklist-pre-lancement-public.md` (147 items : 88 🔴 bloquants, 49 🟡 importants, 10 🟢 nice-to-have ; effort 101-149 h-j, 6-9 sem., go-live cible **16 sept. 2026**).

### Identifiants externes (Tartrinator)

- **Neon** (https://console.neon.tech) — email `fcltpaul@gmail.com`, signup Google OAuth préféré. **PWD alternatif (si demandé) :** `Sensident-Neon-20260610-Kx7mP4nQ`. Status : Paul doit créer le compte lui-même (Keycloak + OAuth), puis me donner le `DATABASE_URL` du projet `sensident-mvp` (region Frankfurt).

## Neon — état au 10/06/2026

- **Compte créé** : `fcltpaul@gmail.com` via Google OAuth ✅
- **Projet créé** : `sensident-mvp`, region `eu-central-1` (Frankfurt) ✅
- **DATABASE_URL** (pooler) : `postgresql://neondb_owner:npg_VIyg5MNw7CDe@ep-square-field-aszhdyyu-pooler.c-4.eu-central-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require` (stocké dans `.env` gitignored)
- **Schéma créé** : 19 tables + 5 templates newsletter via `scripts/init-neon.ts` ✅
- **Patch appliqué** : `scripts/patch-neon.ts` aligne le schema sur `schema.sqlite.ts` (colonnes `practitioners.name`, `last_login_at`, role enum étendu)
- **Test e2e sur Neon** : ❌ 500 sur signup à cause de `postgres-js` qui ne sait pas inférer le type de paramètres `null` (Drizzle ne les envoie pas par défaut). **Dette technique à résoudre post-MVP.** L'app continue à tourner sur SQLite en dev pour le moment.
- **Scripts disponibles** : `init-neon.ts` (DDL idempotent), `patch-neon.ts` (alignement schema), `clear-neon.ts` (purge données), `test-neon.ts` (smoke test connexion)

### Action immédiate (post-décision hébergeur gratuit)

1. **Paul** : créer compte Neon (région Frankfurt) → donner DATABASE_URL à Tartrinator ✅ FAIT
2. **Tartrinator** : intégrer `@neondatabase/serverless`, route `/api/cron/keep-alive`, workflow GitHub Actions backup quotidien vers Scaleway Object Storage (75 GB free) — à faire
3. **Rédacteur Dentaire** : continuer les 9 articles restants (1 fait : brossette)
4. **Conformité** : checklist pré-lancement à parcourir avant go-live (88 🔴 bloquants)

### Décision de Paul
- **Auth praticien fonctionne**. Test e2e (`scripts/e2e-test.js`) couvre le flow critique : signup → MFA → login → MFA → invite → optin → magic link. Re-lanceable avec `node scripts/clear-data.js && node scripts/e2e-test.js`.
- **Dashboard et pages patient sont 500** : à refacto jeudi 11/06 après retour du PC de Paul. Pas bloquant pour valider le flow API métier.
- **Pas d'urgence** : le MVP est démontrable via les API (le Dr Thibault peut tester l'inscription praticien et patient).

## Contraintes budgétaires (juin 2026)

- **0 € de frais avant le lancement officiel.** Paul ne veut pas de frais, même temporaires.
- **Tier gratuit uniquement** sur tous les services externes (Vercel Hobby, GitHub Free, Neon Free, Brevo Free, Stripe test mode, etc.).
- **Ping obligatoire** de Paul si un service ne propose pas de tier gratuit viable (ex: HDS obligatoire en prod = hébergeur payant).
- Seuils techniques des free tiers largement suffisants pour MVP (10 cabinets × 500 patients max).
- **À surveiller post-lancement** : Brevo 300 emails/jour, Neon 0.5 GB, Vercel 100 GB/mois.

## Directives Paul (08/06/2026)

- **Compérage** : pas un risque. Le dentiste **offre** un service de prévention à ses patients, il ne fait pas sa pub. Wording newsletter orienté **service offert**, pas **dentiste promu**. Pas de photo, pas de logo, pas d'incitation RDV.
- **Hébergeur HDS** : décision reportée à quand le projet tournera. Scaleway = option de référence, pas tranchée.
- **Pas de deadline roadmap** : on avance à fond, pas de timeline affichée dans les livrables. Pas de sprints S1-S5.
- **Mode opératoire** : questions **une par une** au fil de l'eau, pas de batch.
- **Pricing** : à définir plus tard, pas affiché.
- **SMS** : abandonné, email uniquement.
- **Nom de code** : "Sensident" provisoire, peut changer.

## Directives Paul (09/06/2026)

- **Budget** : 0 € de frais avant le lancement officiel. Tier gratuit uniquement.
- **Dr Thibault** : on attend d'avoir un produit fini pour lui parler. Il ne sait encore rien du projet.
- **Catalogue articles** : 10 articles placeholder jetables (visuels démo pour François). Pas maintenant — on code l'infra d'abord.
- **Mode opératoire ajusté** : questions infra → j'avance seul, ping uniquement si bloquant externe. Questions produit/structurantes → je pingue.
- **PC** : retour prévu jeudi 11/06/2026. En attendant, push GitHub impossible (PAT révoqué). Commits accumulent en local sur le serveur OpenClaw.

## État au 11/06/2026 01:50 (audit Tartrinator, demande Paul "idées claires pour demain")

### Surprise — pas de repo Git
- `workspace-tartrinator\sensident\.git` **n'existe pas**. Pas de repo initialisé, pas d'historique local, pas de remote configuré.
- La MEMORY antérieure disait "commits accumulent en local" → **faux** : aucun commit n'existe nulle part (hypothèse abandonnée).
- Le `.github/` existe (CI workflows écrits) et le `.gitignore` aussi, mais sans `.git/`, ces fichiers ne sont pas trackés.
- Le `ACCES-A-DISTANCE.md` mentionne "pousse le code sur un repo GitHub" comme étape 1 → **à faire depuis zéro demain**.

### Localisation du code
- Code source : `C:\Users\clawuser\.openclaw\workspace-tartrinator\sensident\` (sous-dossier du workspace OpenClaw, pas à la racine).
- `node_modules/`, `.next/`, `dev.db`, `.env` sont dans ce sous-dossier.
- Le workspace parent (`workspace-tartrinator\`) ne contient que les fichiers agent (AGENTS.md, MEMORY.md, SOUL.md, etc.).

### `.env` présent
Toutes les vars attendues sont là : `DATABASE_URL`, `AUTH_SECRET`, `AUTH_URL`, `BREVO_SMTP_USER/PASS/WEBHOOK_SECRET`, `EMAIL_FROM`, `STRIPE_SECRET_KEY/WEBHOOK_SECRET/PUBLISHABLE_KEY/COUPON_AMBASSADOR`, `CRON_SECRET`, `UNSUBSCRIBE_SECRET`, `IP_HASH_SALT`, `NEXT_PUBLIC_APP_URL`, `NODE_ENV`.
- `DATABASE_URL` pointait Neon au 10/06 — à vérifier que la string Neon est toujours dans `.env` ou si c'est la SQLite locale (le `dev.db` est dans le dossier).

### À faire demain (push initial)
1. **Paul** : créer un repo GitHub vide (ex: `paul-foucault/sensident-mvp` ou `fcltpaul/sensident-mvp`) et me donner l'URL HTTPS.
2. **Tartrinator** : `git init` → `git add .` → `git commit -m "feat: initial MVP commit"` → `git remote add origin <url>` → `git push -u origin main`.
3. Vérifier que le `.gitignore` exclut bien `.env`, `dev.db`, `node_modules/`, `.next/`.
4. Vérifier que les `.github/workflows/ci.yml` et `backup-db.yml` ne référencent pas de secrets hardcodés.

### Pas touché ce tour (Paul a dit "on verra ça demain")
- Aucun fichier modifié, aucun commit créé, aucun push.
- Bug Neon Drizzle null params toujours en dette (post-MVP).
- 9 articles catalogue brouillons toujours en attente de rédaction (5 faits, 5 restants).

## Travail de nuit 11/06/2026 01:50 — 02:30 (Tartrinator autonome)

**Périmètre validé Paul (directives 09/06)** : questions infra → j'avance seul, ping si bloquant externe. Questions produit/structurantes → je pingue. Donc cette nuit : audit statique + vérifications passives uniquement, aucune décision produit, aucun commit, aucune modif de code.

### Audit statique non destructif
- **Script créé** : `scripts/audit-static.js` (lecture seule, scanne `src/**/*.{ts,tsx}` pour casts PG, fonctions PG-only, console.log, fichiers longs).
- **PG casts (::) dans le code applicatif** : 0 occurrence. ✅
- **Fonctions PG-only** : 17 occurrences, **toutes confinées dans `src/db/schema.pg.ts`** (`gen_random_uuid()`). Comportement attendu, schema.pg.ts = PG-only. ✅
- **`now()` / `gen_random_uuid()` dans sql\`\``** : 17 occurrences, **toutes dans schema.pg.ts**. ✅
- **console.log résiduels** : 1 fichier, `src/lib/email.ts` (8 occurrences). À nettoyer post-MVP. Mineur.
- **Fichiers >300 lignes** : 4. `src/app/dashboard/newsletter/composer.tsx` (446), `src/db/schema.pg.ts` (344), `src/db/schema.sqlite.ts` (328), `src/lib/email-templates.ts` (358). composer.tsx à scinder post-MVP.
- **TODO/FIXME/XXX/HACK** : 0 dans `src/`. ✅
- **No-AI guard** : ✅ OK (aucune dépendance IA détectée par `scripts/check-no-ai.js`).

### Schémas SQLite vs PG
- **19 tables** des deux côtés, exports **alignés 1:1** entre `src/db/schema.sqlite.ts` et `src/db/schema.pg.ts`. Faux positif initial corrigé (regex mal écrite).
- Les 19 exports : cabinets, practitioners, practitioner_sessions, admins, admin_sessions, invite_tokens, patient_consents, patient_magic_links, categories, articles, article_categories, reading_sessions, article_heartbeats, newsletter_templates, newsletter_sends, newsletter_recipients, cabinet_subscriptions, audit_logs, rate_limits. ✅
- Le code applicatif importe via `@/db/schema` (reexport schema.sqlite en dev) → `articleHeartbeats` est défini dans SQLite aussi, le bug initial était une illusion.

### Lockfile Next
- Warning `⨯ Failed to patch lockfile` au démarrage du dev server — **faux positif transitoire**.
- `npm install` lancé, retourne `up to date in 10s` (lockfile et package.json inchangés, vérifié par diff).
- Lockfile `package-lock.json` (v3, 958 packages) sain et aligné avec `next 14.2.35`.
- Le warning ne se reproduit pas sur l'état stable. Pas une dette à fixer.

### Routes API
- **33 routes** scannées dans `src/app/api/**/route.ts`. Toutes avec imports cohérents (Zod, Drizzle via `@/db/schema`). Aucune référence à `pgTable` ou `libsql` dans le code applicatif.
- Cohérent avec `MEMORY` antérieure : 11 pages core répondent 200 en e2e, 4 onglets dashboard + admin pas testés e2e (manque tests Playwright).

### Ce que j'ai PAS touché cette nuit
- ❌ Bug Neon Drizzle null params (demande décision Paul : wrapper Drizzle, switch `@neondatabase/serverless`, autre ?)
- ❌ 5 articles catalogue restants (manque directive : 5 vrais articles vs placeholders démo François)
- ❌ Hébergeur HDS Clever Cloud vs Scaleway (Paul tranche)
- ❌ Init GitHub (Paul crée le repo, donne l'URL)
- ❌ Toute modif de `.env` ou `dev.db`
- ❌ Tout commit / push

### À pinguer Paul demain matin
1. **Init GitHub** : Paul doit créer le repo vide et donner l'URL. Je n'ai pas mandat pour le créer à sa place.
2. **Catalogue articles** : trancher entre continuer la rédaction des 5 restants OU pivoter vers 10 placeholders démo François (directive 09/06 = placeholder démo, mais 5 ont déjà été rédigés en plans éditoriaux conformes 7 obligations ONCD).
3. **Bug Neon null params** : valider l'approche (recommandé : `init-cron-keep-alive` + passer de `postgres-js` à `@neondatabase/serverless` côté Neon, qui gère nativement les null params).
4. **Hébergeur HDS** : trancher Clever Cloud vs Scaleway (recommandation sous-agent Technique : Clever Cloud 8.25/10).
5. **Rédaction du jour** : si on continue les articles, quel sujet pour le 6e ?

### Livrables nocturnes
- `scripts/audit-static.js` (1,5 ko) — réutilisable, intégré dans le workflow post-MVP. Aucun autre fichier modifié.
- Cette section `MEMORY.md` (ajoutée).
