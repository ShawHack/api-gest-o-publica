#!/usr/bin/env bash
# Corrige notify-status (segredo) + republica painel web iluminacao.
set -euo pipefail
PROJECT=/home/semit/Documentos/api-semit
LOG=/tmp/fix-status-notify.log
exec >"$LOG" 2>&1
export PATH="$HOME/development/flutter/bin:$HOME/flutter/bin:$PATH"

echo "=== INICIO $(date -Is) ==="
cd "$PROJECT"

SECRET="$(grep -E '^ILUMINACAO_NOTIFY_SECRET=' backend/.env | head -1 | cut -d= -f2- | tr -d '\r' | sed 's/^["'\'']//;s/["'\'']$//')"
if [ -z "$SECRET" ]; then
  echo "[ERRO] ILUMINACAO_NOTIFY_SECRET ausente"
  exit 1
fi
echo "secret_len=${#SECRET}"

echo "=== BUILD api ==="
docker compose build api 2>&1 | tail -30
docker compose up -d api 2>&1 | tail -15

for i in $(seq 1 36); do
  st=$(docker inspect -f '{{.State.Health.Status}}' api 2>/dev/null || echo starting)
  echo "health=$st ($i)"
  [ "$st" = "healthy" ] && break
  sleep 5
done
docker compose exec -T nginx nginx -s reload && echo RELOAD_OK

echo "=== ROUTE in container ==="
docker compose exec -T api cat routes/IluminacaoRoutes.js

echo "=== SYNC flutter source ==="
APP="$PROJECT/full/prefeitura_app-main"
test -f "$APP/lib/features/iluminacao_publica/data/services/iluminacao_notification_service.dart"

echo "=== BUILD web iluminacao ==="
cd "$APP"
flutter pub get
flutter build web --release \
  --base-href=/iluminacao/ \
  --target=lib/main_iluminacao.dart \
  --dart-define=API_BASE_URL=https://api.garca.sp.gov.br/api \
  --dart-define=ILUMINACAO_NOTIFY_SECRET="$SECRET"

WEB_OUT="$APP/build/web"
DEST1="$PROJECT/frontend/build/iluminacao"
DEST2="$PROJECT/backend/public/iluminacao"
mkdir -p "$DEST1" "$DEST2"
rsync -a --delete "$WEB_OUT/" "$DEST1/"
rsync -a --delete "$WEB_OUT/" "$DEST2/"
echo "published to $DEST1 and $DEST2"

# sanity: secret fragment in main.dart.js
python3 - <<PY
import pathlib
frag=open("$PROJECT/backend/.env").read()
import re
m=re.search(r"^ILUMINACAO_NOTIFY_SECRET=(.+)$",frag,re.M)
s=(m.group(1).strip().strip('"').strip("'") if m else "")
js=pathlib.Path("$DEST1/main.dart.js").read_text(errors="ignore")
print("web_has_secret", s[:8] in js if s else False)
print("web_has_notify_status", "notify-status" in js)
print("web_skip_msg_old", "Sem token de admin para enviar" in js)
print("web_skip_msg_new", "Sem ILUMINACAO_NOTIFY_SECRET nem token" in js)
PY

echo "=== TEST notify-status with secret ==="
RID="status-test-$(date +%s)"
curl -sS -o /tmp/st.json -w "CODE=%{http_code}\n" --max-time 30 \
  -X POST "https://api.garca.sp.gov.br/api/iluminacao/reports/${RID}/notify-status" \
  -H "Content-Type: application/json" \
  -H "x-iluminacao-notify-key: ${SECRET}" \
  -d '{"previousStatus":"received","newStatus":"resolved","protocol":"ILU-STATUS-TEST","reporterName":"Saulo","reporterPhone":"14981122378","poleId":"993","address":"AV LABIENO DA COSTA MACHADO","problemType":"queimada","notifyByEmail":false,"notifyByWhatsapp":true,"resolutionDetails":"Teste resolucao com capa"}'
head -c 1000 /tmp/st.json; echo
sleep 6
docker compose logs --since 1m job-worker 2>/dev/null | tail -15

echo "=== FIM $(date -Is) ==="
