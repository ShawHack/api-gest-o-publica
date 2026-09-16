#!/bin/bash
set -euo pipefail
bash /tmp/find_login_redirect.sh || true
python3 /tmp/patch_admin_auth_ux.py
python3 <<'PY'
from pathlib import Path
import re, subprocess, tempfile, os
html = Path('/home/semit/Documentos/api-semit/backend/public/comtur-content-admin.html').read_text(encoding='utf-8')
assert 'content="v29"' in html
assert 'Sessão expirada' in html
scripts = re.findall(r'<script(?![^>]+src=)[^>]*>([\s\S]*?)</script>', html)
s = max(scripts, key=len)
with tempfile.NamedTemporaryFile('w', suffix='.js', delete=False, encoding='utf-8') as f:
    f.write(s); p=f.name
r = subprocess.run(['node','--check',p], capture_output=True, text=True)
os.unlink(p)
print('syntax_ok', r.returncode==0)
if r.returncode: print(r.stderr[:1500]); raise SystemExit(1)
print('live', end=' ')
PY
curl -sk https://127.0.0.1/comtur-content-admin.html | grep -o 'cache-bust" content="v[0-9]*"' | head -1
echo DONE
