#!/bin/bash
set -euo pipefail
echo "=== containers ==="
docker ps --format '{{.Names}} {{.Status}}' | grep -iE '^(api|nginx|sd_docs)' || true
echo "=== dns api ==="
docker exec nginx getent hosts api 2>/dev/null || echo 'nginx dns fail'
docker exec nginx getent hosts sd_docs-api 2>/dev/null || echo 'sd_docs dns fail'
echo "=== http ==="
curl -sk -o /dev/null -w "health:%{http_code}\n" https://127.0.0.1/health || true
curl -sk -o /dev/null -w "admin:%{http_code}\n" https://127.0.0.1/comtur-content-admin.html || true
curl -sk -o /dev/null -w "sd_docs_api_direct:%{http_code}\n" http://127.0.0.1:3001/ 2>/dev/null || docker exec sd_docs-api wget -qO- --timeout=2 http://127.0.0.1:3001/health 2>&1 | head -3 || true
# network membership
echo "=== sd_docs-api networks ==="
docker inspect sd_docs-api --format '{{range $k,$v := .NetworkSettings.Networks}}{{$k}} ip={{$v.IPAddress}} aliases={{json $v.Aliases}} dns={{json $v.DNSNames}}{{println}}{{end}}'
echo "=== api aliases ==="
docker inspect api --format '{{range $k,$v := .NetworkSettings.Networks}}{{$k}} ip={{$v.IPAddress}} dns={{json $v.DNSNames}}{{println}}{{end}}'
