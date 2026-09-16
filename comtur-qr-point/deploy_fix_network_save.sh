#!/bin/bash
set -euo pipefail

HOST_BACKEND=/home/semit/Documentos/api-semit/backend
HOST_HELPERS=/home/semit/Documentos/api-semit/helpers
# also sync backend/helpers if that is the mount path
if [ -d /home/semit/Documentos/api-semit/backend/helpers ]; then
  HOST_HELPERS=/home/semit/Documentos/api-semit/backend/helpers
fi

echo "=== deploy files ==="
cp -a /tmp/comtur-content-admin.server.html "$HOST_BACKEND/public/comtur-content-admin.html"
cp -a /tmp/comtur-content.js "$HOST_HELPERS/comtur-content.js"

# Find helper path actually used by container
docker exec -i -w /app api node <<'NODE'
const fs = require('fs');
const paths = [
  '/app/helpers/comtur-content.js',
  '/app/backend/helpers/comtur-content.js',
];
for (const p of paths) {
  console.log(p, fs.existsSync(p) ? 'EXISTS' : 'missing');
}
NODE

echo "=== docker cp into api ==="
docker cp /tmp/comtur-content-admin.server.html api:/app/public/comtur-content-admin.html
docker cp /tmp/comtur-content.js api:/app/helpers/comtur-content.js

echo "=== verify cache + sanitize + saveContent ==="
python3 - <<'PY'
from pathlib import Path
a = Path('/home/semit/Documentos/api-semit/backend/public/comtur-content-admin.html').read_text(encoding='utf-8')
assert 'content="v26"' in a, 'cache bust missing'
assert 'blob:' in a and 'sanitizeMediaList' in a
assert 'Salvo com sucesso, mas a lista não atualizou' in a
assert 'rawText' in a or 'JSON.parse(rawText)' in a
print('admin HTML OK v26')
PY

docker exec -i -w /app api node <<'NODE'
const { normalize } = require('./helpers/comtur-content');
const samples = [
  { kind:'image', url:'/images/comtur/test.jpg', title:'x', mimeType:'image/jpeg' },
  { kind:'image', url:'/images/comtur/Captura de tela 2026.jpg', title:'x', mimeType:'image/jpeg' },
  { kind:'image', url:'/images/comtur/Captura%20de%20tela%202026.jpg', title:'x', mimeType:'image/jpeg' },
  { type:'image', url:'/images/comtur/test.jpg', title:'x' },
  { kind:'image', url:'blob:https://x/abc', title:'x' },
];
for (const m of samples) {
  const r = normalize({ type:'gastronomy', slug:'teste-gastro', title:'Teste', media:[m] }, true);
  console.log((r.error || 'OK').padEnd(16), JSON.stringify(m.url).slice(0,80));
}
NODE

echo "=== restart api then reload nginx (DNS) ==="
docker restart api
# wait healthy
for i in $(seq 1 30); do
  st=$(docker inspect api --format '{{.State.Health.Status}}{{.State.Status}}' 2>/dev/null || echo starting)
  echo "wait $i: $st"
  echo "$st" | grep -q healthy && break
  sleep 2
done
docker exec nginx nginx -t
docker exec nginx nginx -s reload
sleep 1
API_IP=$(docker inspect api --format '{{range .NetworkSettings.Networks}}{{.IPAddress}}{{end}}')
echo "api_ip=$API_IP"
docker exec nginx getent hosts api || true
curl -sk -o /dev/null -w "health:%{http_code}\n" https://127.0.0.1/health || true
curl -sk -o /dev/null -w "admin_html:%{http_code}\n" "https://127.0.0.1/comtur-content-admin.html?type=gastronomy&v=26" || true
echo DONE
