#!/bin/bash
# Deploy Nexus — build, rebuild Docker, restart container
set -e

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
INFRA_DIR="$HOME/lobs/lobslab-infra"

echo "→ Building Nexus..."
cd "$SCRIPT_DIR"
npm run build

echo "→ Rebuilding Docker container..."
cd "$INFRA_DIR"
docker compose up -d nexus --build

echo "→ Verifying deployment..."
sleep 2
BUNDLE=$(docker exec lobslab-infra-nexus-1 ls /usr/share/nginx/html/static/ 2>/dev/null | grep 'index-.*\.js')
LOCAL_BUNDLE=$(ls "$SCRIPT_DIR/dist/static/" | grep 'index-.*\.js')

if [ "$BUNDLE" = "$LOCAL_BUNDLE" ]; then
  echo "✓ Deployed: $BUNDLE"
else
  echo "✗ Mismatch! Container: $BUNDLE, Local: $LOCAL_BUNDLE"
  exit 1
fi
