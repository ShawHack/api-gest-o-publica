#!/bin/bash
set -euo pipefail
python3 <<'PY'
from pathlib import Path
import re
a = Path('/home/semit/Documentos/api-semit/backend/public/comtur-content-admin.html').read_text(encoding='utf-8')
bp = a[a.find('function buildPayload'):a.find('// --- SAVE ACTION ---')]
# show odFormat context
for m in re.finditer(r'.{80}odFormat.{80}', bp):
    print('CTX', m.group(0).replace('\n',' '))
# attraction return location
i = bp.find("currentType === 'attraction'")
j = bp.find("currentType === 'event'")
att = bp[i:j]
print('--- attraction location ---')
print('locationStr' in att, 'location: locationStr' in att, 'location: {' in att)
print([line.strip() for line in att.splitlines() if 'location' in line or 'address' in line or 'videoUrl' in line][:20])
# syntax: node -c won't work on html; extract script and check braces in buildPayload
print('brace delta buildPayload', att.count('{') - att.count('}'))
# check all types have fieldVal for Name fields
for t, fid in [
 ('attraction','attractionName'),('event','eventName'),('lodging','lodgingName'),
 ('route','routeName'),('shopping','shopName'),('service','svcName'),
 ('news','newsTitle'),('research','resTitle'),('open_data','odName'),('integration','intName')
]:
    ok = f"fieldVal('{fid}')" in bp
    bad = f"$('{fid}').value" in bp
    print(t, 'fieldVal', ok, 'raw', bad)
PY
# copy patched file back for local sync via stdout size
wc -c /tmp/comtur-content-admin.server.html /home/semit/Documentos/api-semit/backend/public/comtur-content-admin.html
