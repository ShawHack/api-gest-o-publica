#!/bin/bash
set -euo pipefail
python3 <<'PY'
from pathlib import Path
a = Path('/home/semit/Documentos/api-semit/backend/public/comtur-content-admin.html').read_text(encoding='utf-8')
# loadItems catch
i = a.find('async function loadItems')
print(a[i:i+1800])
print('==== init / DOMContentLoaded / btnNew ====')
j = a.find("if ($('btnNew'))")
print(a[j-800:j+400])
print('==== semit-session snippet ====')
s = Path('/home/semit/Documentos/api-semit/backend/public/semit-session.js').read_text(encoding='utf-8')
print(s[:2500])
PY
