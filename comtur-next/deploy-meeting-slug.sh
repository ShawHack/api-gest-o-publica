#!/usr/bin/env bash
set -euo pipefail
SRC=/tmp/comtur-slug
OPS=/home/semit/Documentos/api-semit/backend
PUBLIC=/home/semit/Documentos/api-semit/backend/public
install -m 644 "$SRC/comtur-meetings-admin.html" "$PUBLIC/comtur-meetings-admin.html"
install -m 644 "$SRC/comtur-query.js" "$OPS/helpers/comtur-query.js"
WORKDIR=$(docker inspect api --format '{{index .Config.Labels "com.docker.compose.project.working_dir"}}')
cat > /tmp/Dockerfile.comtur-slug <<'EOF'
FROM api-semit-api:latest
USER root
COPY helpers/comtur-query.js /app/helpers/comtur-query.js
USER node
EOF
docker build -t api-semit-api:comtur-slug -f /tmp/Dockerfile.comtur-slug "$OPS"
docker tag api-semit-api:comtur-slug api-semit-api:latest
cd "$WORKDIR"
docker compose up -d --no-deps --force-recreate api
for _ in $(seq 1 30); do
  st=$(docker inspect api --format '{{if .State.Health}}{{.State.Health.Status}}{{else}}{{.State.Status}}{{end}}')
  if [[ "$st" == "healthy" ]]; then echo API_HEALTHY; break; fi
  sleep 2
done
echo SLUG_AUTO_OK
