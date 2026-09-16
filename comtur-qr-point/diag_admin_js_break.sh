#!/bin/bash
set -euo pipefail

ADMIN=/home/semit/Documentos/api-semit/backend/public/comtur-content-admin.html
echo "=== cache meta ==="
grep -o 'comtur-admin-cache-bust" content="v[0-9]*"' "$ADMIN" | head -1

echo "=== extract+check script syntax ==="
python3 <<'PY'
from pathlib import Path
import re, subprocess, tempfile, os
html = Path('/home/semit/Documentos/api-semit/backend/public/comtur-content-admin.html').read_text(encoding='utf-8')
# extract inline scripts
scripts = re.findall(r'<script(?![^>]+src=)[^>]*>([\s\S]*?)</script>', html)
print('inline scripts', len(scripts))
for i, s in enumerate(scripts):
    if len(s) < 200: continue
    with tempfile.NamedTemporaryFile('w', suffix=f'-admin-{i}.js', delete=False, encoding='utf-8') as f:
        f.write(s)
        path = f.name
    r = subprocess.run(['node', '--check', path], capture_output=True, text=True)
    print(f'script[{i}] bytes={len(s)} ok={r.returncode==0}')
    if r.returncode != 0:
        print(r.stderr[:2000])
        # try to locate line
        err = r.stderr
    os.unlink(path)
PY

echo "=== fieldSet/fieldVal present ==="
grep -c 'function fieldSet' "$ADMIN" || true
grep -c 'function fieldVal' "$ADMIN" || true

echo "=== btn new handlers ==="
grep -n "Nova notícia\|btnNew\|newItem\|resetForm\|onclick.*Nova\|startNew\|createNew" "$ADMIN" | head -40

echo "=== loadItems catch messages ==="
grep -n "Não foi possível carregar" "$ADMIN" | head -20

echo "=== API health + admin content ==="
curl -sk -o /dev/null -w "health:%{http_code}\n" https://127.0.0.1/health
curl -sk -o /dev/null -w "admin_content:%{http_code}\n" https://127.0.0.1/api/comtur/admin/content
docker ps --filter name=^api$ --format '{{.Status}}'
docker logs api --tail 30 2>&1 | tail -20

echo "=== recent nginx admin errors ==="
docker logs nginx --tail 80 2>&1 | grep -E 'admin/content|comtur-content-admin' | tail -20
