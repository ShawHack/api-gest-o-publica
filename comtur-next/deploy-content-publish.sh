#!/usr/bin/env bash
set -euo pipefail
SRC=/tmp/comtur-content-publish
OPS=/home/semit/Documentos/api-semit/backend
CANON=/home/semit/Documentos/api-gestao-publica/backend
PUBLIC=/home/semit/Documentos/api-semit/backend/public
install -m 644 "$SRC/helpers/comtur-content.js" "$OPS/helpers/comtur-content.js"
install -m 644 "$SRC/helpers/comtur-content.js" "$CANON/helpers/comtur-content.js"
install -m 644 "$SRC/portal/comtur-content-admin.html" "$PUBLIC/comtur-content-admin.html"
WORKDIR=$(docker inspect api --format '{{index .Config.Labels "com.docker.compose.project.working_dir"}}')
cat > /tmp/Dockerfile.comtur-content-publish <<'EOF'
FROM api-semit-api:latest
USER root
COPY helpers/comtur-content.js /app/helpers/comtur-content.js
USER node
EOF
docker build -t api-semit-api:comtur-content-publish -f /tmp/Dockerfile.comtur-content-publish "$OPS"
docker tag api-semit-api:comtur-content-publish api-semit-api:latest
cd "$WORKDIR"
docker compose up -d --no-deps --force-recreate api
for _ in $(seq 1 40); do
  st=$(docker inspect api --format '{{if .State.Health}}{{.State.Health.Status}}{{else}}{{.State.Status}}{{end}}')
  if [[ "$st" == "healthy" ]]; then echo API_HEALTHY; break; fi
  sleep 2
done
docker exec api node -e "const {canTransition}=require('/app/helpers/comtur-content'); if(!canTransition('draft','published')) process.exit(1); console.log('DRAFT_TO_PUBLISHED_OK')"
curl -fsS http://127.0.0.1:5000/health; echo
echo CONTENT_PUBLISH_OK
