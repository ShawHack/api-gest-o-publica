#!/bin/bash
set -euo pipefail
# find login redirect used by comtur admin
python3 - <<'PY'
from pathlib import Path
for p in [
 '/home/semit/Documentos/api-semit/backend/public/semit-session.js',
 '/home/semit/Documentos/api-semit/backend/public/comtur-admin-nav.js',
 '/home/semit/Documentos/api-semit/backend/public/comtur-admin.html',
]:
  t=Path(p).read_text(encoding='utf-8', errors='ignore')
  import re
  hits=re.findall(r'.{0,40}(/login[^"\']*|location\.href\s*=\s*[^;]+).{0,40}', t)
  print('FILE', p)
  for h in hits[:15]:
    print(' ', h.replace('\n',' ')[:120])
PY
# rest of fetchAuth
tail -c 1200 /home/semit/Documentos/api-semit/backend/public/semit-session.js
echo
