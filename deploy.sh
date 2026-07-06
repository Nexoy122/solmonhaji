#!/usr/bin/env bash
# One-command deploy on the server: pull → build → restart.
#   ./deploy.sh
set -e
cd "$(dirname "$0")"

echo "→ Pulling latest…"
git pull --ff-only

echo "→ Installing deps (if changed)…"
npm install --no-audit --no-fund

echo "→ Building…"
npm run build

echo "→ Restarting app…"
if command -v pm2 >/dev/null 2>&1; then
  pm2 restart nichespy --update-env || pm2 start npm --name nichespy -- start
  pm2 save
else
  # Fallback to screen if PM2 isn't installed.
  screen -S app -X quit 2>/dev/null || true
  screen -S app -dm bash -c 'cd "'"$PWD"'" && npm start'
fi

echo "✓ Deployed."
