# Accès à distance au MVP Sensident

> **Pour Paul** — comment acceder au serveur dev depuis ton telephone ou n'importe ou.

---

## Methode recommandee : LocalTunnel (1 commande, gratuit, sans compte)

Quand tu es sur ton PC, le serveur dev tourne sur `http://localhost:3001`.
Pour y acceder depuis ton telephone (ou partager avec Dr Thibault) :

### Option 1 — LocalTunnel (gratuit, sans compte)

```powershell
# Dans un terminal, avec le serveur dev deja lance sur 3001 :
npx localtunnel --port 3001
```

Tu obtiens une URL du type : `https://random-words.loca.lt`

C'est cette URL que tu ouvres dans le browser de ton tel.

⚠ A la 1ere visite, LocalTunnel affiche un disclaimer "Click to Continue" — c'est normal, clique.

### Option 2 — Cloudflare Tunnel (URL plus stable, pas de disclaimer)

```powershell
# Premiere fois seulement (telecharge ~30 Mo) :
winget install Cloudflare.cloudflared

# Puis :
cloudflared tunnel --url http://localhost:3001
```

Tu obtiens : `https://xxx.trycloudflare.com`

✅ Pas de disclaimer, URL plus stable, mais installation initiale plus longue.

### Option 3 — ngrok (necessite un compte gratuit, plus fiable)

1. Cree un compte sur https://ngrok.com (gratuit)
2. Copie ton authtoken
3. Lance :
   ```powershell
   $env:NGROK_AUTHTOKEN="ton_token_ici"
   npx ngrok http 3001
   ```

---

## Script automatique

J'ai cree `scripts/tunnel-public.sh` (compatible PowerShell via `bash` sous WSL ou Git Bash).

```powershell
bash scripts/tunnel-public.sh              # localtunnel (defaut)
bash scripts/tunnel-public.sh --cloudflare # cloudflare
bash scripts/tunnel-public.sh --ngrok     # ngrok
```

---

## Methodes avancees (Vercel, prod)

### Vercel preview (URL permanente gratuite)

Si tu veux une URL permanente partageable (et que tu acceptes que la DB soit reset a chaque deploy) :

1. Pousse le code sur un repo GitHub
2. Connecte Vercel (https://vercel.com)
3. Chaque commit genere une URL preview
4. ⚠ Le SQLite est read-only sur Vercel → il faut migrer vers PostgreSQL (HDS ou Neon gratuit)

### Tunnel persistant (serveur Hetzner/Scaleway)

Quand tu auras un serveur dedie (Hetzner CX11 ~4€/mois) :
- Installer le serveur, demarrer le dev
- Configurer un sous-domaine `dev.sensident.fr` avec DNS
- Certif Let's Encrypt + reverse-proxy nginx
- Acces permanent et securise

---

## Important : securite du tunnel

Quand tu ouvres un tunnel public, **n'importe qui avec l'URL peut acceder a ton dev local**.

- Ne jamais tunnel en prod
- Toujours utiliser un mot de passe admin fort (genere avec `openssl rand -base64 32`)
- Activer MFA TOTP obligatoire (deja fait)
- Les audit_logs tracent toutes les connexions, donc tu peux verifier qui s'est connecte

---

## Tests mobiles

Une fois le tunnel ouvert, teste sur ton telephone :

1. **Home** : http://localhost:3001 ou via tunnel
2. **Login admin** : http://localhost:3001/admin-auth/login
   - paul@sensident.fr
   - HjmM22pnw_LvlybMJBAhaocl
   - Code MFA Google Authenticator (secret : JVOTEWB4GZMXGNKL)
3. **Dashboard admin** : tester la sidebar, l'editeur d'articles
4. **Page cabinet demo** : créer un compte praticien, générer un QR code invitation

---

## Workflow de démo au Dr Thibault (à distance)

1. Tu lances le serveur + le tunnel le matin du rdv
2. Tu envoies l'URL tunnel a Dr Thibault par SMS
3. Il teste le produit depuis son tel
4. Apres le rdv, tu fermes le tunnel

L'URL change a chaque redemarrage (LocalTunnel) ou reste stable (Cloudflare/Ngrok avec compte).

---

## Quand tu auras ton PC

```powershell
# 1. Demarrer le serveur
cd C:\Users\clawuser\.openclaw\workspace-tartrinator\sensident
node node_modules/next/dist/bin/next dev --port 3001

# 2. Dans un 2e terminal, demarrer le tunnel
bash scripts/tunnel-public.sh

# 3. Copier l'URL affichee et l'envoyer a qui tu veux
```

---

*Doc rédigée par Tartrinator. Dernière MAJ : 8 juin 2026.*
