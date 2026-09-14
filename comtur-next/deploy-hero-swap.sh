#!/usr/bin/env bash
set -euo pipefail
SRC=/tmp/comtur-hero-swap
OPS=/home/semit/Documentos/api-semit/backend
CANON=/home/semit/Documentos/api-gestao-publica/backend
PUBLIC=/home/semit/Documentos/api-semit/backend/public
install -m 644 "$SRC/ComturBrandingController.js" "$OPS/controllers/ComturBrandingController.js"
install -m 644 "$SRC/ComturBrandingController.js" "$CANON/controllers/ComturBrandingController.js" || true
install -m 644 "$SRC/comtur-branding-admin.html" "$PUBLIC/comtur-branding-admin.html"
install -m 644 "$SRC/index.html" "$PUBLIC/turismo/index.html"
install -m 644 "$SRC/assets/"*.css "$PUBLIC/turismo/assets/"
install -m 644 "$SRC/assets/"*.js "$PUBLIC/turismo/assets/"
WORKDIR=$(docker inspect api --format '{{index .Config.Labels "com.docker.compose.project.working_dir"}}')
cat > /tmp/Dockerfile.comtur-hero <<'EOF'
FROM api-semit-api:latest
USER root
COPY controllers/ComturBrandingController.js /app/controllers/ComturBrandingController.js
USER node
EOF
docker build -t api-semit-api:comtur-hero -f /tmp/Dockerfile.comtur-hero "$OPS"
docker tag api-semit-api:comtur-hero api-semit-api:latest
cd "$WORKDIR"
docker compose up -d --no-deps --force-recreate api
for _ in $(seq 1 30); do
  st=$(docker inspect api --format '{{if .State.Health}}{{.State.Health.Status}}{{else}}{{.State.Status}}{{end}}')
  if [[ "$st" == "healthy" ]]; then echo API_HEALTHY; break; fi
  sleep 2
done
docker cp "$SRC/set-latest-hero.js" api:/tmp/set-latest-hero.js
docker exec -w /app api node /tmp/set-latest-hero.js
curl -fsS http://127.0.0.1:5000/api/comtur/branding; echo
echo HERO_SWAP_OK
