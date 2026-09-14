#!/usr/bin/env python3
from pathlib import Path
p = Path("/home/semit/Documentos/api-semit/nginx/nginx.conf")
t = p.read_text(encoding="utf-8")
old = """  location = /comtur-branding-admin.html {
    proxy_pass http://api:5000/comtur-branding-admin.html;
    add_header Cache-Control "no-store, no-cache, must-revalidate, private" always;
    add_header X-Robots-Tag "noindex, nofollow" always;
  }"""
new = """  location = /comtur-branding-admin.html {
    if ($is_args = "0") {
      return 302 /comtur-branding-admin.html?v=11;
    }
    alias /opt/backend-public/comtur-branding-admin.html;
    etag off;
    add_header Cache-Control "no-store, no-cache, must-revalidate, private" always;
    add_header X-Robots-Tag "noindex, nofollow" always;
  }"""
if "comtur-branding-admin.html?v=11" in t:
    print("BRANDING_ALIAS_ALREADY")
elif old not in t:
    raise SystemExit("bloco branding-admin nao encontrado")
else:
    p.write_text(t.replace(old, new, 1), encoding="utf-8")
    print("BRANDING_ALIAS_OK")
