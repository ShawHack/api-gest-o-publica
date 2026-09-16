#!/bin/bash
python3 - <<'PY'
from pathlib import Path
import re
a=Path('/home/semit/Documentos/api-semit/backend/public/comtur-content-admin.html').read_text(encoding='utf-8')
print('fieldVal', 'function fieldVal(' in a)
print('publishDate field', 'id="gastroPublishDate"' in a)
print('build uses fieldVal gastroName', "fieldVal('gastroName')" in a)
print('unsafe priceLevel.value', "$('gastroPriceLevel').value" in a)
left=re.findall(r"\$\('(gastro[^']+)'\)\.(value|checked)", a)
print('left unsafe', left[:20], 'count', len(left))
PY
# apply remaining safe assign if needed
python3 /tmp/fix_all_gastro_nulls.py 2>/dev/null || true
