#!/bin/sh
set -eu
stage=/tmp/sama-routes-20260904
public=/home/semit/Documentos/api-semit/backend/public/sama
backup=/home/semit/Documentos/deploy-backups/sama-routes-20260904
config=/home/semit/Documentos/api-semit/nginx/nginx.conf
for file in "$stage"/*.js; do node --check "$file"; done
node "$stage/test-routes.cjs"
mkdir -p "$backup"
cp -pn "$public/index.html" "$public/identity.js" "$public/manifest.json" "$backup/"
cp -pn "$config" "$backup/nginx.conf"
for file in "$stage"/*.js; do cp "$file" "$public/"; done
cp "$stage/manifest.json" "$public/manifest.json"
cp "$stage/index.html" "$public/index.html"
cp "$stage/nginx.conf" "$config"
if ! docker exec nginx nginx -t; then
  cp "$backup/nginx.conf" "$config"
  cp "$backup/index.html" "$backup/identity.js" "$backup/manifest.json" "$public/"
  exit 1
fi
docker exec nginx nginx -s reload
echo 'Published with validated graceful reload; application containers unchanged.'
