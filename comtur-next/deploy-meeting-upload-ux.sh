#!/usr/bin/env bash
set -euo pipefail
SRC=/tmp/comtur-doc-edit2
PUBLIC=/home/semit/Documentos/api-semit/backend/public
install -m 644 "$SRC/comtur-meetings-admin.html" "$PUBLIC/comtur-meetings-admin.html"
install -m 644 "$SRC/comtur-admin-nav.js" "$PUBLIC/comtur-admin-nav.js"
python3 "$SRC/patch_nginx_meetings_admin.py"
docker exec nginx nginx -t
docker exec nginx nginx -s reload
grep -o "addDocument\|Salvar alterações\|archived" "$PUBLIC/comtur-meetings-admin.html" | head
echo DOC_EDIT2_OK
