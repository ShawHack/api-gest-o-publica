#!/usr/bin/env bash
set -euo pipefail
SRC=/tmp/comtur-staff
OPS=/home/semit/Documentos/api-semit/backend
CANON=/home/semit/Documentos/api-gestao-publica/backend
PUBLIC=/home/semit/Documentos/api-semit/backend/public
install -m 644 "$SRC/helpers/comtur-staff.js" "$OPS/helpers/comtur-staff.js"
install -m 644 "$SRC/helpers/comtur-staff.js" "$CANON/helpers/comtur-staff.js"
install -m 644 "$SRC/controllers/ComturStaffController.js" "$OPS/controllers/ComturStaffController.js"
install -m 644 "$SRC/controllers/ComturStaffController.js" "$CANON/controllers/ComturStaffController.js"
install -m 644 "$SRC/routes/ComturRoutes.js" "$OPS/routes/ComturRoutes.js"
install -m 644 "$SRC/routes/ComturRoutes.js" "$CANON/routes/ComturRoutes.js"
install -m 644 "$SRC/portal/comtur-staff-admin.html" "$PUBLIC/comtur-staff-admin.html"
install -m 644 "$SRC/portal/comtur-admin-nav.js" "$PUBLIC/comtur-admin-nav.js"
install -m 644 "$SRC/portal/comtur-admin.css" "$PUBLIC/comtur-admin.css"
install -m 644 "$SRC/portal/comtur-admin-new.html" "$PUBLIC/comtur-admin-new.html"
install -m 644 "$SRC/portal/comtur-branding-admin.html" "$PUBLIC/comtur-branding-admin.html"
WORKDIR=$(docker inspect api --format '{{index .Config.Labels "com.docker.compose.project.working_dir"}}')
cat > /tmp/Dockerfile.comtur-staff <<'EOF'
FROM api-semit-api:latest
USER root
COPY helpers/comtur-staff.js /app/helpers/comtur-staff.js
COPY controllers/ComturStaffController.js /app/controllers/ComturStaffController.js
COPY routes/ComturRoutes.js /app/routes/ComturRoutes.js
USER node
EOF
docker build -t api-semit-api:comtur-staff -f /tmp/Dockerfile.comtur-staff "$OPS"
docker tag api-semit-api:comtur-staff api-semit-api:latest
cd "$WORKDIR"
docker compose up -d --no-deps --force-recreate api
for _ in $(seq 1 30); do
  st=$(docker inspect api --format '{{if .State.Health}}{{.State.Health.Status}}{{else}}{{.State.Status}}{{end}}')
  if [[ "$st" == "healthy" ]]; then echo API_HEALTHY; break; fi
  sleep 2
done
docker exec api grep -n "admin/staff" /app/routes/ComturRoutes.js | head
curl -fsS http://127.0.0.1:5000/health; echo
python3 - <<'PY'
from pathlib import Path
root = Path("/home/semit/Documentos/api-semit/backend/public")
for p in root.glob("comtur-*.html"):
    t = p.read_text(encoding="utf-8")
    n = t.replace("/comtur-admin-nav.js?v=3", "/comtur-admin-nav.js?v=4")
    if n != t:
        p.write_text(n, encoding="utf-8")
        print("bumped", p.name)
print("nav_cache_ok")
PY
test -f "$PUBLIC/comtur-staff-admin.html"
echo STAFF_DEPLOY_OK
