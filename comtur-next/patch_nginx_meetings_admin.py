#!/usr/bin/env python3
from pathlib import Path

path = Path("/home/semit/Documentos/api-semit/nginx/nginx.conf")
text = path.read_text(encoding="utf-8")
old = """  location = /comtur-meetings-admin.html {
    proxy_pass http://api:5000/comtur-meetings-admin.html;
    add_header Cache-Control "no-store, no-cache, must-revalidate, private" always;
    add_header X-Robots-Tag "noindex, nofollow" always;
  }
"""
new = """  location = /comtur-meetings-admin.html {
    alias /opt/backend-public/comtur-meetings-admin.html;
    add_header Cache-Control "no-store, no-cache, must-revalidate, private" always;
    add_header X-Robots-Tag "noindex, nofollow" always;
  }
"""
if old not in text:
    raise SystemExit("bloco meetings-admin nao encontrado")
path.write_text(text.replace(old, new, 1), encoding="utf-8")
print("MEETINGS_ADMIN_ALIAS")
