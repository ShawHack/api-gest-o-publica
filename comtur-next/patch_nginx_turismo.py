#!/usr/bin/env python3
from pathlib import Path

path = Path("/home/semit/Documentos/api-semit/nginx/nginx.conf")
text = path.read_text(encoding="utf-8")
original = text

text = text.replace(
    '    if ($http_sec_fetch_mode = "navigate") { return 302 /comtur-portal.html; }\n'
    '    if ($http_accept ~* "text/html") { return 302 /comtur-portal.html; }\n',
    '    if ($http_sec_fetch_mode = "navigate") { return 302 /turismo/comtur; }\n'
    '    if ($http_accept ~* "text/html") { return 302 /turismo/comtur; }\n',
    1,
)

old_portal = """  # Portal público do Conselho Municipal de Turismo.
  location = /comtur-portal.html {
    root /opt/backend-public;
    try_files $uri =404;
    add_header Cache-Control "no-store, no-cache, must-revalidate" always;
  }
"""
new_portal = """  location = /turismo {
    return 301 /turismo/;
  }
  location ^~ /turismo/ {
    root /opt/backend-public;
    index index.html;
    try_files $uri $uri/ /turismo/index.html =404;
    add_header Cache-Control "no-cache, no-store, must-revalidate" always;
  }

  location = /comtur-portal.html {
    return 302 /turismo/comtur;
  }
"""
if old_portal not in text:
    raise SystemExit("bloco /comtur-portal.html nao encontrado")
text = text.replace(old_portal, new_portal, 1)

# O mapa turístico legado permanece em /mapaturistico/ (proxy para a API).
# Não redirecionar para /turismo/mapa.

if text == original:
    raise SystemExit("nginx nao mudou")
path.write_text(text, encoding="utf-8")
print("NGINX_PATCHED")
