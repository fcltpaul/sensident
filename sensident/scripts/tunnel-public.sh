#!/bin/bash
# Sensident — Accès à distance (tunnel public)
#
# Demarre le serveur dev (port 3001) + un tunnel public vers celui-ci.
# Tu obtiens une URL https://xxx.loca.lt accessible depuis n'importe ou.
#
# Usage :  bash scripts/tunnel-public.sh
#
# Options :
#   --cloudflare   Utilise cloudflared (plus fiable, mais plus lent a installer)
#   --ngrok        Utilise ngrok (necessite un compte gratuit, plus stable)
#   --localtunnel  Utilise localtunnel (defaut, simple, parfois bloque)
#
set -e

METHOD="localtunnel"
for arg in "$@"; do
  case $arg in
    --cloudflare) METHOD="cloudflare" ;;
    --ngrok) METHOD="ngrok" ;;
    --localtunnel) METHOD="localtunnel" ;;
  esac
done

echo "============================================"
echo "  Sensident — Tunnel public vers localhost:3001"
echo "  Methode : $METHOD"
echo "============================================"
echo ""

# Verifier que le serveur tourne deja
if ! curl -s http://localhost:3001 > /dev/null 2>&1; then
  echo "[1/2] Demarrage du serveur Next.js sur le port 3001..."
  echo ""
  echo "ASTUCE : dans un autre terminal, lance :"
  echo "  cd $(pwd)"
  echo "  node node_modules/next/dist/bin/next dev --port 3001"
  echo ""
  read -p "Appuie sur Entree quand le serveur est demarre..."
fi

echo "[2/2] Demarrage du tunnel $METHOD..."

case $METHOD in
  localtunnel)
    echo ""
    echo "LocalTunnel :"
    echo "  - URL : https://random-words.loca.lt (donne une IP aléatoire)"
    echo "  - Acces : sur la 1ere visite, cliquer 'Click to Continue' (protege contre les abus)"
    echo "  - Note : si tu vois un avertissement, c'est normal, c'est le disclaimer de LocalTunnel"
    echo ""
    npx --yes localtunnel --port 3001
    ;;
  cloudflare)
    echo ""
    echo "Cloudflare Tunnel :"
    echo "  - URL : https://xxx.trycloudflare.com (URL stable pendant la session)"
    echo "  - Acces : direct, pas de disclaimer"
    echo "  - Note : 1ere install, cloudflared est telecharge (~30 Mo)"
    echo ""
    if ! command -v cloudflared &> /dev/null; then
      echo "Installation de cloudflared..."
      npm install -g cloudflared
    fi
    cloudflared tunnel --url http://localhost:3001
    ;;
  ngrok)
    echo ""
    echo "Ngrok :"
    echo "  - Necessite un compte gratuit sur https://ngrok.com"
    echo "  - Token a definir : export NGROK_AUTHTOKEN=xxxx"
    echo ""
    if ! command -v ngrok &> /dev/null; then
      echo "Installation de ngrok..."
      npm install -g ngrok
    fi
    if [ -z "$NGROK_AUTHTOKEN" ]; then
      echo "ERREUR : defini NGROK_AUTHTOKEN avant de lancer."
      echo "  1. Cree un compte sur https://ngrok.com"
      echo "  2. Copie ton authtoken"
      echo "  3. Relance avec : export NGROK_AUTHTOKEN=xxxx && bash scripts/tunnel-public.sh --ngrok"
      exit 1
    fi
    ngrok http 3001
    ;;
esac
