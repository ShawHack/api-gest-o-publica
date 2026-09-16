#!/bin/bash
set -euo pipefail

echo "=== who has 172.20.0.16 ==="
docker network inspect api-semit_stack --format '{{range .Containers}}{{.Name}} {{.IPv4Address}}{{println}}{{end}}' | sort

echo "=== nginx /etc/hosts and resolv ==="
docker exec nginx cat /etc/hosts | head -40
docker exec nginx cat /etc/resolv.conf
docker exec nginx getent hosts api || true
docker exec nginx ping -c1 -W1 api 2>&1 | head -5 || true

echo "=== try docker cp helper only (not public) ==="
docker cp /tmp/comtur-content.js api:/app/helpers/comtur-content.js
docker exec api grep -n "blob:" /app/helpers/comtur-content.js | head -3

echo "=== restart api to reload helper ==="
docker restart api
for i in $(seq 1 30); do
  st=$(docker inspect api --format '{{if .State.Health}}{{.State.Health.Status}}{{else}}{{.State.Status}}{{end}}')
  echo "wait $i: $st"
  [ "$st" = "healthy" ] && break
  sleep 2
done
NEW_IP=$(docker inspect api --format '{{range .NetworkSettings.Networks}}{{.IPAddress}}{{end}}')
echo "new_api_ip=$NEW_IP"

echo "=== recreate nginx to refresh DNS cache of embedded resolver ==="
# Prefer compose recreate if available
cd /home/semit/Documentos/api-semit
if docker compose ps nginx >/dev/null 2>&1; then
  docker compose up -d --force-recreate --no-deps nginx
else
  docker restart nginx
fi
sleep 2
docker exec nginx getent hosts api || true
docker exec nginx wget -qO- --timeout=3 http://api:5000/health 2>&1 | head -3 || true
curl -sk -o /dev/null -w "health:%{http_code}\n" https://127.0.0.1/health || true

echo "=== normalize after helper update ==="
docker exec -i -w /app api node <<'NODE'
const { normalize } = require('./helpers/comtur-content');
for (const m of [
  { kind:'image', url:'/images/comtur/test.jpg', title:'x', mimeType:'image/jpeg' },
  { kind:'image', url:'/images/comtur/Captura de tela 2026.jpg', title:'x', mimeType:'image/jpeg' },
  { kind:'image', url:'/images/comtur/Captura%20de%20tela%202026.jpg', title:'x', mimeType:'image/jpeg' },
  { type:'image', url:'/images/comtur/test.jpg', title:'x' },
  { kind:'image', url:'blob:https://x/abc', title:'x' },
]) {
  const r = normalize({ type:'gastronomy', slug:'teste-gastro', title:'Teste', media:[m] }, true);
  console.log((r.error || 'OK').padEnd(16), m.url);
}
NODE
echo DONE
