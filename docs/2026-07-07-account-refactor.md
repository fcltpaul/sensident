# 2026-07-07 — Refactor compte praticien : Contact intégré, logo, cadence, planification intelligente

> **Statut** : ✅ livré, commit `f9fd4ac` poussé sur `main` (Vercel déploie auto).
> **Prochaine session** : reprendre ici.
>
> **Contexte** : demande Paul en 4 points + 1 :
> 1. Retirer le bouton **Contact** du dashboard praticien (sidebar).
> 2. Le rajouter dans **Mon compte**.
> 3. Ajouter la possibilité de mettre un **logo** (URL https).
> 4. Choisir la **fréquence d'envoi newsletter** (1/sem, 2/sem, 1/mois) + jour + heure.
> 5. À la planification, proposer la **prochaine occurrence, la suivante, etc.** au lieu d'une date, et décaler automatiquement les newsletters déjà programmées.

---

## 1. Fichiers livrés

### Backend (4 fichiers)
| Fichier | Quoi |
|---|---|
| `src/lib/newsletter-cadence.ts` | Helpers de calcul des occurrences en `Europe/Paris` (heure d'été/hiver OK). |
| `src/lib/newsletter-branding-types.ts` | Interface partagée du branding `{logoUrl, accentColor, signature, showLogo}`. |
| `src/app/api/practitioner/newsletter-branding/route.ts` | Refacto Neon-safe (raw SQL + `::jsonb`). Sanitisation `logoUrl` http(s) + accentColor hex. |
| `src/app/api/practitioner/newsletter-cadence/route.ts` | **Nouveau** PUT/GET/DELETE. Validation 3-tier frequency/sendDay/sendHour. |

### Frontend (5 fichiers)
| Fichier | Quoi |
|---|---|
| `src/app/dashboard/account/page.tsx` | Charge praticien + cabinet + **bloc contact** + **branding** + **cadence** + abonnement en un seul appel Neon raw SQL. |
| `src/app/dashboard/account/account-form.tsx` | Réécrit : sections Identité / Bloc contact / Branding (logo + accent + signature) / Cadence / Mot de passe / MFA / Abonnement. |
| `src/app/dashboard/newsletter/composer-send-step.tsx` | Réécrit : 3 boutons "Prochaine / Suivante / Encore après" calculés live via `nextOccurrences()` + bandeau récap + fallback "Choisir une autre date...". |
| `src/app/dashboard/sidebar.tsx` | Entrée `Contact` **supprimée** du `TABS`. |
| `src/components/dashboard/dashboard-mobile-nav.tsx` | Entrée `Contact` **supprimée** du drawer mobile. |

### DB (4 fichiers)
| Fichier | Quoi |
|---|---|
| `src/db/schema.pg.ts` | Colonne `newsletterCadence` (`jsonb`) + type `NewsletterCadence` exporté. |
| `src/db/schema.sqlite.ts` | Colonne `newsletterCadence` (text) + type `NewsletterCadence` miroir. |
| `src/db/schema.sql` | Ajout `newsletter_branding JSONB` + `newsletter_cadence JSONB` dans `CREATE TABLE cabinets`. |
| Neon prod | `ALTER TABLE cabinets ADD COLUMN IF NOT EXISTS newsletter_cadence JSONB` appliqué via script. |

### API extend
| Fichier | Quoi |
|---|---|
| `src/app/api/newsletter/send/route.ts` | `shiftConflictingSends(cabinetId, requested, excludeSendId)` — décale les newsletters déjà programmées en cas de collision `[requested-5min, requested+15min]` pour garantir un écart ≥15min entre chaque envoi futur du cabinet. |

### Scripts diagnostic (6 nouveaux)
| Fichier | Usage |
|---|---|
| `scripts/_migrate-cabinets-cadence.sql` | Migration Neon `newsletter_cadence` jsonb. |
| `scripts/_migrate-cabinets-cadence-sqlite.sql` | Idem dev SQLite. |
| `scripts/_run-migrate-cabinets-cadence.mjs` | Runner idempotent Neon (déjà exécuté en prod). |
| `scripts/_test-newsletter-prefs-neon.mjs` | Round-trip branding + cadence + restore. |
| `scripts/_test-send-shift-neon.mjs` | Test basique collision (3 envoyes). |
| `scripts/_test-send-shift-stress.mjs` | Stress 5 envoyes + insertion au milieu, vérifie écart ≥15min. |

---

## 2. Décisions techniques

### Logo
- **URL https uniquement** (validation stricte anti-`javascript:`, anti-localhost).
- Pas d'upload de fichier en MVP (nécessiterait Vercel Blob / S3). Paul colle l'URL de son site existant.
- Taille recommandée documentée : PNG transparent ou SVG, 200×80 px.

### Cadence
- **Frequency** : `weekly` | `biweekly` | `monthly`.
- **sendDay** : 0..6 (0=dim..6=sam) pour hebdo/biweekly ; 1..**28** pour mensuel (jamais 29+ pour éviter les pb 30 jours / 29 fév).
- **sendHour** : 0..23 (heure locale Paris).
- **Stockage** : `newsletter_cadence JSONB` sur cabinets. `NULL` = pas configuré (l'UI retombe sur saisie libre).
- **Fuseau** : `Europe/Paris` systématiquement. DOM-TOM négligé MVP.

### Décalage de collision
- Fenêtre de collision : `[requested - 5min, requested + 15min]`.
- Stratégie : on ne touche qu'aux envoyes `>= requested` (les passés ne sont jamais modifiés). Pour chaque collision, on décale en chaîne pour garantir `>= 15min` entre chaque.
- Itère max 10 passes (safety contre boucle infinie). Stress test : 5 envoyes espaces 5min + insertion T+12min → 3 envoyes >=requested espaces 15min.

### Rétrocompat
- `/dashboard/contact` reste fonctionnel côté route mais n'apparaît plus nulle part dans la nav. Si Paul y va via bookmark, la page affiche l'ancien `ContactForm` (toujours branché sur `/api/practitioner/contact`). Pas de redirect — pas urgent.

---

## 3. Tests passés

- `npx tsc --noEmit` → exit 0
- `npx next build` → exit 0, build complet (0 erreur)
- Neon round-trip `newsletter_branding` + `newsletter_cadence` : ✅
- Neon invalid json cast : ✅ (rejeté proprement)
- Neon shift collision (2 envoyes + insertion) : ✅ 2 passes, fin stable
- Neon shift stress (5 envoyes + insertion) : ✅ tous les >=requested espacés ≥15min

---

## 4. Points à valider au réveil de Paul

1. **L'entrée Contact est bien absente** de la sidebar praticien (et du menu mobile).
2. **Le bloc contact** dans Mon compte reprend bien tous les champs (RPPS, adresse, horaires, photo façade, ONCD, lien RDV, lien Maps, mail) — visuellement prévisualisé en temps réel.
3. **Le branding** : rentrer une URL `https://example.com/logo.png`, activer "afficher le logo", et vérifier l'aperçu couleur + logo.
4. **La cadence** : choisir "Toutes les 2 semaines, mardi 9h00", enregistrer, puis aller sur le composer newsletter, aller jusqu'à l'étape "Envoyer", voir 3 boutons "Prochaine : …, Suivante : …, Encore après : …" qui s'incrémentent de 14 jours.
5. **Décalage auto** : programmer une newsletter à une date, puis en programmer une 5min après — la 2ème doit être décalée automatiquement.

---

## 5. Suivi / Risques

### Faibles
- **`/dashboard/contact` orpheline** : la route existe toujours mais n'est plus accessible via nav. Si un bookmark pointe encore dessus, l'ancien formulaire fonctionne. Décision à prendre : redirect → `/dashboard/account` ou laisser pour l'instant.
- **UXDOM-TOM** : fuseau `Europe/Paris` hardcodé. Un praticien de La Réunion verra ses heures en heure Paris. P3.

### Moyens
- **Pas d'upload logo** : si Paul veut uploader un fichier sans passer par un hébergeur tiers, on ajoutera Vercel Blob (~30 min dev + config env var).
- **Pas de cron d'envoi automatique** : la cadence sert aujourd'hui à proposer les prochaines occurrences dans le composer. L'envoi auto (sans intervention humaine) est **hors scope** de cette livraison. À planifier en P2.

---

## 6. Pour relancer rapidement (prochaine session)

```bash
cd sensident
git log --oneline -3   # HEAD = f9fd4ac
npx tsc --noEmit       # doit être clean
npx next build         # doit être exit 0
```

Endpoints concernés à tester en prod (cookies démo François) :
- `GET /dashboard/account` (200, contient branding + cadence + contact dans la payload)
- `PUT /api/practitioner/newsletter-cadence` (200)
- `GET /api/practitioner/newsletter-branding` (200, logoUrl sérialisé)
- `POST /api/newsletter/send` avec `scheduledAt` → vérifier que les autres scheduled du cabinet sont décalés (SQL Neon direct via `scripts/_test-send-shift-stress.mjs`)

---

## 7. Commits

- `f9fd4ac` — feat(account): deplacer Contact dans Mon compte + logo + cadence newsletter + planification intelligente

Single commit monolithique par choix (1 demande Paul, 1 livraison testable en bloc).
