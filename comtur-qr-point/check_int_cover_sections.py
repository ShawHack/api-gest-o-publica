#!/usr/bin/env python3
from pathlib import Path
import re
a=Path('/home/semit/Documentos/api-semit/backend/public/comtur-content-admin.html').read_text(encoding='utf-8')
i=a.find('id="integrationFields"')
j=a.find('id="openDataFields"', i)
chunk=a[i:j]
for m in re.finditer(r'comtur-section-title"><span class="num">(\d+)</span>\s*([^<]+)', chunk):
    print(m.group(1), m.group(2).strip())
print('cover in build', 'coverUrl: intCoverFile' in chunk or 'coverUrl: intCoverFile' in a)
