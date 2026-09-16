#!/bin/bash
set -euo pipefail

echo "=== gastro buildPayload media ==="
python3 - <<'PY'
from pathlib import Path
import re
a = Path('/home/semit/Documentos/api-semit/backend/public/comtur-content-admin.html').read_text(encoding='utf-8')
print('NAV', re.search(r'NAV_CACHE_BUST["\']?\s*[:=]\s*["\']?(\d+)', a))
print('v=', re.findall(r'comtur-content-admin\.html\?[^"\']*v=(\d+)', a)[:5])
# sanitizeMediaList
i = a.find('function sanitizeMediaList')
print('--- sanitizeMediaList ---')
print(a[i:i+900] if i>=0 else 'MISSING')
# gastronomy block
m = re.search(r"if \(currentType === 'gastronomy'\) \{[\s\S]{0,4500}?return \{[\s\S]{0,1200}?\};", a)
print('--- gastronomy return ---')
print(m.group(0)[-1500:] if m else 'MISSING')
# uploadMediaFiles push
i = a.find('async function uploadMediaFiles')
print('--- uploadMediaFiles ---')
print(a[i:i+1800] if i>=0 else 'MISSING')
PY

echo "=== normalize with -i ==="
docker exec -i -w /app api node <<'NODE'
const { normalize } = require('./helpers/comtur-content');
const samples = [
  { kind:'image', url:'/images/comtur/test.jpg', title:'x', mimeType:'image/jpeg' },
  { type:'image', url:'/images/comtur/test.jpg', title:'x' },
  { kind:'image', url:'/images/comtur/test.jpg', alt:'Captura', isCover:true, credits:'' },
  { kind:'image', url:'https://api.garca.sp.gov.br/images/comtur/test.jpg', alt:'Captura', isCover:true },
  { kind:'image', url:'blob:https://api.garca.sp.gov.br/abc', alt:'x', isCover:true },
];
for (const m of samples) {
  const r = normalize({ type:'gastronomy', slug:'teste-gastro', title:'Teste', media:[m] }, true);
  console.log(JSON.stringify(m).slice(0,110));
  console.log(' =>', r.error || 'OK', r.value ? JSON.stringify(r.value.media).slice(0,140) : '');
}
NODE

echo "=== api restarts / sigterm ==="
docker logs api --tail 80 2>&1 | tail -50
docker inspect api --format 'Started={{.State.StartedAt}} Status={{.State.Status}} OOM={{.State.OOMKilled}} Exit={{.State.ExitCode}}'
docker events --since 2h --until 0s --filter container=api --filter event=die --filter event=restart --filter event=kill 2>/dev/null | tail -20 || true
