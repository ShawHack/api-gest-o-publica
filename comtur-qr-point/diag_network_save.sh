#!/bin/bash
set -e
echo "=== recent admin content POST ==="
docker logs nginx --tail 300 2>&1 | grep -E 'admin/content|comtur/admin' | tail -40
echo "=== api errors ==="
docker logs api --tail 200 2>&1 | grep -iE 'error|cast|validation|comtur|Mongo|payload|Syntax|TypeError|ECONN' | tail -50
echo "=== api health ==="
docker ps --filter name=^api$ --format '{{.Status}}'
curl -sk -o /dev/null -w "admin_noauth:%{http_code}\n" https://127.0.0.1/api/comtur/admin/content
echo "=== saveContent catch ==="
python3 - <<'PY'
from pathlib import Path
a=Path('/home/semit/Documentos/api-semit/backend/public/comtur-content-admin.html').read_text(encoding='utf-8')
i=a.find('Erro de rede ao salvar')
print(a[i-500:i+350])
print('sanitizeMediaList', 'function sanitizeMediaList' in a)
print('kind image push', a.count("kind: 'image'"))
# gastro return media line
import re
m=re.search(r"if \(currentType === 'gastronomy'\) \{[\s\S]{0,3500}?media: [^\n]+", a)
print('MEDIA_LINE', m.group(0)[-80:] if m else None)
PY
echo "=== simulate normalize gastro media ==="
docker exec -w /app api node - <<'NODE'
const { normalize } = require('./helpers/comtur-content');
const samples = [
  { kind:'image', url:'/images/comtur/test.jpg', title:'x', mimeType:'image/jpeg' },
  { type:'image', url:'/images/comtur/test.jpg', title:'x' },
  { kind:'image', url:'blob:http://localhost/abc', title:'x' },
  { kind:'image', url:'/images/comtur/Captura de tela 2026.jpg', title:'x' },
];
for (const m of samples) {
  const r = normalize({ type:'gastronomy', slug:'teste-gastro', title:'Teste', media:[m] }, true);
  console.log(JSON.stringify(m), '=>', r.error || 'OK', r.value && r.value.media);
}
NODE
