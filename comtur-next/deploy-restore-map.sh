#!/usr/bin/env bash
set -euo pipefail
SRC=/tmp/restore-mapaturistico
python3 "$SRC/patch_nginx_restore_map.py"
docker exec nginx nginx -t
docker exec nginx nginx -s reload
curl -skI -o /tmp/map-headers.txt -w "mapaturistico %{http_code} loc:%{redirect_url}\n" https://127.0.0.1/mapaturistico/
head -n 12 /tmp/map-headers.txt
echo MAPA_OK
