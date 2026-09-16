#!/bin/bash
set -e
echo "=== admin list without auth ==="
curl -sk -o /tmp/int-admin.json -w "HTTP:%{http_code}\n" "https://127.0.0.1/api/comtur/admin/content?type=integration"
head -c 500 /tmp/int-admin.json; echo
echo "=== compare news ==="
curl -sk -o /tmp/news-admin.json -w "HTTP:%{http_code}\n" "https://127.0.0.1/api/comtur/admin/content?type=news"
head -c 200 /tmp/news-admin.json; echo
echo "=== public list ==="
curl -sk -o /tmp/int-pub.json -w "HTTP:%{http_code}\n" "https://127.0.0.1/api/comtur/content?type=integration"
head -c 300 /tmp/int-pub.json; echo
echo "=== find loadItems / error message in admin ==="
python3 - <<'PY'
from pathlib import Path
admin=Path('/home/semit/Documentos/api-semit/backend/public/comtur-content-admin.html').read_text(encoding='utf-8')
idx=admin.find('Não foi possível carregar')
print('MSG_POS', idx)
print(repr(admin[idx-400:idx+350]))
# also container public
import subprocess
out=subprocess.check_output(['docker','exec','api','grep','-n','Não foi possível carregar','/app/public/comtur-content-admin.html'], text=True, errors='replace')
print('CONTAINER', out[:300])
PY
echo "=== api logs recent comtur ==="
docker logs api --tail 80 2>&1 | grep -iE 'comtur|integration|error|TypeError|Mongo' | tail -40
echo "=== helper TYPE_SET / TYPES in container ==="
docker exec api node -e "const {TYPES}=require('./models/ComturContent'); console.log(TYPES.includes('integration'), TYPES.slice(-5)); const h=require('./helpers/comtur-content'); console.log(Object.keys(h)); console.log(JSON.stringify(h.publicContentFilter({type:'integration'})));"
