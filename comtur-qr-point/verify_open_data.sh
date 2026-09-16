#!/bin/bash
set -e
# wait api
for i in 1 2 3 4 5 6 7 8 9 10; do
  if curl -sk --max-time 3 "https://127.0.0.1/api/comtur/content?type=open_data&limit=1" >/dev/null 2>&1; then break; fi
  sleep 2
done

echo "=== MAP ==="
python3 - <<'PY'
from pathlib import Path
admin=Path('/home/semit/Documentos/api-semit/backend/public/comtur-content-admin.html').read_text(encoding='utf-8')
checks=['id="openDataFields"',"'open_data': 'openDataFields'",'+ Novo conjunto','Nenhum conjunto de dados cadastrado','item.type === \'open_data\'']
for c in checks: print(('OK' if c in admin else 'MISS'), c)
s=admin.find('specializedMap = {'); e=admin.find('};',s); print(admin[s:e+2])
up=Path('/home/semit/Documentos/api-semit/backend/helpers/comtur-upload.js').read_text(encoding='utf-8')
print('CSV_ALLOWED', '.csv' in up)
PY

docker cp /tmp/insert_open_data_test.js api:/app/insert_open_data_test.js
OUT=$(docker exec -w /app api node /app/insert_open_data_test.js)
echo "$OUT"
SLUG=$(python3 -c 'import json,sys; print(json.loads(sys.argv[1])["slug"])' "$OUT")
DRAFT=$(python3 -c 'import json,sys; print(json.loads(sys.argv[1])["draftSlug"])' "$OUT")
URL=$(python3 -c 'import json,sys; print(json.loads(sys.argv[1])["url"])' "$OUT")

echo "=== LIST API ==="
curl -sk "https://127.0.0.1/api/comtur/content?type=open_data&limit=10" | python3 -c 'import sys,json; d=json.load(sys.stdin); print("count",len(d.get("data",[]))); print([i["slug"] for i in d.get("data",[])])'
echo "=== DETAIL ==="
curl -sk "https://127.0.0.1/api/comtur/content/$SLUG" | python3 -c 'import sys,json; d=json.load(sys.stdin)["data"]; print(d["title"], d["status"], d["metadata"].get("format"), (d.get("media") or [{}])[0].get("url"))'
echo "=== DRAFT ==="
code=$(curl -sk -o /tmp/od-draft.json -w "%{http_code}" "https://127.0.0.1/api/comtur/content/$DRAFT"); echo HTTP $code; cat /tmp/od-draft.json; echo
echo "=== PAGES ==="
curl -skI https://127.0.0.1/turismo/dados-abertos/ | head -8
curl -sk https://127.0.0.1/turismo/dados-abertos/ | grep -oE 'Dados abertos|type=open_data|Ver conjunto' | sort -u
curl -skI "https://127.0.0.1/turismo/dados-abertos/$SLUG" | head -8
echo "=== FILE ==="
curl -skI "https://127.0.0.1$URL" | head -10
# quick mime upload smoke without auth may fail; check helper in container
docker exec api node -e 'const u=require("./helpers/comtur-upload"); console.log("upload helper ok", !!u.upload)'
docker exec api rm -f /app/insert_open_data_test.js
echo DONE
