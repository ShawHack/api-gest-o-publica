#!/bin/bash
python3 - <<'PY'
from pathlib import Path
admin=Path('/home/semit/Documentos/api-semit/backend/public/comtur-content-admin.html').read_text(encoding='utf-8')
j=admin.find("if (item.type === 'integration')")
chunk=admin[j:j+1200]
print(chunk)
# ensure template closed
print('HAS_statusClass', 'statusClass' in chunk)
print('HAS_statusLabel', 'statusLabel' in chunk)
print('card_complete', '</button>' in chunk and '`;' in chunk)
PY
echo "=== api health ==="
curl -sk -o /dev/null -w "admin:%{http_code}\n" https://127.0.0.1/api/comtur/admin/content
curl -sk -o /dev/null -w "public:%{http_code}\n" "https://127.0.0.1/api/comtur/content?type=integration"
curl -sk -o /dev/null -w "sessionjs:%{http_code}\n" https://127.0.0.1/semit-session.js
docker ps --filter name=api --format '{{.Status}}'
