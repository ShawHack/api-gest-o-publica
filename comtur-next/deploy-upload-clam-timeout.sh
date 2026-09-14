#!/usr/bin/env bash
set -euo pipefail
SRC=/tmp/comtur-upload-fix
OPS=/home/semit/Documentos/api-semit/backend
PUBLIC="$OPS/public"
install -m 644 "$SRC/comtur-upload.js" "$OPS/helpers/comtur-upload.js"
install -m 644 "$SRC/comtur-meetings-admin.html" "$PUBLIC/comtur-meetings-admin.html"
install -m 644 "$SRC/comtur-admin-nav.js" "$PUBLIC/comtur-admin-nav.js"
WORKDIR=$(docker inspect api --format '{{index .Config.Labels "com.docker.compose.project.working_dir"}}')
cat > /tmp/Dockerfile.comtur-upload-fix <<'EOF'
FROM api-semit-api:latest
USER root
COPY helpers/comtur-upload.js /app/helpers/comtur-upload.js
USER node
EOF
docker build -t api-semit-api:comtur-upload-fix -f /tmp/Dockerfile.comtur-upload-fix "$OPS"
docker tag api-semit-api:comtur-upload-fix api-semit-api:latest
cd "$WORKDIR"
docker compose up -d --no-deps --force-recreate api
for _ in $(seq 1 40); do
  st=$(docker inspect api --format '{{if .State.Health}}{{.State.Health.Status}}{{else}}{{.State.Status}}{{end}}')
  if [[ "$st" == "healthy" ]]; then echo API_HEALTHY; break; fi
  sleep 2
done
docker exec api grep -n "antivírus lento" /app/helpers/comtur-upload.js | head
echo UPLOAD_FIX_OK
