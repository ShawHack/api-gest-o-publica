#!/usr/bin/env bash
set -euo pipefail
SRC=/tmp/admin-comtur
OPS=/home/semit/Documentos/api-semit/backend
CANON=/home/semit/Documentos/api-gestao-publica/backend
python3 "$SRC/patch_admin_comtur_role.py"
install -m 644 "$SRC/helpers/comtur-roles.js" "$OPS/helpers/comtur-roles.js"
install -m 644 "$SRC/helpers/comtur-roles.js" "$CANON/helpers/comtur-roles.js"
install -m 644 "$SRC/routes/ComturRoutes.js" "$OPS/routes/ComturRoutes.js"
install -m 644 "$SRC/routes/ComturRoutes.js" "$CANON/routes/ComturRoutes.js"
WORKDIR=$(docker inspect api --format '{{index .Config.Labels "com.docker.compose.project.working_dir"}}')
cat > /tmp/Dockerfile.admin-comtur <<'EOF'
FROM api-semit-api:latest
USER root
COPY models/User.js /app/models/User.js
COPY controllers/UserController.js /app/controllers/UserController.js
COPY helpers/comtur-roles.js /app/helpers/comtur-roles.js
COPY routes/ComturRoutes.js /app/routes/ComturRoutes.js
USER node
EOF
docker build -t api-semit-api:admin-comtur -f /tmp/Dockerfile.admin-comtur "$OPS"
docker tag api-semit-api:admin-comtur api-semit-api:latest
cd "$WORKDIR"
docker compose up -d --no-deps --force-recreate api
for _ in $(seq 1 30); do
  st=$(docker inspect api --format '{{if .State.Health}}{{.State.Health.Status}}{{else}}{{.State.Status}}{{end}}')
  if [[ "$st" == "healthy" ]]; then echo API_HEALTHY; break; fi
  sleep 2
done
docker exec api grep -n admin_comtur /app/models/User.js /app/controllers/UserController.js /app/routes/ComturRoutes.js | head
curl -fsS http://127.0.0.1:5000/health; echo
echo ROLE_DEPLOY_OK
