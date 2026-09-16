#!/bin/bash
set -e
python3 - <<'PY'
from pathlib import Path
admin=Path('/home/semit/Documentos/api-semit/backend/public/comtur-content-admin.html').read_text(encoding='utf-8')
checks=['id="integrationFields"',"'integration': 'integrationFields'",'Nenhuma integração cadastrada','item.type === \'integration\'','noSecrets','Não armazene chaves']
for c in checks: print(('OK' if c in admin else 'MISS'), c)
s=admin.find('specializedMap = {'); e=admin.find('};',s); print(admin[s:e+2])
PY

docker cp /tmp/insert_integration_test.js api:/app/insert_integration_test.js
OUT=$(docker exec -w /app api node /app/insert_integration_test.js)
echo "$OUT"
SLUG=$(python3 -c 'import json,sys; print(json.loads(sys.argv[1])["slug"])' "$OUT")
HIDDEN=$(python3 -c 'import json,sys; print(json.loads(sys.argv[1])["hiddenSlug"])' "$OUT")
DRAFT=$(python3 -c 'import json,sys; print(json.loads(sys.argv[1])["draftSlug"])' "$OUT")

echo "=== API LIST ==="
curl -sk "https://127.0.0.1/api/comtur/content?type=integration&limit=20" | python3 -c 'import sys,json; d=json.load(sys.stdin); print([(i["slug"], (i.get("metadata") or {}).get("showOnPortal")) for i in d.get("data",[])])'
echo "=== DETAIL PUB ==="
curl -sk "https://127.0.0.1/api/comtur/content/$SLUG" | python3 -c 'import sys,json; d=json.load(sys.stdin)["data"]; print(d["title"], d["status"], d["metadata"].get("system"), d["metadata"].get("noSecrets"))'
echo "=== DRAFT ==="
code=$(curl -sk -o /tmp/int-draft.json -w "%{http_code}" "https://127.0.0.1/api/comtur/content/$DRAFT"); echo HTTP $code
echo "=== PAGES ==="
curl -skI https://127.0.0.1/turismo/integracoes/ | head -6
curl -sk https://127.0.0.1/turismo/integracoes/ | grep -oE 'Integrações|type=integration|Ver integração' | sort -u
curl -skI "https://127.0.0.1/turismo/integracoes/$SLUG" | head -6
# confirm HTML filters showOnPortal client-side for hidden
echo "HIDDEN_SLUG=$HIDDEN"
docker exec api rm -f /app/insert_integration_test.js
echo DONE
