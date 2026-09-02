#!/usr/bin/env bash
# Deploy multi-painéis Agenda Garça — API (.28) + agenda-web + painel (.31)
set -euo pipefail

SSH_KEY="${SSH_KEY:-$HOME/.ssh/id_ed25519_api_semit}"
SSH_OPTS=(-i "$SSH_KEY" -o StrictHostKeyChecking=no)
API_HOST="semit@10.15.25.28"
PANEL_HOST="semit@10.15.25.31"
BASE="$(cd "$(dirname "$0")" && pwd)"
REMOTE_API="~/Documentos/api-semit/backend"

echo "== 1. API (.28): helpers, controller, model =="
scp "${SSH_OPTS[@]}" \
  "$BASE/backend/helpers/panel-resolver.js" \
  "$BASE/backend/helpers/panel-service.js" \
  "$BASE/backend/controllers/AgendaController.js" \
  "$BASE/backend/models/AgendaService.js" \
  "$API_HOST:$REMOTE_API/helpers/" 2>/dev/null || true

scp "${SSH_OPTS[@]}" \
  "$BASE/backend/helpers/panel-resolver.js" \
  "$API_HOST:$REMOTE_API/helpers/panel-resolver.js"

scp "${SSH_OPTS[@]}" \
  "$BASE/backend/helpers/panel-service.js" \
  "$API_HOST:$REMOTE_API/helpers/panel-service.js"

scp "${SSH_OPTS[@]}" \
  "$BASE/backend/controllers/AgendaController.js" \
  "$API_HOST:$REMOTE_API/controllers/AgendaController.js"

scp "${SSH_OPTS[@]}" \
  "$BASE/backend/models/AgendaService.js" \
  "$API_HOST:$REMOTE_API/models/AgendaService.js"

ssh "${SSH_OPTS[@]}" "$API_HOST" bash -s <<'REMOTE'
set -euo pipefail
REMOTE_BASE=~/Documentos/api-semit/backend
docker cp "$REMOTE_BASE/helpers/panel-resolver.js" api:/app/helpers/panel-resolver.js
docker cp "$REMOTE_BASE/helpers/panel-service.js" api:/app/helpers/panel-service.js
docker cp "$REMOTE_BASE/controllers/AgendaController.js" api:/app/controllers/AgendaController.js
docker cp "$REMOTE_BASE/models/AgendaService.js" api:/app/models/AgendaService.js
docker restart api
sleep 10
docker inspect api --format='{{.State.Health.Status}}' 2>/dev/null || docker ps --filter name=api --format '{{.Status}}'
curl -sf "http://127.0.0.1:5000/api/agenda/public/panels/calls?slug=semit" | head -c 120 || true
echo
REMOTE

echo "== 2. Agenda web (.28): build estático =="
ssh "${SSH_OPTS[@]}" "$API_HOST" "mkdir -p ~/Documentos/api-semit/backend/public/agendamentos"
scp -r "${SSH_OPTS[@]}" "$BASE/agenda-web/dist/." \
  "$API_HOST:~/Documentos/api-semit/backend/public/agendamentos/"

ssh "${SSH_OPTS[@]}" "$API_HOST" bash -s <<'AGENDA'
set -euo pipefail
AGENDA_DIR=~/Documentos/api-semit/backend/public/agendamentos
find "$AGENDA_DIR" -type d -exec chmod 755 {} \;
find "$AGENDA_DIR" -type f -exec chmod 644 {} \;
echo "Permissões agenda-web OK (755 dirs / 644 arquivos)"
AGENDA

echo "== 3. Painel TV (.31): painel.ts =="
PANEL_REMOTE="~/Documentos/painel_senhas_work/services/api"
ssh "${SSH_OPTS[@]}" "$PANEL_HOST" "mkdir -p $PANEL_REMOTE"
scp "${SSH_OPTS[@]}" \
  "$BASE/../painel_senhas_work/services/api/painel.ts" \
  "$PANEL_HOST:$PANEL_REMOTE/painel.ts"

ssh "${SSH_OPTS[@]}" "$PANEL_HOST" bash -s <<'PANEL'
set -euo pipefail
cd ~/Documentos/painel_senhas_work 2>/dev/null || cd ~/painel_senhas_work 2>/dev/null || { echo "painel_senhas_work não encontrado"; exit 1; }
if docker compose ps --format '{{.Name}}' 2>/dev/null | grep -q painel; then
  docker compose build --no-cache painel-semit 2>/dev/null || docker compose build painel-semit
  docker compose up -d painel-semit
else
  echo "Container painel não encontrado — copie painel.ts manualmente e rebuild"
fi
PANEL

echo "== Deploy multi-painéis concluído =="
