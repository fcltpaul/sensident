# CADRAGE MVP — Sensident

> **Document de cadrage unifié** — projet Sensident (nom provisoire, susceptible de changer)
> **Date** : 8 juin 2026
> **Auteur** : Orchestrateur principal (Tartrinator)
> **Statut** : Cadrage figé, 23 décisions arbitrées par Paul Foucault (fondateur)

---

## 1. Vision

**Sensident** est une plateforme web (PWA) d'éducation bucco-dentaire qui permet aux chirurgiens-dentistes d'envoyer à leurs patients des **newsletters de prévention** personnalisées à leur nom, en s'appuyant sur un catalogue d'articles validés par un comité scientifique.

**Valeur pour le dentiste** : patients mieux éduqués = gain de temps au fauteuil, lien praticien-patient renforcé, conformité déontologique (information prévention), simplicité opérationnelle.

**Valeur pour le patient** : recevoir de la prévention bucco-dentaire fiable, validée par des dentistes, de la part de SON dentiste (pas d'une marque commerciale).

**Positionnement** : Sobriété technique, souveraineté des données, **no-AI by design**. Ce n'est pas un gadget — c'est un outil de relation confraternelle.

**Différenciation** :
- Pas d'IA au runtime (pas d'API LLM, pas d'embeddings, pas de ML) → coût marginal nul, conformité RGPD/AI Act/HDS renforcée, déterminisme.
- Données patient 100% en France, hébergées HDS.
- Le dentiste ne saisit quasi rien (inscription patient via token, catalogue mutualisé).
- Catalogue éditorial validé par un comité scientifique (Dr François Thibault + 2-3 confrères ambassadeurs).

---

## 2. Modèle économique

**B2B SaaS** (vente aux cabinets dentaires, gratuit pour le patient).

**3 plans** (définis dans Stripe, pricing final à arbitrer post-MVP) :

| Plan | Cible | Inclus | Prix (à arbitrer) |
|---|---|---|---|
| **Free** | Solo, < 100 patients actifs | 1 newsletter/mois, 1 look prédéfini, KPIs basiques | 0 € |
| **Pro** | Solo ou petit cabinet, 200-1000 patients | Newsletters illimitées, looks P2 complets, analytics M2 + engagement | TBD post-MVP |
| **Cabinet** | 4+ praticiens, 1000+ patients | Multi-sites, API, support prioritaire, account manager | TBD post-MVP |

**Ambassadeurs** : coupon `AMBASSADOR_2026` (100% off 6 mois), pas de carte bancaire requise à l'inscription.

**Sponsoring mutuelles** (post-MVP) : activable via le réseau Dr Thibault. Permet de proposer Tartrinator gratuit aux cabinets dont la mutuelle sponsorise.

**Coût infra MVP** (en attendant HDS) :
- Brevo SMTP : gratuit jusqu'à 300 emails/jour
- Brevo Campaigns : 0-25 €/mois selon volume
- Dev local : 0 € (Docker Compose)
- Hébergement HDS (post-MVP) : 30-100 €/mois selon provider et traffic

---

## 3. Stack technique

### Front-office & back-office (unifié)

- **Next.js 14 (App Router)** + TypeScript
- Server Components pour SEO et perf
- API Routes (dans le même process) — pas de NestJS séparé
- Middleware d'isolation tenant
- Server Actions pour les mutations
- Tailwind CSS + shadcn/ui pour les composants

### Mobile

- **PWA d'abord** (manifest + service worker)
- Application native React Native : phase 2

### Base de données

- **PostgreSQL managé HDS** (hébergeur à choisir quand projet fonctionnel)
- **Drizzle ORM** (TypeScript-first, type-safe, SQL proche du natif)
- **Row-Level Security (RLS)** activée
- **`cabinet_id` denormalized** sur toutes les tables métier (clé d'isolation)

### Cache / Queue

- **Aucun Redis au MVP**
- Jobs cron via `pg_cron` (extension PostgreSQL) ou Vercel Cron / GitHub Actions
- Newsletter = job asynchrone simple (pas de BullMQ)

### Email

- **Brevo SMTP** (transactional) : magic links, confirmations opt-in
- **Brevo Marketing Campaigns** : envois newsletter
- Domaine d'envoi dédié : `newsletter.sensident.fr` (avec SPF/DKIM/DMARC)

### Authentification

- **Praticien** : Auth.js (NextAuth) + bcrypt/argon2 + TOTP MFA (otplib) **obligatoire** dès l'inscription
- **Patient** : lien magique email (pas de password)

### Billing

- **Stripe Subscriptions** + **Customer Portal**
- 3 plans (free / pro / cabinet)
- Webhooks signés → update BDD locale
- Coupons ambassadeurs (Stripe-native)

### Tracking

- **Pixel JavaScript + heartbeat** (T1) sur la page article
- 15s ping vers `/api/track/heartbeat`
- Détection scroll depth, onglet visible, `beforeunload`
- Pas de SDK analytics tiers (No-AI)
- Perte ~10-20% via adblockers (acceptable)

### Recherche articles

- **PostgreSQL full-text search** natif (tsvector + GIN index)
- Pas d'embeddings, pas de vector store

---

## 4. Modèle de données (synthèse)

### Tables principales

| Table | Rôle | Champs clés |
|---|---|---|
| `cabinets` | Tenant racine | id, slug, name, created_at, contact_prefs (jsonb) |
| `practitioners` | Compte dentiste (1 = 1 cabinet) | id, cabinet_id, email, password_hash, totp_secret, role |
| `practitioner_sessions` | Sessions Auth.js | id, practitioner_id, expires_at, mfa_verified |
| `invite_tokens` | Liens d'invitation patient | id, cabinet_id, token_hash, expires_at, used_count |
| `patient_consents` | Preuve opt-in patient | id, cabinet_id, email_hash, ip, ua, cgu_version, opt_in_version, consent_at |
| `reading_sessions` | Sessions de lecture article | id, cabinet_id, patient_email_hash, article_slug, started_at, ended_at, duration_s, scroll_depth |
| `article_heartbeats` | Pings JS toutes les 15s | id, reading_session_id, ts, scroll_pct, visible |
| `articles` | Catalogue mutualisé Sensident | slug, title, body_md, slides_json, category, validated_by, validated_at, next_review_at |
| `newsletter_templates` | Templates React Email (3-5) | id, name, preview_url, structure_json |
| `newsletter_sends` | Instance d'envoi par cabinet | id, cabinet_id, template_id, sent_at, status |
| `newsletter_recipients` | Destinataires | id, send_id, email_hash, status (queued/sent/opened/clicked/unsubscribed) |
| `cabinet_subscriptions` | Sync Stripe | id, cabinet_id, stripe_customer_id, stripe_subscription_id, plan, status, current_period_end |
| `audit_logs` | Logs immuables accès data patient | id, ts, actor_type, actor_id, cabinet_id, action, target, ip, ua |

### Isolation multi-tenant

- **PostgreSQL RLS** activée sur toutes les tables métier
- Politique : `USING (cabinet_id = current_setting('app.cabinet_id')::uuid)`
- Chaque requête API est identifiée par le cabinet de l'utilisateur authentifié
- `cabinet_id` denormalized sur **toutes** les tables métier (FK comprise)

### Visibilité dentiste (A1)

- Le dentiste ne voit **aucun email patient, aucun nom patient**
- Le dashboard expose des **agrégats anonymisés** : counts, durées, top articles
- Le `email_hash` est utilisé en interne pour les counts distincts

---

## 5. Parcours utilisateurs

### Praticien

1. **Inscription** : `https://app.sensident.fr/signup`
   - Email + password (bcrypt)
   - Nom du cabinet + slug
   - Génération TOTP secret + QR code → MFA **obligatoire** dès le 1er login
   - Email de vérification

2. **Onboarding guidé** : 3 écrans successifs
   - Personnalisation newsletter (choix look P2 + upload photo/signature/logo)
   - Bloc contact (B2 flexible, tous champs optionnels sauf nom)
   - Génération premier token d'invitation patient (QR code téléchargeable + URL)

3. **Dashboard** (6 onglets D2) :
   - **Vue d'ensemble** : 4 KPIs du mois
   - **Newsletter** : composer, planifier, historique
   - **Analytics** : entonnoir, durées, heatmap horaire
   - **Engagement** : rétention M0/M+1/M+2, segmentation déterministe
   - **Contact** : modifier bloc contact
   - **Mon compte** : MFA, password, look P2, infos cabinet, abonnement Stripe

4. **Composer une newsletter** :
   - Choisir 1 article du catalogue
   - Prévisualisation avec look P2 sélectionné
   - Sélectionner la liste destinataires (= tous les patients opt-in actifs)
   - Programmer (immédiat ou J+X) → job cron Brevo

5. **Voir l'engagement** :
   - KPIs, courbes 12 mois, top articles, segmentation
   - Données exportables CSV

### Patient

1. **Invitation** :
   - Reçoit du dentiste (au fauteuil QR code, ou URL dans email manuel) : `https://sensident.fr/c/{slug}/rejoindre?token=***`
   - Atterrit sur landing R1 (au nom du cabinet, pas de branding Sensident)
   - Clique "Je m'inscrits"

2. **Inscription** (R1) :
   - Champ email
   - Case opt-in granulaire : "J'accepte de recevoir les newsletters de prévention du Dr X"
   - Case CGU séparée
   - Soumission → email de confirmation (double opt-in)

3. **Confirmation** :
   - Clique sur le lien dans l'email (valide 24h)
   - Active son compte
   - Redirigé vers `/c/{slug}` (espace patient)

4. **Espace patient** :
   - Page d'accueil : nom du cabinet, photo façade (si remplie), bloc contact (B2 flexible, selon ce que le dentiste a rempli)
   - Liste d'articles disponibles
   - 1 newsletter récente mise en avant
   - Lien "Me désinscrire" en footer

5. **Lecture d'article** (5-slides + format long) :
   - Page article : rendu F4 (5 slides ou long selon URL)
   - Tracking JS heartbeat (T1) : 15s ping, scroll depth, onglet visible
   - En fin d'article : bouton "Lire l'article complet" (vers la version long)

6. **Réception newsletter** :
   - Email Brevo avec le look P2 du cabinet
   - Wording : "Service de prévention offert par le Dr X" / "Le Dr X vous accompagne dans votre prévention"
   - Personnalisation avancée (logo, photo, signature, couleurs) si V3 activé
   - Lien désabonnement fonctionnel (LCEN + RGPD)

---

## 6. Sécurité & conformité

### No-AI by design

- **Aucune API LLM** (OpenAI, Anthropic, Mistral, Cohere, etc.)
- **Aucun embedding, aucun vector store** (pas de pgvector, Pinecone, Weaviate)
- **Aucun scoring ML** au runtime
- **Linting CI/CD** bloquant les imports interdits (`openai`, `anthropic`, `@mistralai/*`, `langchain`, `llamaindex`)
- **Audit réseau runtime** : proxy sortant qui logge toute requête HTTP et bloque les destinations hors whitelist
- **Documentation ARCHITECTURE.md** explicite

**Conséquence** : Sensident n'est ni "fournisseur" ni "déployeur" de système IA au sens de l'AI Act UE (règlement 2024/1689). Aucune obligation des art. 9-50.

### RGPD

- **Opt-in patient explicite, double opt-in, granulaire par finalité** (R1)
- **Bandeau cookies minimal** (analytics internes, exemptés CNIL LIP)
- **Registre des traitements** maintenu par Tartrinator (responsable de traitement = Tartrinator pour les données techniques, sous-traitant pour le compte du cabinet responsable de la relation patient)
- **Droit à l'effacement** : endpoint `/api/patient/forget` + bouton désabonnement dans chaque email
- **Droit d'accès** : sur demande email à DPO
- **DPO** : Paul Foucault (ou avocat externe en prod)
- **Conservation** : 3 ans après désinscription (recommandation CNIL B2C)
- **Transferts hors UE** : zéro (No-AI + hébergement HDS France)

### HDS (Hébergement de Données de Santé)

- **Prérequis au lancement** : hébergeur certifié HDS (Scaleway, OVHcloud, Outscale, Clever Cloud — à choisir)
- **Infogérance** : Type 1 ou 2 selon le scope retenu
- **Donnée de santé par déduction** : l'association cabinet ↔ patient + le suivi d'activité sur articles = donnée de santé
- **Chiffrement** : at-rest (PostgreSQL TDE ou LUKS) + in-transit (TLS 1.3)
- **Sauvegardes chiffrées** + PRA
- **Audit logs immuables** sur tous les accès aux données patient

### Authentification & autorisation

- Praticien : email + password + TOTP MFA (otplib) **obligatoire**
- Patient : lien magique email (24h)
- Sessions : cookies httpOnly + Secure + SameSite=Lax
- JWT pour les API server-to-server
- CSRF protection native Next.js
- Rate limiting sur les endpoints sensibles (login, magic link, opt-in)
- Audit logs : tout accès aux données patient loggé avec horodatage + IP + user agent

### Anti-compérage (CSP R.4127-215 et suivants)

- Wording newsletter orienté **service offert** : "Le Dr X vous accompagne dans votre prévention" / "Service de prévention offert par le Dr X"
- **Pas de photo du dentiste** dans la newsletter (uniquement photo de la façade du cabinet, et encore optionnelle)
- **Pas de logo du cabinet** en avant (présent discrètement dans le footer si V3 activé)
- **Pas d'incitation à prendre RDV** dans la newsletter
- **Bloc contact B2 flexible** : informations pratiques uniquement, pas de promotion
- **Validation juridique externe** du wording final (à faire avant mise en prod)

---

## 7. Périmètre MVP (à livrer)

### Inclus MVP (à coder)

- Inscription praticien (email + password + TOTP MFA)
- Onboarding guidé (look P2, contact B2, premier token d'invitation)
- Dashboard praticien (6 onglets D2) avec analytics M2
- Inscription patient (landing R1, double opt-in)
- Lien magique patient (I1)
- Catalogue articles (CRUD admin, validation comité)
- Articles au format 5-slides + format long (F4)
- Tracking lecture (T1 JS heartbeat)
- Moteur newsletter (Brevo + React Email + templates P2)
- Bloc contact B2 flexible
- Billing Stripe (3 plans + webhooks + coupon ambassadeur)
- Audit logs immuables
- Sécurité (env, chiffrement, rate limiting, CSRF)
- **~10 articles seed** rédigés par Paul (format 5-slides + long)

### Reporté phase 2

- Application mobile native
- White-label custom domain par cabinet
- Multi-praticiens dans un cabinet (sub-comptes)
- Campagnes ciblées / automation
- Vidéos courtes réseaux sociaux
- Sponsoring mutuelles
- Pricing final + monétisation grand public
- Intégration logiciels métier (Julie, Logos, Vega)
- Recherche full-text avancée + filtres
- Lecteur RSS / Podcast

### Hors scope (jamais)

- IA au runtime (LLM, embeddings, ML scoring)
- Publicité grand public (CSP R.4127-215)
- Compérage (CSP R.4127-226)
- SMS
- Diagnostic médical, conseils thérapeutiques
- Promotions, offres commerciales

---

## 8. KPIs & métriques de succès

### KPIs produit

- Taux d'inscription patient (inscrits / invités)
- Taux d'ouverture newsletter (Brevo tracking)
- Taux de lecture effective (au moins 1 heartbeat au-delà de 15s)
- Durée médiane de lecture par article
- Taux de rétention M0/M+1/M+2
- Taux de désabonnement
- Score NPS praticien (enquête trimestrielle)

### KPIs business

- Nombre de cabinets actifs
- Taux de conversion Free → Pro
- CAC (coût d'acquisition par cabinet)
- LTV (lifetime value)
- MRR (monthly recurring revenue)
- Churn mensuel
- Net Revenue Retention

### KPIs techniques

- Uptime (cible 99,9%)
- Latence P95 par endpoint (cible < 200ms)
- Coût infra par patient actif (cible < 0,10 €/mois)
- Taux d'erreur API (cible < 0,1%)
- Taux de bounce email (cible < 2%)

---

## 9. Risques identifiés & mitigation

| Risque | Probabilité | Impact | Mitigation |
|---|---|---|---|
| **HDS non validé** au moment du go-live | Moyenne | Critique | Choisir hébergeur HDS tôt, signer contrat infogérance Type 1/2 avant d'avoir > 0 patient |
| **Compérage requalifié** par l'ONCD malgré wording prudent | Faible | Critique | Validation juridique externe du wording avant production, mentions "service offert" systématiques |
| **Concurrence Doctolib** qui étend son scope patient | Moyenne | Élevé | Pas jouer sur le même terrain (RDV), rester sur la prévention pure |
| **Dr Thibault refuse** l'intégration tardive | Faible | Élevé | Produit doit être démontrable sans lui, pas de dépendance critique à sa signature |
| **Churn praticien** (dentiste arrête d'envoyer newsletters) | Moyenne | Élevé | UX ultra-simple, rappels intelligents, démo valeur mensuelle dans le dashboard |
| **Vol de données patient** (breach) | Faible | Critique | HDS + audit logs + chiffrement + tests intrusion pré-prod + monitoring continu |
| **Adoption trop lente** (< 50 cabinets à 12 mois) | Moyenne | Élevé | Pilote avec 3-5 ambassadeurs, ROI démontré, contenu gratuit, freemium agressif |
| **Brevo indisponible** ou change pricing | Faible | Moyen | Email = seule dépendance externe critique. Backup : SMTP générique (OVH, Gandi) |
| **Refus éditeur logiciel métier** (Julie, Logos) d'interfacer | Moyenne | Moyen | Pas critique pour MVP (import manuel suffit), à négocier en phase 2 |

---

## 10. Décisions tranchées (récapitulatif)

| # | Sujet | Décision |
|---|---|---|
| 1 | Modèle données patient | A (rattaché cabinet, inscription via token) |
| 2 | Visibilité patient dentiste | A1 (agrégats anonymisés) |
| 3 | Catalogue articles | C1 (mutualisé Sensident, comité scientifique) |
| 4 | Personnalisation newsletter | V3 (avancée : logo, photo, signature, couleurs) |
| 5 | Fréquence + sélection | Mensuelle ou bimestrielle, dentiste choisit |
| 6 | Compte praticien | 1 compte = 1 cabinet |
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
| 23 | Environnement dev | E1 (dev local d'abord, cloud HDS plus tard) |

---

## 11. Open questions (à arbitrer avant ou pendant le dev)

- [ ] **Validé juridiquement** : le wording final de l'encart newsletter et des CGU/CGV par un avocat santé spécialisé (post-MVP, avant production).
- [ ] **Hébergeur HDS** : à choisir parmi Scaleway, OVHcloud, Outscale, Clever Cloud quand le projet sera démontrable.
- [ ] **3-5 templates look P2** : à designer (Moderne, Classique, Chaleureux, Épuré, Premium — quels sont les 5 ?).
- [ ] **Tarif exact** des plans Pro et Cabinet (à fixer post-MVP).
- [ ] **Domaine** : achat de `sensident.fr`, `.com`, `.io`, `.eu` + variantes orthographiques.
- [ ] **10 articles seed** : quels thèmes prioritaires ? (proposition : brossage, fil dentaire, alimentation, tabac, première visite enfant, santé gencives, dent de sagesse, carie, fluor, suivi orthodontique).
- [ ] **DPO externe** ou DPO interne Paul (formalisation RGPD).
- [ ] **Identité visuelle** : logo Sensident, charte couleurs, typographie (à designer en parallèle du code).
- [ ] **Comité scientifique initial** : qui sont les 2-3 confrères ambassadeurs en plus de Dr Thibault ?

---

## 12. Prochaines étapes (mode opératoire)

1. **Setup environnement dev local** (Docker Compose : PostgreSQL + MailHog)
2. **Initialiser monorepo Next.js 14** + TypeScript + Drizzle + Auth.js
3. **Schéma BDD complet** + RLS PostgreSQL
4. **Inscription praticien** (email + password + TOTP MFA)
5. **Page d'inscription patient** (R1, double opt-in)
6. **Lien magique patient** (I1)
7. **Catalogue articles** + rendu 5-slides + format long
8. **Tracking lecture** (T1 JS heartbeat)
9. **Moteur newsletter** (Brevo + React Email + 3-5 templates P2)
10. **Dashboard D2** (6 onglets) avec analytics M2
11. **Intégration Stripe** (3 plans + webhooks + coupon ambassadeur)
12. **Bloc contact B2 flexible**
13. **10 articles seed** (rédigés par Paul)
14. **Validation juridique externe** (wording, CGU/CGV, contrat cabinet)
15. **Choix hébergeur HDS** + signature contrat
16. **Sécurité finale** (env, chiffrement, sauvegardes, audit, pentest)
17. **Recrutement 3-5 dentistes ambassadeurs** pour pilote
18. **Démo au Dr Thibault** (produit clé en main)
19. **Pacte d'associés** (T2 probable)
20. **Lancement pilote** (10-50 cabinets)
21. **Définir pricing** + activer monétisation
22. **Scaling** (G2B, mutuelles, etc.)

---

*Document à jour au 8 juin 2026. Mis à jour à chaque nouvelle décision arbitrée.*
*Maintenu par l'agent orchestrateur principal (Tartrinator).*
