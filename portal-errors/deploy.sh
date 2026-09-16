#!/bin/sh
set -eu
stage=/tmp/portal-errors-20260904
public=/home/semit/Documentos/api-semit/backend/public
config=/home/semit/Documentos/api-semit/nginx/nginx.conf
backup=/home/semit/Documentos/deploy-backups/portal-errors-20260904
mkdir -p "$backup" "$public/portal-errors"
cp -pn "$config" "$backup/nginx.conf"
cp -pn "$public/index.html" "$backup/index.html"
cp "$stage/404.html" "$stage/unavailable.html" "$stage/error.css" "$stage/error.js" "$stage/memorial-guard.js" "$public/portal-errors/"
cp "$stage/index.html" "$public/index.html"
cp "$stage/nginx.conf" "$config"
host_hash=$(sha256sum "$config" | cut -d ' ' -f1)
mounted_hash=$(docker exec nginx sha256sum /etc/nginx/conf.d/default.conf | cut -d ' ' -f1)
if [ "$host_hash" != "$mounted_hash" ]; then
  cp "$backup/nginx.conf" "$config"
  cp "$backup/index.html" "$public/index.html"
  echo 'Config mount mismatch: rolled back, no reload.' >&2
  exit 1
fi
if ! docker exec nginx nginx -t; then
  cp "$backup/nginx.conf" "$config"
  cp "$backup/index.html" "$public/index.html"
  exit 1
fi
docker exec nginx nginx -s reload
echo 'Published web error handling; API unchanged.'
