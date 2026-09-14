#!/usr/bin/env python3
from pathlib import Path

path = Path("/home/semit/Documentos/api-semit/nginx/nginx.conf")
text = path.read_text(encoding="utf-8")
original = text

nav = """  location = /comtur-admin-nav.js {
    proxy_pass http://api:5000/comtur-admin-nav.js;
    add_header Cache-Control "public, max-age=3600" always;
  }
"""
extra = """  location = /comtur-admin-nav.js {
    proxy_pass http://api:5000/comtur-admin-nav.js;
    add_header Cache-Control "public, max-age=3600" always;
  }
  location = /semit-session.js {
    proxy_pass http://api:5000/semit-session.js;
    add_header Cache-Control "no-store, no-cache, must-revalidate, private" always;
    add_header Content-Type "application/javascript; charset=utf-8" always;
  }
  location = /comtur-staff-admin.html {
    proxy_pass http://api:5000/comtur-staff-admin.html;
    add_header Cache-Control "no-store, no-cache, must-revalidate, private" always;
    add_header X-Robots-Tag "noindex, nofollow" always;
  }
"""
if "location = /semit-session.js" not in text:
    if nav not in text:
        raise SystemExit("bloco /comtur-admin-nav.js nao encontrado")
    text = text.replace(nav, extra, 1)

conf_d = Path("/home/semit/Documentos/api-semit/nginx")
for candidate in [path] + list(conf_d.glob("*.conf")):
    t = candidate.read_text(encoding="utf-8")
    if "location = /semit-session.js" in t:
        continue
    if nav in t:
        candidate.write_text(t.replace(nav, extra, 1), encoding="utf-8")
        print("patched", candidate)

if "location = /semit-session.js" not in Path("/home/semit/Documentos/api-semit/nginx/nginx.conf").read_text(encoding="utf-8"):
    raise SystemExit("falha ao inserir /semit-session.js")
print("nginx_session_ok")
