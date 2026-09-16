#!/bin/bash
set -euo pipefail

echo "=== mapaturistico HTTP ==="
curl -sk -o /dev/null -w "mapaturistico/:%{http_code}\n" https://127.0.0.1/mapaturistico/
curl -sk -o /dev/null -w "mapaturistico_index:%{http_code}\n" https://127.0.0.1/mapaturistico/index.html
curl -sk https://127.0.0.1/mapaturistico/ 2>/dev/null | head -c 400; echo

echo "=== turismo SPA map mentions in live bundle ==="
ASSET=$(curl -sk https://127.0.0.1/turismo/ | grep -oE '/turismo/assets/index-[^"]+\.js' | head -1)
echo "asset=$ASSET"
curl -sk "https://127.0.0.1$ASSET" | grep -oE '.{0,40}(mapaturistico|Ver mapa|Mapa turístico|integracoes).{0,40}' | head -30

echo "=== admin specializedMap + load error msg ==="
python3 - <<'PY'
from pathlib import Path
import re
a=Path('/home/semit/Documentos/api-semit/backend/public/comtur-content-admin.html').read_text(encoding='utf-8')
m=re.search(r'specializedMap\s*=\s*\{([\s\S]{0,1200})\}', a)
print('specializedMap snippet:', (m.group(0) if m else 'MISSING')[:500])
print('integrationFields', 'id="integrationFields"' in a or "id='integrationFields'" in a)
print('carregar integra', [l.strip() for l in a.splitlines() if 'integra' in l.lower() and 'carregar' in l.lower()][:10])
# dynamic error
i=a.find("Não foi possível carregar")
print(a[i:i+200] if i>=0 else 'no generic')
PY

echo "=== public integracoes page ==="
curl -sk -o /dev/null -w "integracoes/:%{http_code}\n" https://127.0.0.1/turismo/integracoes/
curl -sk https://127.0.0.1/api/comtur/content?type=integration&limit=10 | python3 -c 'import sys,json;d=json.load(sys.stdin);print([(i["slug"], i["title"]) for i in d.get("data",[])])'

echo "=== nginx mapaturistico location ==="
docker exec nginx grep -n "mapaturistico" /etc/nginx/conf.d/default.conf | head -20
