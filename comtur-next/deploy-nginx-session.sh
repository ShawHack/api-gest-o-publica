#!/usr/bin/env bash
set -euo pipefail
SRC=/tmp/semit-session
PUBLIC=/home/semit/Documentos/api-semit/backend/public
install -m 644 "$SRC/semit-session.js" "$PUBLIC/semit-session.js"
python3 "$SRC/patch_nginx_session.py"
docker exec nginx nginx -t
docker exec nginx nginx -s reload
curl -fsS -o /tmp/semit-session-check.js -w "js:%{http_code} ctype:%{content_type}\n" -H "Host: api.garca.sp.gov.br" http://127.0.0.1/semit-session.js || true
head -c 80 /tmp/semit-session-check.js; echo
echo NGINX_SESSION_OK
