# Sensident — MVP

> **Plateforme B2B de prévention bucco-dentaire. No-AI by design. Multi-tenant strict.**
> **Statut** : MVP fonctionnel. Prêt pour la démo au Dr Thibault (12/06/2026).

---

## Stack

- **Next.js 14** (App Router) + TypeScript
- **SQLite via libsql** (dev) / **PostgreSQL HDS** (prod)
- **Drizzle ORM**
- **Auth.js patterns custom** + bcrypt + TOTP MFA (otplib)
- **Brevo SMTP** (transactional en prod, JSON en dev)
- **Stripe Subscriptions** (3 plans + coupon ambassadeur)
- **Tailwind CSS**
- **PWA** (manifest + service worker)

---

## Démo François Thibault (locale)

Cabinet démo pré-configuré dans `dev.db` pour la démo :

| Champ | Valeur |
|---|---|
| Slug cabinet | `demo-francois-thibault` |
| Nom | Cabinet du Dr François Thibault |
| Praticien email | `demo@sensident.fr` |
| Praticien password | (hash factice — login réel désactivé) |
| MFA | désactivé pour démo |
| Patients opt-in | 20 (hash email) |
| Newsletters envoyées | 5 (articles différents, sur 60j) |
| Engagement | 34 sessions, 141 heartbeats, ~60% open / 30% complete |

### URLs à montrer en démo

**Côté cabinet (praticien loggué)** — compte admin Paul pour se connecter :

| URL | Statut | Description |
|---|---|---|
| `http://localhost:3001/` | 200 | Landing publique |
| `http://localhost:3001/articles/brossage-efficace` | 200 | Article (5-slides + long) |
| `http://localhost:3001/c/demo-francois-thibault/rejoindre` | 200 | Inscription patient |
| `http://localhost:3001/c/demo-francois-thibault/bienvenue` | 200 | Espace patient post-optin |
| `http://localhost:3001/login` | 200 | Connexion praticien |
| `http://localhost:3001/admin-auth/login` | 200 | Connexion admin (Paul) |
| `http://localhost:3001/dashboard` | 307→login | Vue d'ensemble (4 KPIs) |
| `http://localhost:3001/dashboard/newsletter` | 307→login | Composer / planifier |
| `http://localhost:3001/dashboard/analytics` | 307→login | Entonnoir (partiel) |
| `http://localhost:3001/dashboard/engagement` | 307→login | Rétention (partiel) |
| `http://localhost:3001/dashboard/library` | 307→login | Bibliothèque cabinet |
| `http://localhost:3001/dashboard/invitation` | 307→login | QR code + lien email |
| `http://localhost:3001/dashboard/contact` | 307→login | Fiche cabinet |
| `http://localhost:3001/dashboard/account` | 307→login | MFA + Stripe + cabinet |
| `http://localhost:3001/admin` | 307→login | Admin: articles, audit, cabinets |
| `http://localhost:3001/politique-confidentialite` | 200 | RGPD (livré agent juridique) |
| `http://localhost:3001/mentions-legales` | 200 | LCEN (livré agent juridique) |
| `http://localhost:3001/cgu` | 200 | CGU patient (livré agent juridique) |
| `http://localhost:3001/desabonnement` | 200 | Lien désabonnement email |

**Compte admin (Paul)** — pour se logger en démo et voir le dashboard praticien en 200 :
- URL : http://localhost:3001/admin-auth/login
- Email : `paul@sensident.fr`
- Password : `HjmM22pnw_LvlybMJBAhaocl`
- TOTP : `JVOTEWB4GZMXGNKL` (Google Authenticator)

### Reset démo

```powershell
# Réinitialiser la BDD avec catalogue articles + cabinet démo + 20 patients + 5 NL
Remove-Item dev.db -ErrorAction SilentlyContinue
node scripts\init-db.ts
node scripts\seed-articles-sqlite.mjs
node scripts\seed-demo-data.mjs
```

---

## Screenshots

Procédure de capture pour la doc / slides investisseurs :

### Option A — Playwright (recommandé)

```powershell
# Install browser une seule fois
& node_modules\.bin\playwright install chromium

# Lancer dev server
node node_modules/next/dist/bin/next dev --port 3001

# Dans un autre terminal, capturer les pages publiques
powershell -ExecutionPolicy Bypass -File scripts\screenshot-pages.ps1
```

Les PNG sont sauvés dans `docs/screenshots/` (landing, article, inscription patient).

### Option B — Manuel

1. Démarrer le serveur
2. Se logger avec compte Paul (TOTP désactivable momentanément)
3. Naviguer chaque URL du tableau ci-dessus
4. Windows+Shift+S pour capturer

### Option C — Headless Chrome (si Playwright pas dispo)

```powershell
& 'C:\Program Files\Google\Chrome\Application\chrome.exe' `
  --headless --disable-gpu --no-sandbox `
  --screenshot=C:\Users\clawuser\.openclaw\workspace-tartrinator\sensident\docs\screenshots\landing.png `
  --window-size=1280,800 `
  http://localhost:3001/
```

---

## Démarrage

Voir `GUIDE-DEMARRAGE.md` pour le guide complet.

```powershell
# Démarrer le serveur
node node_modules/next/dist/bin/next dev --port 3001

# Créer un admin (Paul)
.\node_modules\.bin\tsx scripts/create-admin.ts --email paul@sensident.fr --name "Paul Foucault" --role superadmin
```

## Documentation

- `GUIDE-DEMARRAGE.md` : guide pratique
- `PROMPTS-IMAGES.md` : 10 prompts pour générer les visuels
- `../CADRAGE-MVP.md` : cadrage produit complet (23 décisions)
- `../MEMORY.md` : mémoire long terme
- `SECURITY-CHECKLIST.md` : checklist HDS & sécurité (pré-prod)

## Scripts

- `npm run db:init` : initialiser la BDD SQLite
- `npm run db:seed` : seed articles catalogue
- `npm run admin:create` : créer un admin
- `node scripts\seed-demo-data.mjs` : seed démo (cabinet + 20 patients + 5 NL)
- `node scripts\check-no-ai.js` : vérifier 0 dep IA
- `node scripts\e2e-test.js` : tests E2E (33 tests en local)

## Modules

- `/` : landing
- `/signup` : inscription praticien (TOTP MFA)
- `/login` : connexion praticien
- `/admin-auth/login` : connexion admin
- `/admin` : dashboard admin (articles, cabinets, audit, settings)
- `/dashboard` : dashboard praticien (7 onglets)
- `/articles/{slug}` : lecture article (5-slides + long)
- `/c/{slug}/rejoindre` : landing inscription patient
- `/c/{slug}/bienvenue` : espace patient
- `/desabonnement` : désabonnement via lien

## No-AI

**Règle absolue** : pas d'API LLM, pas d'embeddings, pas de ML au runtime.
- `scripts/check-no-ai.js` bloque toute dep IA dans le code
- Aucune donnée envoyée à OpenAI/Anthropic/Mistral/etc.
- Recherche full-text via PostgreSQL `tsvector` (pas d'embeddings)
- Recommandation : co-occurrence simple (pas ML)
- Conformité AI Act UE : Sensident n'est ni fournisseur ni déployeur de système IA

## Licence

Propriétaire. © 2026 Sensident.
