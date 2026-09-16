#!/bin/bash
echo "=== host helper ==="
grep -n "showOnPortal" /home/semit/Documentos/api-semit/backend/helpers/comtur-content.js | head
echo "=== container helper ==="
docker exec api grep -n "showOnPortal" /app/helpers/comtur-content.js | head
echo "=== container controller ==="
docker exec api grep -o "showOnPortal" /app/controllers/ComturContentController.js | head
echo "=== which index ==="
docker exec api sh -c 'ls -l /app/index.js /app/server.js; head -5 /app/package.json'
docker exec api sh -c 'cat package.json | grep -E "\"start\"|\"main\""'
# force reload by touching and restart again
docker restart api
sleep 5
curl -sk "https://127.0.0.1/api/comtur/content?type=integration&limit=5" | python3 -c "import sys,json; d=json.load(sys.stdin); print('slugs', [i['slug'] for i in d.get('data',[])]); print('show',[i['metadata'].get('showOnPortal') for i in d.get('data',[])])"
curl -sk -o /dev/null -w "HIDDEN:%{http_code}\n" "https://127.0.0.1/api/comtur/content/interna-oculta-1789491743472"
