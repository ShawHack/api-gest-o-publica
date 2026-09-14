#!/usr/bin/env bash
set -euo pipefail
SRC=/tmp/comtur-hub
PUBLIC=/home/semit/Documentos/api-semit/backend/public
OPT=/opt/backend-public
install -m 644 "$SRC/comtur-admin.html" "$PUBLIC/comtur-admin.html"
if [[ -d "$OPT" ]]; then
  install -m 644 "$SRC/comtur-admin.html" "$OPT/comtur-admin.html"
fi
python3 "$SRC/patch_nginx_admin_hub.py"
docker exec nginx nginx -t
docker exec nginx nginx -s reload
echo ADMIN_HUB_OK
