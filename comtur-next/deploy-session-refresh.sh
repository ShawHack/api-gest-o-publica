#!/usr/bin/env bash
set -euo pipefail
SRC=/tmp/semit-session
PUBLIC=/home/semit/Documentos/api-semit/backend/public
PRIVATE=/home/semit/Documentos/api-semit/backend/private
CANON_PRIVATE=/home/semit/Documentos/api-gestao-publica/backend/private
install -m 644 "$SRC/semit-session.js" "$PUBLIC/semit-session.js"
install -m 644 "$SRC/dashboard.html" "$PUBLIC/dashboard.html"
install -m 644 "$SRC/dashboard-app.private.html" "$PRIVATE/dashboard-app.html"
if [[ -d "$(dirname "$CANON_PRIVATE")" ]]; then
  mkdir -p "$CANON_PRIVATE"
  install -m 644 "$SRC/dashboard-app.private.html" "$CANON_PRIVATE/dashboard-app.html" || true
fi
install -m 644 "$SRC/comtur-staff-admin.html" "$PUBLIC/comtur-staff-admin.html"
install -m 644 "$SRC/comtur-branding-admin.html" "$PUBLIC/comtur-branding-admin.html"
install -m 644 "$SRC/comtur-content-admin.html" "$PUBLIC/comtur-content-admin.html"
install -m 644 "$SRC/comtur-meetings-admin.html" "$PUBLIC/comtur-meetings-admin.html"
install -m 644 "$SRC/comtur-admin-new.html" "$PUBLIC/comtur-admin-new.html"
test -f "$PUBLIC/semit-session.js"
grep -q SemitSession "$PUBLIC/dashboard.html"
grep -q SemitSession "$PRIVATE/dashboard-app.html"
curl -fsS -o /dev/null -w "session_js:%{http_code}\n" http://127.0.0.1:5000/semit-session.js
echo SESSION_REFRESH_OK
