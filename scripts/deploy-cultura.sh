#!/bin/bash
# Publica o portal Garça Cidade de Culturas em backend/public/cultura/
# Uso: ./scripts/deploy-cultura.sh [pasta-origem]
set -euo pipefail

PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
SOURCE_DIR="${1:-$PROJECT_ROOT/cultura-src}"
DEST_DIR="$PROJECT_ROOT/backend/public/cultura"

if [[ ! -d "$SOURCE_DIR" ]]; then
  echo "Pasta de origem não encontrada: $SOURCE_DIR"
  exit 1
fi

echo "Origem:  $SOURCE_DIR"
echo "Destino: $DEST_DIR"

mkdir -p "$DEST_DIR"
rsync -a --delete \
  --exclude 'node_modules/' \
  --exclude '.git/' \
  --exclude 'package.json' \
  --exclude 'package-lock.json' \
  --exclude 'server.js' \
  --exclude 'seed_admin.js' \
  --exclude 'models/' \
  "$SOURCE_DIR/" "$DEST_DIR/"

# Permissões legíveis pelo nginx (container roda como root, mas evita surpresas)
find "$DEST_DIR" -type d -exec chmod 755 {} +
find "$DEST_DIR" -type f -exec chmod 644 {} +

# API local do projeto original → mesma origem (fase 2: /api/cultura na SEMIT)
while IFS= read -r -d '' f; do
  sed -i 's|http://localhost:3000||g' "$f"
done < <(find "$DEST_DIR" -type f \( -name '*.html' -o -name '*.js' \) -print0)

echo "Deploy concluído."
echo "  Portal: https://api.garca.sp.gov.br/cultura/"
echo "  Teatro: https://api.garca.sp.gov.br/cultura/teatro/teatro.html"
du -sh "$DEST_DIR"
