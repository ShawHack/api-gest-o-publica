#!/usr/bin/env python3
from pathlib import Path

path = Path("/home/semit/Documentos/api-semit/nginx/nginx.conf")
text = path.read_text(encoding="utf-8")
old = """  location = /comtur-admin.html {
    alias /opt/backend-public/comtur-admin.html;
    add_header Cache-Control "no-store, no-cache, must-revalidate, private" always;
    add_header X-Robots-Tag "noindex, nofollow" always;
  }
"""
new = """  location = /comtur-admin.html {
    proxy_pass http://api:5000/comtur-admin.html;
    add_header Cache-Control "no-store, no-cache, must-revalidate, private" always;
    add_header X-Robots-Tag "noindex, nofollow" always;
  }
"""
if "proxy_pass http://api:5000/comtur-admin.html" not in text:
    if old not in text:
        raise SystemExit("bloco /comtur-admin.html nao encontrado")
    path.write_text(text.replace(old, new, 1), encoding="utf-8")
print("nginx_admin_hub_ok")
