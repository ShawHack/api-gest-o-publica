#!/bin/bash
set -euo pipefail

echo "=== saveContent function ==="
python3 - <<'PY'
from pathlib import Path
a = Path('/home/semit/Documentos/api-semit/backend/public/comtur-content-admin.html').read_text(encoding='utf-8')
i = a.find('async function saveContent')
j = a.find('async function loadItems', i)
print(a[i:j])
PY

echo "=== normalize media samples ==="
docker exec -w /app api node <<'NODE'
const { normalize } = require('./helpers/comtur-content');
const samples = [
  { kind:'image', url:'/images/comtur/test.jpg', title:'x', mimeType:'image/jpeg' },
  { type:'image', url:'/images/comtur/test.jpg', title:'x' },
  { kind:'image', url:'/images/comtur/test.jpg', alt:'Captura', isCover:true, credits:'' },
  { kind:'image', url:'https://api.garca.sp.gov.br/images/comtur/test.jpg', alt:'Captura', isCover:true },
  { kind:'image', url:'blob:https://api.garca.sp.gov.br/abc', alt:'x', isCover:true },
  { kind:'image', url:'/images/comtur/Captura de tela 2026.jpg', alt:'x', isCover:true },
];
for (const m of samples) {
  const r = normalize({ type:'gastronomy', slug:'teste-gastro', title:'Teste', media:[m] }, true);
  console.log(JSON.stringify(m).slice(0,100), '=>', r.error || 'OK', r.value && JSON.stringify(r.value.media).slice(0,120));
}
NODE

echo "=== recent content POSTs ==="
docker logs nginx --tail 400 2>&1 | grep -E 'admin/content' | tail -30

echo "=== api validation noise ==="
docker logs api --tail 300 2>&1 | grep -iE 'inválid|invalid|mídia|media|Validation|TypeError|ECONN|422' | tail -40 || true
