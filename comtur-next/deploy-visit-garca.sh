#!/usr/bin/env bash
set -euo pipefail

SRC="${1:-/tmp/visit-garca-20260909}"
STAMP="visit-garca-20260909"
BACKUP="/home/semit/Documentos/deploy-backups/${STAMP}"
PUBLIC="/home/semit/Documentos/api-semit/backend/public"
NGINX="/home/semit/Documentos/api-semit/nginx/nginx.conf"
CANON="/home/semit/Documentos/api-gestao-publica"
OPS="/home/semit/Documentos/api-semit"

mkdir -p "$BACKUP/public" "$BACKUP/nginx" "$PUBLIC/turismo/assets"
cp -a "$NGINX" "$BACKUP/nginx/nginx.conf"
cp -a "$PUBLIC/comtur-portal.html" "$BACKUP/public/" 2>/dev/null || true
cp -a "$PUBLIC/comtur-admin-nav.js" "$BACKUP/public/" 2>/dev/null || true
cp -a "$PUBLIC/comtur-content-admin.html" "$BACKUP/public/" 2>/dev/null || true
test -f "$PUBLIC/dashboard-app.html" && cp -a "$PUBLIC/dashboard-app.html" "$BACKUP/public/" || true
sha256sum "$NGINX" > "$BACKUP/nginx.sha256"

install -m 644 "$SRC/turismo/index.html" "$PUBLIC/turismo/index.html"
install -m 644 "$SRC/turismo/assets/"* "$PUBLIC/turismo/assets/"
find "$PUBLIC/turismo" -type d -exec chmod 755 {} \;
find "$PUBLIC/turismo" -type f -exec chmod 644 {} \;

for admin in comtur-branding-admin.html comtur-admin.html comtur-admin.css; do
  if [[ -f "$SRC/portal/$admin" ]]; then
    install -m 644 "$SRC/portal/$admin" "$PUBLIC/$admin"
  fi
done

install -m 644 "$SRC/portal/comtur-portal.html" "$PUBLIC/comtur-portal.html"
install -m 644 "$SRC/portal/comtur-admin-nav.js" "$PUBLIC/comtur-admin-nav.js"
if [[ -f "$SRC/portal/comtur-content-admin.html" ]]; then
  install -m 644 "$SRC/portal/comtur-content-admin.html" "$PUBLIC/comtur-content-admin.html"
fi

python3 "$SRC/patch_nginx_turismo.py"

if [[ -f "$PUBLIC/dashboard-app.html" ]]; then
  python3 - <<'PY'
from pathlib import Path
p = Path("/home/semit/Documentos/api-semit/backend/public/dashboard-app.html")
text = p.read_text(encoding="utf-8")
old = 'href="/comtur-portal.html" class="card card-comtur"'
new = 'href="/turismo/" class="card card-comtur"'
if old in text:
    p.write_text(text.replace(old, new, 1), encoding="utf-8")
    print("DASHBOARD_PATCHED")
else:
    print("DASHBOARD_UNCHANGED")
PY
fi

install -m 644 "$SRC/docs/COMTUR_MODULE.md" "$CANON/backend/docs/COMTUR_MODULE.md"
install -m 644 "$SRC/docs/COMTUR_MODULE.md" "$OPS/backend/docs/COMTUR_MODULE.md"

for rel in backend/models/ComturContent.js backend/helpers/comtur-content.js backend/controllers/ComturContentController.js backend/docs/comtur-openapi.yaml; do
  if [[ -f "$SRC/$rel" ]]; then
    install -m 644 "$SRC/$rel" "$CANON/$rel"
    install -m 644 "$SRC/$rel" "$OPS/$rel"
  fi
done

if [[ -f "$SRC/docs/decision-snippet.md" ]]; then
  DECISION_SNIPPET="$SRC/docs/decision-snippet.md" python3 - <<'PY'
from pathlib import Path
import os
mapa = Path("/home/semit/Documentos/api-gestao-publica/MAPA_DO_TESOURO.md")
snippet = Path(os.environ["DECISION_SNIPPET"]).read_text(encoding="utf-8")
text = mapa.read_text(encoding="utf-8")
marker = "## 28. Plano de implementação `comtur`"
if "Decisão de produto — substituição" in text:
    print("MAPA_ALREADY_HAS_DECISION")
else:
    idx = text.find(marker)
    if idx < 0:
        raise SystemExit("secao 28 nao encontrada")
    para_end = text.find("\n### ", idx + len(marker))
    if para_end < 0:
        raise SystemExit("nao achou fase 1")
    text = text[:para_end] + "\n\n" + snippet.strip() + "\n" + text[para_end:]
    mapa.write_text(text, encoding="utf-8")
    print("MAPA_PATCHED")
PY
fi

docker exec nginx nginx -t
docker exec nginx nginx -s reload
echo NGINX_RELOADED
curl -sk -o /dev/null -w "turismo %{http_code}\n" https://127.0.0.1/turismo/
curl -sk -o /dev/null -w "comtur-portal %{http_code} %{redirect_url}\n" https://127.0.0.1/comtur-portal.html
curl -sk -o /dev/null -w "mapa-legado %{http_code} %{redirect_url}\n" https://127.0.0.1/mapaturistico/
curl -fsS http://127.0.0.1:5000/health
echo BACKUP "$BACKUP"
