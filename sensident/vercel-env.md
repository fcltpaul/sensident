# Vercel — Variables d'environnement pour la démo François

> **État au 12/06/2026** : checklist à cocher dans le dashboard Vercel
> (Settings → Environment Variables) AVANT le premier déploiement.

## Ordre de remplissage

1. **DATABASE_URL** — branche Neon `demo-francois` (ou DB dédiée)
2. **AUTH_SECRET** — `openssl rand -base64 32`
3. **CRON_SECRET** — `openssl rand -base64 32`
4. **UNSUBSCRIBE_SECRET** — `openssl rand -base64 32`
5. **IP_HASH_SALT** — `openssl rand -base64 32`
6. **CABINET_HASH_SALT** — `openssl rand -base64 32`
7. **NEXT_PUBLIC_APP_URL** — URL Vercel fournie après 1er deploy (ex: `https://sensident-demo.vercel.app`)
8. **AUTH_URL** + **NEXTAUTH_URL** — idem ci-dessus
9. **BREVO_SMTP_USER / BREVO_SMTP_PASS / EMAIL_FROM** — depuis le dashboard Brevo
10. **STRIPE_SECRET_KEY / STRIPE_WEBHOOK_SECRET / NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY** — clés **test** pour la démo
11. **STRIPE_COUPON_AMBASSADOR=AMBASSADOR_2026**
12. **NODE_ENV=production**

## Tableau récapitulatif

| Variable | Type | Valeur démo | Sensible ? | Notes |
|---|---|---|---|---|
| `DATABASE_URL` | secret | `postgresql://…neon.tech/…?sslmode=require&channel_binding=require` | ✅ | Branche Neon dédiée `demo-francois` |
| `AUTH_SECRET` | secret | `openssl rand -base64 32` | ✅ | NextAuth — JAMAIS réutiliser le dev |
| `AUTH_URL` | plaintext | `https://sensident-demo.vercel.app` | ❌ | URL absolue, pas de trailing slash |
| `NEXTAUTH_URL` | plaintext | idem | ❌ | Legacy NextAuth — doubler avec AUTH_URL |
| `NEXT_PUBLIC_APP_URL` | plaintext | idem | ❌ | Utilisé dans liens magic link/email |
| `NODE_ENV` | plaintext | `production` | ❌ | Force SSL check dans db/client.ts |
| `BREVO_SMTP_USER` | secret | `noreply@sensident.fr` | ✅ | Compte Brevo transactional |
| `BREVO_SMTP_PASS` | secret | `xsmtpsib-…` | ✅ | Depuis Brevo → SMTP & API → SMTP |
| `BREVO_WEBHOOK_SECRET` | secret | `openssl rand -base64 32` | ✅ | Pour webhook events Brevo |
| `EMAIL_FROM` | plaintext | `"Sensident <noreply@sensident.fr>"` | ❌ | Doit matcher un sender vérifié Brevo |
| `STRIPE_SECRET_KEY` | secret | `sk_test_…` | ✅ | Mode test pour la démo |
| `STRIPE_WEBHOOK_SECRET` | secret | `whsec_…` | ✅ | `stripe listen` local ou endpoint prod |
| `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` | plaintext | `pk_test_…` | ❌ | Publiable, exposé au client |
| `STRIPE_COUPON_AMBASSADOR` | plaintext | `AMBASSADOR_2026` | ❌ | Coupon ambassadeur |
| `CRON_SECRET` | secret | `openssl rand -base64 32` | ✅ | HMAC cron scheduled |
| `UNSUBSCRIBE_SECRET` | secret | `openssl rand -base64 32` | ✅ | HMAC liens désabonnement |
| `IP_HASH_SALT` | secret | `openssl rand -base64 32` | ✅ | Audit logs |
| `CABINET_HASH_SALT` | secret | `openssl rand -base64 32` | ✅ | Isolation multi-tenant |

**Total : 17 variables (11 secrets, 6 plaintext).**

## Commandes utiles

```bash
# Générer un secret (à faire 5 fois)
openssl rand -base64 32

# Lister les variables déjà configurées sur Vercel
vercel env ls

# Push d'une variable depuis .env
vercel env add DATABASE_URL production

# Vérifier que le build passe (sanity check avant push)
DATABASE_URL=… npm run build
```

## Limites connues du plan Vercel

| Plan | Crons/jour | Domaines custom | Bande passante |
|---|---|---|---|
| **Hobby** (gratuit) | 2 / jour | ✅ | 100 GB/mois |
| **Pro** (20$/mois) | illimité | ✅ | 1 TB/mois |

**Pour la démo François, le plan Hobby suffit** car :
- Le cron `process-scheduled-newsletters` (toutes les 15 min) bloque sur Hobby, MAIS
  il n'y a pas de NL programmée pour la démo.
- Le cron `keep-alive` (1×/semaine lundi 6h) passe en Hobby.
- Pas de trafic attendu avant démo.

**À passer en Pro uniquement** si François veut des newsletters programmées.

## Setup Neon (branche démo)

1. Aller sur https://console.neon.tech
2. Projet `sensident` → Create Branch → `demo-francois`
3. Copier la `Connection string` (mode "Pooled", sslmode=require)
4. La coller comme `DATABASE_URL` dans Vercel
5. Localement, après merge, exécuter :
   ```bash
   DATABASE_URL=<url_demo> npx tsx scripts/init-pg.ts
   DATABASE_URL=<url_demo> node scripts/seed-articles-pg.mjs
   DATABASE_URL=<url_demo> node scripts/seed-demo-francois-pg.mjs
   ```
