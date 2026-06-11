# Sensident — MVP

> **Plateforme B2B de prevention bucco-dentaire. No-AI by design. Multi-tenant strict.**
> **Statut** : MVP fonctionnel. Pret pour la demo au Dr Thibault.

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

## Demarrage

Voir `GUIDE-DEMARRAGE.md` pour le guide complet.

```powershell
# Demarrer le serveur
node node_modules/next/dist/bin/next dev --port 3001

# Creer un admin (Paul)
.\node_modules\.bin\tsx scripts/create-admin.ts --email paul@sensident.fr --name "Paul Foucault" --role superadmin
```

**Compte admin** :
- URL : http://localhost:3001/admin-auth/login
- Email : paul@sensident.fr
- Password : HjmM22pnw_LvlybMJBAhaocl
- TOTP : JVOTEWB4GZMXGNKL (Google Authenticator)

## Documentation

- `GUIDE-DEMARRAGE.md` : guide pratique
- `PROMPTS-IMAGES.md` : 10 prompts pour generer les visuels
- `../CADRAGE-MVP.md` : cadrage produit complet (23 decisions)
- `../MEMORY.md` : memoire long terme
- `SECURITY-CHECKLIST.md` : checklist HDS & securite (pre-prod)

## Scripts

- `npm run db:init` : initialiser la BDD SQLite
- `npm run db:seed` : seed 1 article exemple
- `npm run admin:create` : creer un admin
- `node scripts/smoke-test.js` : smoke tests HTTP
- `node scripts/check-no-ai.js` : verifier 0 dep IA

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
- `/desabonnement` : desabonnement via lien

## No-AI

**Regle absolue** : pas d'API LLM, pas d'embeddings, pas de ML au runtime.
- `scripts/check-no-ai.js` bloque toute dep IA dans le code
- Aucune donnee envoyee a OpenAI/Anthropic/Mistral/etc.
- Recherche full-text via PostgreSQL `tsvector` (pas d'embeddings)
- Recommandation : co-occurrence simple (pas ML)
- Conformite AI Act UE : Sensident n'est ni fournisseur ni deployeur de systeme IA

## Licence

Proprietaire. © 2026 Sensident.
