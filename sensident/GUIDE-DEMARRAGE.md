# Guide de demarrage Sensident

> **Pour Paul** — Demarrage rapide du MVP en dev local (Windows).

---

## 0. Prerequis

- **Node.js 20+** (deja installe : v24.15.0)
- **Git** (deja installe)
- **Pas besoin de Docker, PostgreSQL, pnpm** — SQLite via libsql est integre

---

## 1. Premier lancement

```powershell
cd C:\Users\clawuser\.openclaw\workspace-tartrinator\sensident

# 1. Demarrer le serveur dev
$env:NODE_ENV="development"
$env:DATABASE_URL="file:./dev.db"
$env:AUTH_SECRET="dev-secret-change-in-prod"
$env:NEXT_PUBLIC_APP_URL="http://localhost:3000"
node node_modules/next/dist/bin/next dev --port 3001
```

Puis ouvrir : **http://localhost:3001**

---

## 2. Comptes de test (deja crees)

### Admin Sensident (Paul)
- URL : http://localhost:3001/admin-auth/login
- Email : `paul@sensident.fr`
- Password : `HjmM22pnw_LvlybMJBAhaocl`
- TOTP Secret : `JVOTEWB4GZMXGNKL`
- A scanner dans Google Authenticator / Authy / 1Password

### Article seed
- Deja dans la BDD : "Brossage des dents : la methode BASS, en 5 slides"
- Status actuel : `draft` (Dr Thibault doit le valider)

---

## 3. Parcours de test

### A. Espace admin (Paul)
1. Aller sur http://localhost:3001/admin-auth/login
2. Se connecter avec email + password
3. Saisir le code MFA (Google Authenticator avec le secret ci-dessus)
4. Voir le dashboard : articles, cabinets, audit logs

### B. Creer un compte praticien (demo)
1. http://localhost:3001/signup
2. Email + password + nom du cabinet
3. Scanner le QR code MFA affiche
4. Acceder au dashboard praticien (6 onglets)

### C. Inscrire un patient (demo)
1. En tant que praticien, aller dans "Invitations"
2. Generer un lien (avec QR code)
3. Copier l'URL
4. Ouvrir dans une autre fenetre : http://localhost:3001/c/{slug}/rejoindre?token=***
5. Remplir email + cases opt-in
6. L'email de confirmation s'affiche dans la console (mode dev)
7. Cliquer le lien de confirmation → acces espace patient

### D. Creer et envoyer une newsletter
1. En tant qu'admin, creer un article via /admin/articles/new
2. Le marquer "Valider et publier"
3. Se connecter en tant que praticien
4. Aller dans "Newsletter" → wizard 4 etapes
5. Choisir article, look (5 templates), apercu, envoyer
6. L'envoi est logge en console (dev)

---

## 4. Commandes utiles

```powershell
# Initialiser / reinitialiser la BDD
.\node_modules\.bin\tsx scripts/init-db.ts

# Seed l'article exemple
.\node_modules\.bin\tsx scripts/seed-articles.ts

# Creer un admin
.\node_modules\.bin\tsx scripts/create-admin.ts --email X --name "X" --role superadmin

# Verifier qu'aucune dep IA n'a ete ajoutee
.\node_modules\.bin\tsx scripts/check-no-ai.ts
# Note: le script est en JS, on peut le lancer avec node :
node scripts/check-no-ai.js
```

---

## 5. Ce qui marche / ce qui manque

### ✅ Marche
- Auth praticien + admin (TOTP MFA obligatoire)
- Inscription patient via token (R1, double opt-in)
- Magic link pour revenir (I1)
- Catalogue articles (CRUD admin complet)
- 5 templates newsletter (moderne, chaleureux, classique, epure, premium)
- Compositeur newsletter 4 etapes (article → look → apercu → envoi)
- Tracking lecture (T1 JS heartbeat + scroll)
- Analytics M2 : entonnoir ouverture→lecture, top articles, heatmap horaire
- Engagement : retention M0/M+1/M+2, segmentation reguliers/occasionnels
- Bloc contact B2 flexible
- Dashboard 7 onglets (avec Invitations)
- Liens d'invitation (QR code + URL partageable)
- Stripe L2 infra (3 plans + coupon ambassadeur, en test mode)
- No-AI guard script
- Audit logs exhaustifs

### 🚧 A finaliser
- **9 articles seed** : Paul doit les rediger
- **Validation juridique externe** du wording CGU/CGV/encart newsletter
- **Hébergeur HDS** : décision à prendre quand le projet tournera
- **Page désabonnement complète** : fonctionne mais pourrait être plus polie
- **Tests E2E** (Playwright) : à ajouter
- **PWA manifest + service worker** : pour le mobile, phase 2

---

## 6. Production

Pour deployer en prod, il faut :
1. **Acheter nom de domaine** `sensident.fr` + configurer DNS
2. **Signer avec un hébergeur HDS** (Scaleway, OVHcloud, Outscale, Clever Cloud)
3. **Configurer PostgreSQL HDS** (au lieu de SQLite)
4. **Variables d'env** :
   - `DATABASE_URL=postgres://...`
   - `AUTH_SECRET=<openssl rand -base64 32>`
   - `BREVO_SMTP_USER` + `BREVO_SMTP_PASS`
   - `STRIPE_SECRET_KEY` + `STRIPE_WEBHOOK_SECRET` + `STRIPE_PUBLISHABLE_KEY`
   - `NODE_ENV=production`
5. **Appliquer** `src/db/schema.sql` sur la BDD PostgreSQL
6. **Setup Stripe** : creer les 3 price_id et le coupon `AMBASSADOR_2026`

---

## 7. Roadmap (apres demo au Dr Thibault)

1. **9 articles seed** (Paul)
2. **Demo produit** au Dr Thibault
3. **Pacte d'associes** (T2 probable)
4. **Comité scientifique** : 2-3 confrères ambassadeurs
5. **Recrutement** 3-5 dentistes ambassadeurs
6. **Pricing final** + activation Stripe
7. **Hébergement HDS** + mise en prod
8. **Pentest** + sécurité finale
9. **Lancement** pilote

---

*Document maintenu par Tartrinator. Dernière MAJ : 8 juin 2026.*
