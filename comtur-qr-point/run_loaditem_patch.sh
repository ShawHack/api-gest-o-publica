#!/bin/bash
set -euo pipefail
python3 /tmp/patch_loaditem_fieldset.py
curl -sk https://127.0.0.1/comtur-content-admin.html | grep -o 'cache-bust" content="v[0-9]*"' | head -1
grep -c 'function fieldSet' /home/semit/Documentos/api-semit/backend/public/comtur-content-admin.html
echo DONE
