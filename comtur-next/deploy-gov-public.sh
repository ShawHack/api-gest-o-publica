#!/usr/bin/env bash
set -euo pipefail
SRC=/tmp/comtur-gov-public
OPS=/home/semit/Documentos/api-semit/backend
CANON=/home/semit/Documentos/api-gestao-publica/backend
PUBLIC=/home/semit/Documentos/api-semit/backend/public
install -m 644 "$SRC/controllers/ComturContentController.js" "$OPS/controllers/ComturContentController.js"
install -m 644 "$SRC/controllers/ComturContentController.js" "$CANON/controllers/ComturContentController.js"
install -m 644 "$SRC/turismo/index.html" "$PUBLIC/turismo/index.html"
install -m 644 "$SRC/turismo/assets/"*.js "$PUBLIC/turismo/assets/"
install -m 644 "$SRC/turismo/assets/"*.css "$PUBLIC/turismo/assets/"
WORKDIR=$(docker inspect api --format '{{index .Config.Labels "com.docker.compose.project.working_dir"}}')
cat > /tmp/Dockerfile.comtur-gov-public <<'EOF'
FROM api-semit-api:latest
USER root
COPY controllers/ComturContentController.js /app/controllers/ComturContentController.js
USER node
EOF
docker build -t api-semit-api:comtur-gov-public -f /tmp/Dockerfile.comtur-gov-public "$OPS"
docker tag api-semit-api:comtur-gov-public api-semit-api:latest
cd "$WORKDIR"
docker compose up -d --no-deps --force-recreate api
for _ in $(seq 1 40); do
  st=$(docker inspect api --format '{{if .State.Health}}{{.State.Health.Status}}{{else}}{{.State.Status}}{{end}}')
  if [[ "$st" == "healthy" ]]; then echo API_HEALTHY; break; fi
  sleep 2
done
curl -fsS "http://127.0.0.1:5000/api/comtur/content?type=council_member&limit=5" | python3 -c "import sys,json; d=json.load(sys.stdin); print('MEMBERS', len(d.get('data') or []), [(i.get('slug'), i.get('status')) for i in (d.get('data') or [])])"
echo GOV_PUBLIC_OK
