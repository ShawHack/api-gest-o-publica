#!/bin/bash
set -euo pipefail

echo "=== find sd_docs compose with service name api ==="
grep -RIn --include='docker-compose*.yml' --include='compose*.yml' -E 'container_name:\s*sd_docs-api|^\s+api:' /home/semit/Documentos /home/docker-data /opt 2>/dev/null | head -40 || true
find /home/semit -name 'docker-compose*.yml' 2>/dev/null | while read f; do
  if grep -q 'sd_docs-api' "$f" 2>/dev/null; then echo "FILE $f"; grep -nE 'sd_docs|^\s+api:|container_name|aliases' "$f" | head -40; fi
done

echo "=== remove conflicting alias by reconnecting ==="
# Disconnect and reconnect with only sd_docs-api alias (no bare 'api')
docker network disconnect api-semit_stack sd_docs-api || true
docker network connect --alias sd_docs-api api-semit_stack sd_docs-api

echo "=== verify DNS from nginx ==="
sleep 1
docker exec nginx getent hosts api
docker exec nginx getent hosts sd_docs-api
# Should be only one A record for api -> real api
API_RESOLVE=$(docker exec nginx getent hosts api | awk '{print $1}')
REAL_API=$(docker inspect api --format '{{range .NetworkSettings.Networks}}{{.IPAddress}}{{end}}')
echo "resolved=$API_RESOLVE real=$REAL_API"
if [ "$API_RESOLVE" != "$REAL_API" ]; then
  echo "FAIL still wrong"; exit 1
fi

# Confirm no dual answers
COUNT=$(docker exec nginx getent ahosts api | awk '/STREAM/{print $1}' | sort -u | wc -l)
echo "unique_api_ips=$COUNT"
docker exec nginx getent ahosts api || true

curl -sk -o /dev/null -w "health:%{http_code}\n" https://127.0.0.1/health
curl -sk -o /dev/null -w "sd_docs:%{http_code}\n" https://127.0.0.1/docs/ 2>/dev/null || true
echo DONE
