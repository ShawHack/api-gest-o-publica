#!/bin/bash
set -euo pipefail
echo "=== current api IP vs nginx cached ==="
docker inspect api --format 'api_ip={{range .NetworkSettings.Networks}}{{.IPAddress}}{{end}}'
# resolve api from nginx container
docker exec nginx getent hosts api || docker exec nginx nslookup api || true
docker exec nginx wget -qO- --timeout=3 http://api:5000/health 2>&1 | head -5 || true
docker exec nginx wget -qO- --timeout=3 http://172.20.0.16:5000/health 2>&1 | head -5 || true
docker exec nginx wget -qO- --timeout=3 http://172.20.0.8:5000/health 2>&1 | head -5 || true

echo "=== nginx reload to refresh upstream DNS ==="
docker exec nginx nginx -t && docker exec nginx nginx -s reload
sleep 1
docker exec nginx wget -qO- --timeout=3 http://api:5000/health 2>&1 | head -5 || true
curl -sk -o /dev/null -w "health:%{http_code}\n" https://127.0.0.1/health || true
