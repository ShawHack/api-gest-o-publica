#!/bin/bash
set -euo pipefail
python3 - <<'PY'
from pathlib import Path
t=Path('/home/semit/Documentos/api-semit/backend/public/cultura/eventos/eventos.js').read_text(encoding='utf-8')
i=t.find('getCreationDateStr')
print(repr(t[i-80:i+450]))
i=t.find('const dateRaw = post.datasHorarios')
print('DATE RAW BLOCK')
print(repr(t[i:i+350]))
PY
python3 /tmp/fix_cultura_dates.py
# verify
python3 - <<'PY'
from pathlib import Path
a=Path('/home/semit/Documentos/api-semit/backend/public/cultura/admin.html').read_text(encoding='utf-8')
e=Path('/home/semit/Documentos/api-semit/backend/public/cultura/eventos/eventos.js').read_text(encoding='utf-8')
assert 'parseLocalDate' in a and 'formatLocalDate' in a
assert 'post.createdAt || post.publishedAt' in a
assert 'parseLocalDate' in e
assert 'dataCriacao' in e  # may remain as fallback
print('admin ok', a.count('formatLocalDate'))
print('eventos ok', e.count('parseLocalDate'))
# live check via public path
print('live admin has formatLocalDate', 'formatLocalDate' in Path('/home/semit/Documentos/api-semit/backend/public/cultura/admin.html').read_text(encoding='utf-8'))
PY
curl -sk https://127.0.0.1/cultura/admin.html | grep -c formatLocalDate || true
curl -sk https://127.0.0.1/cultura/eventos/eventos.js | grep -c parseLocalDate || true
echo DONE
