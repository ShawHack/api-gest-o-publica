#!/bin/bash
set -euo pipefail
python3 - <<'PY'
from pathlib import Path
a = Path('/home/semit/Documentos/api-semit/backend/public/comtur-content-admin.html').read_text(encoding='utf-8')
# loadItemForEdit gastronomy parts
idx = a.find('function loadItemForEdit')
print('loadItemForEdit at', idx)
chunk = a[idx:idx+12000]
# find gastronomy handling
for key in ['gastronomy', 'gastro', 'media', 'fieldVal', '.value']:
    pass
import re
# extract gastronomy branch inside loadItemForEdit
m = re.search(r"if \(item\.type === 'gastronomy'\) \{[\s\S]{0,8000}?\}(?=\s*if \(item\.type|\s*// ---|\s*function )", chunk)
if not m:
    m = re.search(r"currentType === 'gastronomy'[\s\S]{0,500}", chunk)
print('--- load gastro snippet ---')
print((m.group(0) if m else chunk[:4000])[:5000])

# how gastro media gets populated on file select
for pat in ['gastroMedia', 'blob:', 'URL.createObjectURL', 'renderGastro']:
    print(pat, a.count(pat))

i = a.find('gastroDrop')
print('--- around gastroDrop ---')
print(a[max(0,a.find('gastroMediaFiles')):a.find('gastroMediaFiles')+2500] if 'gastroMediaFiles' in a else 'no gastroMediaFiles')
PY

echo "=== upload helper SIGTERM ==="
docker exec -i -w /app api node <<'NODE'
const fs = require('fs');
const s = fs.readFileSync('./helpers/comtur-upload.js','utf8');
const i = s.indexOf('antivírus');
console.log(s.slice(Math.max(0,i-200), i+400));
NODE

echo "=== recent saves after 19:01 ==="
docker logs nginx --tail 200 2>&1 | grep -E 'admin/content|media/upload' | tail -25
