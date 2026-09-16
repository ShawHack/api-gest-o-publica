#!/usr/bin/env python3
from pathlib import Path
import re
html = Path('/home/semit/Documentos/api-semit/backend/public/turismo/index.html').read_text(encoding='utf-8')
print('INDEX_SCRIPTS')
for m in re.finditer(r'src="[^"]*assets/[^"]+"', html):
    print(' ', m.group(0))
f = Path('/home/semit/Documentos/api-semit/backend/public/turismo/assets/index-BsvdOgSz.js')
t = f.read_text(encoding='utf-8')
print('comturPublicHref count', t.count('comturPublicHref'))
print('featured-hero with helper', t.count('comturPublicHref(u)'))
print('p/${u.slug} left', t.count('`p/${u.slug}`'))
print('p/${e.slug} left', t.count('`p/${e.slug}`'))
# sample patched
i = t.find('comturPublicHref(u)')
print('SAMPLE', t[i-80:i+220])
