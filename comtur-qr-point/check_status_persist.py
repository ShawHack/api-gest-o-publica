#!/usr/bin/env python3
from pathlib import Path
ctrl = Path('/home/semit/Documentos/api-semit/backend/controllers/ComturContentController.js').read_text(encoding='utf-8')
print('transition' in ctrl)
print('status' in ctrl)
# show create/update snippets
for key in ['create', 'update', 'transition']:
    i = ctrl.find(f'static async {key}')
    print('===', key, i)
    print(ctrl[i:i+500])
