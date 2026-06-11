# Checklist HDS & Securite — Sensident MVP

> **Statut** : A checker avant mise en production HDS.
> **Date** : 8 juin 2026.
> **Owner** : Paul Foucault (ou DPO externe en prod).

---

## 1. Authentification & sessions

| Item | Statut | Notes |
|---|---|---|
| MFA TOTP obligatoire praticien (A2) | ✅ | otplib, QR code, vérification à chaque login |
| Sessions httpOnly + Secure + SameSite | ✅ | cookies signes, expires_at 7j |
| Destruction de session au logout | ✅ | `destroySession()` supprime le token en BDD |
| Pas de mot de passe en clair | ✅ | bcrypt cost 12 |
| Politique password 12+ char | ✅ | 1 maj, 1 chiffre, longueur 12 |
| Anti-enumeration sur login | ✅ | bcrypt compare factice si email inexistant |
| Token de confirmation HMAC signe | ✅ | 24h, signature validee |
| Magic link patient avec expiration | ✅ | 24h, usage unique, hashé en BDD |
| Lien desabonnement signe | ⚠️ | fonctionne mais table opt_out_tokens à creer en prod |
| Compteur de tentatives de login | ❌ | A ajouter : rate limit (3 essais, ban 15min) |
| Blocage compte apres X echecs MFA | ❌ | A ajouter |

## 2. Donnees

| Item | Statut | Notes |
|---|---|---|
| Cabinet_id denormalized sur toutes les tables | ✅ | denormalized pour RLS et index |
| Row-Level Security (PostgreSQL) | ✅ (script SQL) | A tester en staging |
| Email patient hashé SHA-256 + salt | ✅ | hash deterministe pour counts |
| Email patient jamais en clair cote dashboard | ✅ | A1 (vue dentiste) |
| Audit logs exhaustifs | ✅ | login, mfa, optin, unsubscribe, article_created, etc. |
| Audit logs immuables | ✅ (script SQL) | REVOKE UPDATE/DELETE |
| Pas de PGP chiffré email en BDD dev | ⚠️ | `email_encrypted` (text) en SQLite, à chiffrer avec libsodium/PGP en prod HDS |
| Chiffrement at-rest PostgreSQL HDS | ✅ (à activer) | Transparent Data Encryption (TDE) ou LUKS |

## 3. Headers & transport

| Item | Statut | Notes |
|---|---|---|
| TLS 1.3 forcé | ✅ (à activer en prod) | Certif Let's Encrypt + HSTS |
| HSTS | ❌ | A ajouter : `Strict-Transport-Security: max-age=31536000; includeSubDomains; preload` |
| X-Frame-Options DENY | ✅ | next.config.js |
| X-Content-Type-Options nosniff | ✅ | next.config.js |
| Referrer-Policy strict-origin | ✅ | next.config.js |
| Permissions-Policy (camera, geo) | ✅ | next.config.js |
| CSP (Content-Security-Policy) | ❌ | A ajouter : script-src 'self', object-src 'none', etc. |
| CORS | N/A | Pas d'API publique |

## 4. No-AI by design

| Item | Statut | Notes |
|---|---|---|
| Aucune dependance LLM | ✅ | `npm run lint:no-ai` |
| Aucun appel API externe IA | ✅ | Audit reseau runtime + linting CI |
| Aucune donnee envoyee a OpenAI/Anthropic/etc. | ✅ | Pas d'appel reseau sortant |
| Documentation ARCHITECTURE.md explicite | ⚠️ | A formaliser dans le repo |
| Audit log : tracer toute requete sortante | ⚠️ | A ajouter en prod |

## 5. Conformite RGPD

| Item | Statut | Notes |
|---|---|---|
| Opt-in explicite, granulaire, séparé CGU | ✅ | double opt-in |
| Bandeau cookies (analytics internes) | ⚠️ | A ajouter (analytics No-AI = exemptés LIP mais bonne pratique) |
| Droit à l'effacement (art. 17) | ⚠️ | Endpoint `forget` à créer |
| Droit à la portabilite (art. 20) | ⚠️ | Export CSV des données à créer |
| Registre des traitements | ⚠️ | A documenter (DPO) |
| DPO designe | ❌ | Paul = DPO interne en attendant, avocat externe en prod |
| Politique de confidentialite | ❌ | A rediger (validation juridique externe) |
| CGU patient | ❌ | A rediger (validation juridique externe) |
| CGU praticien | ❌ | A rediger (validation juridique externe) |
| Contrat cabinet-plateforme | ❌ | A rediger (validation juridique externe) |
| Retention 3 ans post-desabonnement | ✅ | A implementer en cron |
| Transferts hors UE | ✅ | Aucun (No-AI + hebergement France) |

## 6. HDS

| Item | Statut | Notes |
|---|---|---|
| Hebergeur certifie HDS | ❌ | A choisir (Scaleway, OVHcloud, Outscale, Clever Cloud) |
| Infogerance Type 1 ou 2 | ❌ | A signer |
| Chiffrement at-rest | ✅ (à activer) | TDE PostgreSQL |
| Chiffrement in-transit | ✅ (à activer) | TLS 1.3 |
| Sauvegardes chiffrees | ❌ | A configurer (snapshot quotidien, chiffrement) |
| PRA (Plan de Reprise d'Activite) | ❌ | A documenter (RTO < 4h, RPO < 1h) |
| Logs d'acces hebergeur | ❌ | Conserves 1 an minimum |
| Audit hebergeur HDS | ❌ | A realiser avant go-live |

## 7. Securite applicative

| Item | Statut | Notes |
|---|---|---|
| CSRF protection | ✅ | Next.js Server Actions le gere natif |
| Rate limiting login/opt-in | ❌ | A ajouter (upstash/ratelimit ou middleware maison) |
| Validation inputs Zod | ✅ | Tous les endpoints API |
| Pas d'injection SQL | ✅ | Drizzle ORM (parameterized queries) |
| Pas d'XSS | ✅ | React escape par defaut + pas de `dangerouslySetInnerHTML` sur contenu user (sauf templates) |
| Pas d'open redirect | ✅ | Redirects en liste blanche (NextResponse.redirect) |
| Anti-enumeration | ✅ | Login + magic link renvoient OK dans tous les cas |
| Secrets en env vars | ✅ | .env.local jamais commit, .env.example fourni |
| Cles Stripe webhook signees | ✅ | `verifyWebhookSignature` |
| Mots de passe en clair zero part | ✅ | hashés bcrypt |

## 8. Tests & qualite

| Item | Statut | Notes |
|---|---|---|
| Smoke tests HTTP | ✅ | `scripts/smoke-test.js` |
| Tests E2E Playwright | ✅ | `tests/e2e/auth.spec.ts` (6 scenarios) |
| Tests unitaires (Vitest) | ❌ | A ajouter si besoin |
| Pentest externe | ❌ | A realiser avant go-live (budget ~5-10k€) |
| Bug bounty | ❌ | A considerer post-lancement |

---

## Synthese

**Pret pour la production** : ~60%
**Bloquant avant go-live** :
1. Choix hebergeur HDS + signature contrat
2. Validation juridique externe (CGU, contrats, Politique de confidentialite)
3. Pentest externe
4. Politique de confidentialite + DPO designé
5. Mise en place Stripe (vrais price_id) + Brevo SMTP
6. Backups chiffrés + PRA
7. CSP + HSTS headers en prod
8. Rate limiting

**Non-bloquant mais recommande** :
- PGP encryption des emails en BDD
- Endpoint "forget me" + export RGPD
- 9 articles seed (Paul)
- Tests unitaires
