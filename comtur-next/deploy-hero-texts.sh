#!/usr/bin/env bash
set -euo pipefail
SRC=/tmp/comtur-hero-texts
OPS=/home/semit/Documentos/api-semit/backend
CANON=/home/semit/Documentos/api-gestao-publica/backend
PUBLIC=/home/semit/Documentos/api-semit/backend/public
install -m 644 "$SRC/helpers/comtur-branding.js" "$OPS/helpers/comtur-branding.js"
install -m 644 "$SRC/helpers/comtur-branding.js" "$CANON/helpers/comtur-branding.js"
install -m 644 "$SRC/portal/comtur-branding-admin.html" "$PUBLIC/comtur-branding-admin.html"
install -m 644 "$SRC/portal/comtur-admin-nav.js" "$PUBLIC/comtur-admin-nav.js"
install -m 644 "$SRC/turismo/index.html" "$PUBLIC/turismo/index.html"
install -m 644 "$SRC/turismo/assets/"*.js "$PUBLIC/turismo/assets/"
install -m 644 "$SRC/turismo/assets/"*.css "$PUBLIC/turismo/assets/"
python3 "$SRC/patch_nginx_branding_alias.py"
WORKDIR=$(docker inspect api --format '{{index .Config.Labels "com.docker.compose.project.working_dir"}}')
cat > /tmp/Dockerfile.comtur-hero-texts <<'EOF'
FROM api-semit-api:latest
USER root
COPY helpers/comtur-branding.js /app/helpers/comtur-branding.js
COPY public/comtur-branding-admin.html /app/public/comtur-branding-admin.html
USER node
EOF
mkdir -p "$OPS/public"
install -m 644 "$SRC/portal/comtur-branding-admin.html" "$OPS/public/comtur-branding-admin.html"
docker build -t api-semit-api:comtur-hero-texts -f /tmp/Dockerfile.comtur-hero-texts "$OPS"
docker tag api-semit-api:comtur-hero-texts api-semit-api:latest
cd "$WORKDIR"
docker compose up -d --no-deps --force-recreate api
docker exec nginx nginx -t
docker exec nginx nginx -s reload
for _ in $(seq 1 40); do
  st=$(docker inspect api --format '{{if .State.Health}}{{.State.Health.Status}}{{else}}{{.State.Status}}{{end}}')
  if [[ "$st" == "healthy" ]]; then echo API_HEALTHY; break; fi
  sleep 2
done
docker exec api node -e "const {normalizeBranding}=require('/app/helpers/comtur-branding'); const r=normalizeBranding({organizationName:'A',councilName:'B',portalTitle:'C',heroLead:'  capa  '}); if(r.value.heroLead!=='capa') process.exit(1); console.log('HERO_LEAD_OK')"
echo HERO_TEXTS_OK
