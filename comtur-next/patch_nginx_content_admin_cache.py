#!/usr/bin/env python3
from pathlib import Path
path = Path("/home/semit/Documentos/api-semit/nginx/nginx.conf")
text = path.read_text(encoding="utf-8")
old = """  location = /comtur-content-admin.html {
    alias /opt/backend-public/comtur-content-admin.html;
    add_header Cache-Control "no-store, no-cache, must-revalidate, private" always;
    add_header X-Robots-Tag "noindex, nofollow" always;
  }"""
new = """  location = /comtur-content-admin.html {
    if ($arg_v = "") {
      return 302 /comtur-content-admin.html?v=10;
    }
    alias /opt/backend-public/comtur-content-admin.html;
    etag off;
    add_header Cache-Control "no-store, no-cache, must-revalidate, private" always;
    add_header X-Robots-Tag "noindex, nofollow" always;
  }"""
if "comtur-content-admin.html?v=10" in text:
    print("REDIRECT_ALREADY")
else:
    if old not in text:
        raise SystemExit("bloco content-admin nao encontrado")
    path.write_text(text.replace(old, new, 1), encoding="utf-8")
    print("REDIRECT_OK")
