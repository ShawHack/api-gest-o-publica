#!/bin/bash
set -e
echo "=== host upload helper ==="
grep -n "allowed\|ALLOWED\|magicOk\|csv\|Error\|Envie" /home/semit/Documentos/api-semit/backend/helpers/comtur-upload.js | head -40
echo "=== container upload helper ==="
docker exec api grep -n "allowed\|ALLOWED\|magicOk\|csv\|Error\|Envie" /app/helpers/comtur-upload.js | head -40
echo "=== diff host vs container sizes ==="
wc -c /home/semit/Documentos/api-semit/backend/helpers/comtur-upload.js
docker exec api wc -c /app/helpers/comtur-upload.js
echo "=== recent api upload errors ==="
docker logs api --tail 200 2>&1 | grep -iE 'upload|comtur|multer|mime|clam|Falha|error' | tail -40
echo "=== nginx upload recent ==="
docker logs nginx --tail 100 2>&1 | grep -iE 'media/upload|413|422|500' | tail -20
echo "=== news upload JS ==="
python3 - <<'PY'
from pathlib import Path
a=Path('/home/semit/Documentos/api-semit/backend/public/comtur-content-admin.html').read_text(encoding='utf-8')
for needle in ['uploadNewsCover','Falha no upload','Erro ao enviar imagem','media/upload']:
    print(needle, a.count(needle))
i=a.find('async function uploadNewsCover')
print(a[i:i+900] if i>=0 else 'no uploadNewsCover')
i2=a.find('Erro ao enviar imagem')
print('ERR_CTX', a[max(0,i2-120):i2+200])
PY
echo "=== disk ==="
df -h /home/semit /var /tmp 2>/dev/null | head -10
docker exec api df -h /app /images /tmp 2>/dev/null | head -10
ls -la /home/semit/Documentos/api-semit/backend/public/images/comtur 2>/dev/null | tail -5
docker exec api ls -la /app/public/images/comtur 2>/dev/null | tail -5
