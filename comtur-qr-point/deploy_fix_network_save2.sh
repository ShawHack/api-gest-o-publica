#!/bin/bash
set -euo pipefail

echo "=== api mounts ==="
docker inspect api --format '{{range .Mounts}}{{.Source}} -> {{.Destination}} ({{.Mode}}){{println}}{{end}}'

echo "=== locate comtur-content.js on host ==="
find /home/semit/Documentos/api-semit -name 'comtur-content.js' 2>/dev/null | head -20

echo "=== deploy to bind mounts ==="
# HTML
cp -a /tmp/comtur-content-admin.server.html /home/semit/Documentos/api-semit/backend/public/comtur-content-admin.html

# Helper: try common locations
for p in \
  /home/semit/Documentos/api-semit/backend/helpers/comtur-content.js \
  /home/semit/Documentos/api-semit/helpers/comtur-content.js
do
  if [ -f "$p" ] || [ -d "$(dirname "$p")" ]; then
    echo "writing $p"
    cp -a /tmp/comtur-content.js "$p"
  fi
done

# Verify container sees updated files via bind mount
docker exec api sh -c 'grep -n "blob:" /app/helpers/comtur-content.js | head -3'
docker exec api sh -c 'grep -n "content=\"v26\"" /app/public/comtur-content-admin.html | head -2'
docker exec api sh -c 'grep -c "Salvo com sucesso, mas a lista" /app/public/comtur-content-admin.html'

echo "=== normalize check (may need restart for require cache) ==="
docker restart api
for i in $(seq 1 40); do
  st=$(docker inspect api --format '{{if .State.Health}}{{.State.Health.Status}}{{else}}{{.State.Status}}{{end}}')
  echo "wait $i: $st"
  [ "$st" = "healthy" ] && break
  [ "$st" = "running" ] && [ $i -gt 8 ] && break
  sleep 2
done

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

echo "=== nginx reload after new API IP ==="
API_IP=$(docker inspect api --format '{{range .NetworkSettings.Networks}}{{.IPAddress}}{{end}}')
echo "api_ip=$API_IP"
docker exec nginx nginx -t
docker exec nginx nginx -s reload
sleep 1
docker exec nginx getent hosts api || true
curl -sk -o /dev/null -w "health:%{http_code}\n" https://127.0.0.1/health || true
curl -sk https://127.0.0.1/comtur-content-admin.html 2>/dev/null | grep -o 'comtur-admin-cache-bust" content="v[0-9]*"' | head -1
echo DONE
