#!/usr/bin/env bash
set -Eeuo pipefail

SOURCE="/home/semit/Documentos/api-gestao-publica/frontend/build"
TARGET="/home/semit/Documentos/api-semit/frontend/build"
ROLLBACK_ROOT="/home/semit/Documentos/deploy-rollbacks"
STAMP="$(date +%Y%m%d-%H%M%S)"
BACKUP="$ROLLBACK_ROOT/frontend-build-before-rural-$STAMP"
TEMP_INDEX="$TARGET/.index.html.rural-$STAMP.tmp"

test -d "$SOURCE/static/js"
test -d "$TARGET/static/js"
test -f "$SOURCE/index.html"
test -f "$SOURCE/banner-estradas.png"
MAIN_JS="$(find "$SOURCE/static/js" -maxdepth 1 -type f -name 'main.*.js' ! -name '*.map' | head -n 1)"
test -n "$MAIN_JS"
grep -q '/rotas-rurais/static/js/' "$SOURCE/index.html"
grep -q '/rotas-rurais/static/css/' "$SOURCE/index.html"
grep -q 'rotas-rurais' "$MAIN_JS"
node --check "$MAIN_JS"

mkdir -p "$ROLLBACK_ROOT"
cp -a "$TARGET" "$BACKUP"

# Mantém os assets antigos para sessões abertas e publica os novos primeiro.
rsync -a --exclude='index.html' "$SOURCE/" "$TARGET/"
cp -p "$SOURCE/index.html" "$TEMP_INDEX"
mv "$TEMP_INDEX" "$TARGET/index.html"

test "$(sha256sum "$SOURCE/index.html" | awk '{print $1}')" = "$(sha256sum "$TARGET/index.html" | awk '{print $1}')"
test "$(sha256sum "$SOURCE/banner-estradas.png" | awk '{print $1}')" = "$(sha256sum "$TARGET/banner-estradas.png" | awk '{print $1}')"

printf 'BACKUP=%s\n' "$BACKUP"
printf 'INDEX_SHA256=%s\n' "$(sha256sum "$TARGET/index.html" | awk '{print $1}')"
printf 'BANNER_SHA256=%s\n' "$(sha256sum "$TARGET/banner-estradas.png" | awk '{print $1}')"
