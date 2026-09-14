#!/usr/bin/env bash
set -euo pipefail
SRC=/tmp/visit-wl
PUBLIC=/home/semit/Documentos/api-semit/backend/public
OPS=/home/semit/Documentos/api-semit/backend
CANON=/home/semit/Documentos/api-gestao-publica/backend

mkdir -p "$PUBLIC/turismo/assets"
install -m 644 "$SRC/turismo/index.html" "$PUBLIC/turismo/index.html"
install -m 644 "$SRC/turismo/assets/"* "$PUBLIC/turismo/assets/"
find "$PUBLIC/turismo" -type d -exec chmod 755 {} \;
find "$PUBLIC/turismo" -type f -exec chmod 644 {} \;
install -m 644 "$SRC/portal/comtur-branding-admin.html" "$PUBLIC/comtur-branding-admin.html"
install -m 644 "$SRC/portal/comtur-admin.html" "$PUBLIC/comtur-admin.html"
install -m 644 "$SRC/portal/comtur-admin.css" "$PUBLIC/comtur-admin.css"
install -m 644 "$SRC/backend/helpers/comtur-branding.js" "$OPS/helpers/comtur-branding.js"
install -m 644 "$SRC/backend/controllers/ComturBrandingController.js" "$OPS/controllers/ComturBrandingController.js"
install -m 644 "$SRC/backend/routes/ComturRoutes.js" "$OPS/routes/ComturRoutes.js"
install -m 644 "$SRC/backend/helpers/comtur-branding.js" "$CANON/helpers/comtur-branding.js"
install -m 644 "$SRC/backend/controllers/ComturBrandingController.js" "$CANON/controllers/ComturBrandingController.js"
install -m 644 "$SRC/backend/routes/ComturRoutes.js" "$CANON/routes/ComturRoutes.js"

WORKDIR=$(docker inspect api --format '{{index .Config.Labels "com.docker.compose.project.working_dir"}}')
NETWORK=$(docker inspect api --format '{{range $k,$v := .NetworkSettings.Networks}}{{$k}}{{end}}')
cat > /tmp/Dockerfile.wl <<'EOF'
FROM api-semit-api:latest
USER root
COPY helpers/comtur-branding.js /app/helpers/comtur-branding.js
COPY controllers/ComturBrandingController.js /app/controllers/ComturBrandingController.js
COPY routes/ComturRoutes.js /app/routes/ComturRoutes.js
USER node
EOF
docker build -t api-semit-api:white-label -f /tmp/Dockerfile.wl "$OPS"
docker tag api-semit-api:white-label api-semit-api:latest
cd "$WORKDIR"
docker compose up -d --no-deps --force-recreate api
for _ in $(seq 1 30); do
  st=$(docker inspect api --format '{{if .State.Health}}{{.State.Health.Status}}{{else}}{{.State.Status}}{{end}}')
  if [[ "$st" == "healthy" ]]; then echo API_HEALTHY; break; fi
  sleep 2
done
curl -fsS http://127.0.0.1:5000/health; echo
curl -sS http://127.0.0.1:5000/api/comtur/branding
echo
grep -o 'index-[A-Za-z0-9]*\.js' "$PUBLIC/turismo/index.html"
echo DEPLOY_OK
