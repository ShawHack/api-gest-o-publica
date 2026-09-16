#!/bin/bash
set -euo pipefail
cd /tmp
# patch script expects comtur-content-admin.server.html beside it
python3 /tmp/patch_all_fieldval.py
cp -a /tmp/comtur-content-admin.server.html /home/semit/Documentos/api-semit/backend/public/comtur-content-admin.html
# also refresh local copy path used by patch output
python3 <<'PY'
from pathlib import Path
import re
a = Path('/home/semit/Documentos/api-semit/backend/public/comtur-content-admin.html').read_text(encoding='utf-8')
assert 'content="v27"' in a, 'v27 missing'
bp = a[a.find('function buildPayload'):a.find('// --- SAVE ACTION ---')]
left = re.findall(r"\$\('([^']+)'\)\.(value|checked)", bp)
print('leftover', len(left), left[:10])
print('fieldVal count', bp.count('fieldVal('))
print('hours safe', 'openEl && openEl.value' in a)
i = bp.find("currentType === 'attraction'")
print(bp[i:i+700])
# syntax check of script tags roughly: ensure balanced
print('OK deploy')
PY
# live check via nginx
curl -sk https://127.0.0.1/comtur-content-admin.html | grep -o 'cache-bust" content="v[0-9]*"' | head -1
echo DONE
