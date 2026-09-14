#!/usr/bin/env bash
set -euo pipefail
SRC=/tmp/comtur-banner
OPS=/home/semit/Documentos/api-semit/backend
CANON=/home/semit/Documentos/api-gestao-publica/backend
PUBLIC=/home/semit/Documentos/api-semit/backend/public
docker exec -u root api mkdir -p /data/apicemiterio/comtur
docker exec -u root api chown node:node /data/apicemiterio/comtur
docker exec -u node api touch /data/apicemiterio/comtur/.write-ok
install -m 644 "$SRC/comtur-upload.js" "$OPS/helpers/comtur-upload.js"
install -m 644 "$SRC/comtur-upload.js" "$CANON/helpers/comtur-upload.js" || true
install -m 644 "$SRC/semit-session.js" "$PUBLIC/semit-session.js"
install -m 644 "$SRC/comtur-branding-admin.html" "$PUBLIC/comtur-branding-admin.html"
WORKDIR=$(docker inspect api --format '{{index .Config.Labels "com.docker.compose.project.working_dir"}}')
cat > /tmp/Dockerfile.comtur-banner <<'EOF'
FROM api-semit-api:latest
USER root
COPY helpers/comtur-upload.js /app/helpers/comtur-upload.js
USER node
EOF
docker build -t api-semit-api:comtur-banner -f /tmp/Dockerfile.comtur-banner "$OPS"
docker tag api-semit-api:comtur-banner api-semit-api:latest
cd "$WORKDIR"
docker compose up -d --no-deps --force-recreate api
for _ in $(seq 1 30); do
  st=$(docker inspect api --format '{{if .State.Health}}{{.State.Health.Status}}{{else}}{{.State.Status}}{{end}}')
  if [[ "$st" == "healthy" ]]; then echo API_HEALTHY; break; fi
  sleep 2
done
docker exec api ls -ld /data/apicemiterio/comtur
curl -fsS http://127.0.0.1:5000/health; echo
echo BANNER_DIR_OK
