#!/usr/bin/env bash
set -euo pipefail
SRC=/tmp/comtur-doc-edit
OPS=/home/semit/Documentos/api-semit/backend
PUBLIC="$OPS/public"
install -m 644 "$SRC/comtur-meetings-admin.html" "$PUBLIC/comtur-meetings-admin.html"
install -m 644 "$SRC/ComturMeetingController.js" "$OPS/controllers/ComturMeetingController.js"
if [[ -d /home/semit/Documentos/api-gestao-publica/backend ]]; then
  install -m 644 "$SRC/ComturMeetingController.js" /home/semit/Documentos/api-gestao-publica/backend/controllers/ComturMeetingController.js || true
  install -m 644 "$SRC/comtur-meetings-admin.html" /home/semit/Documentos/api-gestao-publica/backend/public/comtur-meetings-admin.html || true
fi
WORKDIR=$(docker inspect api --format '{{index .Config.Labels "com.docker.compose.project.working_dir"}}')
cat > /tmp/Dockerfile.comtur-doc-edit <<'EOF'
FROM api-semit-api:latest
USER root
COPY controllers/ComturMeetingController.js /app/controllers/ComturMeetingController.js
USER node
EOF
docker build -t api-semit-api:comtur-doc-edit -f /tmp/Dockerfile.comtur-doc-edit "$OPS"
docker tag api-semit-api:comtur-doc-edit api-semit-api:latest
cd "$WORKDIR"
docker compose up -d --no-deps --force-recreate api
for _ in $(seq 1 40); do
  st=$(docker inspect api --format '{{if .State.Health}}{{.State.Health.Status}}{{else}}{{.State.Status}}{{end}}')
  if [[ "$st" == "healthy" ]]; then echo API_HEALTHY; break; fi
  sleep 2
done
docker exec api grep -n "archived" /app/controllers/ComturMeetingController.js | head
docker cp "$PUBLIC/comtur-meetings-admin.html" api:/app/public/comtur-meetings-admin.html || true
echo DOC_EDIT_OK
