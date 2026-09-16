#!/bin/bash
set -e
# copy patched host files into running api container
docker cp /home/semit/Documentos/api-semit/backend/helpers/comtur-content.js api:/app/helpers/comtur-content.js
docker cp /home/semit/Documentos/api-semit/backend/controllers/ComturContentController.js api:/app/controllers/ComturContentController.js
echo "COPIED"
docker exec api grep -n "showOnPortal" /app/helpers/comtur-content.js | head
docker exec api grep -o "showOnPortal" /app/controllers/ComturContentController.js | head
docker restart api
sleep 5
echo "LIST:"
curl -sk "https://127.0.0.1/api/comtur/content?type=integration&limit=10" | python3 -c "import sys,json; d=json.load(sys.stdin); print([ (i['slug'], i['metadata'].get('showOnPortal')) for i in d.get('data',[]) ])"
echo -n "HIDDEN:"; curl -sk -o /dev/null -w "%{http_code}\n" "https://127.0.0.1/api/comtur/content/interna-oculta-1789491743472"
echo -n "PUB:"; curl -sk -o /dev/null -w "%{http_code}\n" "https://127.0.0.1/api/comtur/content/mapaturistico-1789491743472"
