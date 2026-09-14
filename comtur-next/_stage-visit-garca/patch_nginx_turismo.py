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

old_map = """  location = /mapaturistico {
    return 301 /mapaturistico/;
  }

  location ^~ /mapaturistico/ {
    proxy_pass http://api:5000/mapaturistico/;
    proxy_http_version 1.1;
    proxy_set_header Host              $host;
    proxy_set_header X-Real-IP         $remote_addr;
    proxy_set_header X-Forwarded-For   $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
    proxy_set_header Upgrade           $http_upgrade;
    proxy_set_header Connection        $connection_upgrade;
    proxy_redirect off;
  }
"""
new_map = """  location = /mapaturistico {
    return 302 /turismo/mapa;
  }

  location ^~ /mapaturistico/ {
    return 302 /turismo/mapa;
  }
"""
if old_map not in text:
    raise SystemExit("bloco /mapaturistico/ nao encontrado")
text = text.replace(old_map, new_map, 1)

text = text.replace(
    "    return 301 /mapaturistico/;\n",
    "    return 302 /turismo/mapa;\n",
    1,
)
text = text.replace(
    "    rewrite ^/br/mapaturistico/(.*)$ /mapaturistico/$1 permanent;\n",
    "    rewrite ^/br/mapaturistico/(.*)$ /turismo/mapa permanent;\n",
    1,
)

if text == original:
    raise SystemExit("nginx nao mudou")
path.write_text(text, encoding="utf-8")
print("NGINX_PATCHED")
