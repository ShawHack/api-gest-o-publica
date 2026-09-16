#!/bin/bash
set -euo pipefail
echo "=== aliases on network ==="
docker inspect api sd_docs-api nginx --format '{{.Name}} aliases={{json .NetworkSettings.Networks}}' 2>/dev/null | head -c 4000
echo
echo "=== compose service names for sd_docs ==="
grep -nE '^\s+api:|container_name:|aliases:' /home/semit/Documentos/api-semit/docker-compose.yml | head -60
echo "=== dns now ==="
docker exec nginx getent hosts api
docker exec nginx getent hosts sd_docs-api
curl -sk -o /dev/null -w "admin:%{http_code} content_post_noauth:%{http_code}\n" https://127.0.0.1/comtur-content-admin.html
# confirm v26 in live
curl -sk https://127.0.0.1/comtur-content-admin.html | grep -o 'cache-bust" content="v[0-9]*"'
curl -sk https://127.0.0.1/comtur-content-admin.html | grep -c 'Salvo com sucesso, mas a lista'
echo DONE
