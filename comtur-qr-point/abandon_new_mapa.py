#!/usr/bin/env python3
from pathlib import Path
from datetime import datetime

nginx = Path("/home/semit/Documentos/api-semit/nginx/nginx.conf")
bak = nginx.with_name(f"nginx.conf.bak-mapa-{datetime.now().strftime('%Y%m%d-%H%M%S')}")
bak.write_bytes(nginx.read_bytes())

text = nginx.read_text(encoding="utf-8")

old_block = """  location = /turismo/mapa {
    return 301 /turismo/mapa/;
  }
  location = /turismo/mapa/ {
    root /opt/backend-public;
    try_files /turismo/mapa/index.html =404;
    add_header Cache-Control "no-cache, no-store, must-revalidate" always;
  }"""

new_block = """  # Mapa novo do COMTUR desativado: redireciona para o mapaturistico antigo.
  location = /turismo/mapa {
    return 302 /mapaturistico/;
  }
  location = /turismo/mapa/ {
    return 302 /mapaturistico/;
  }"""

if old_block not in text:
    if "return 302 /mapaturistico/;" in text and "location = /turismo/mapa" in text:
        print("NGINX_ALREADY_PATCHED")
    else:
        raise SystemExit("nginx mapa block not found")
else:
    text = text.replace(old_block, new_block, 1)
    print("NGINX_MAPA_REDIRECT")

old_br = """  location = /br/mapaturistico {
    return 302 /turismo/mapa;
  }"""
new_br = """  location = /br/mapaturistico {
    return 302 /mapaturistico/;
  }"""
if old_br in text:
    text = text.replace(old_br, new_br, 1)
    print("NGINX_BR_REDIRECT")
elif "location = /br/mapaturistico" in text and "return 302 /mapaturistico/;" in text:
    print("NGINX_BR_ALREADY")
else:
    print("NGINX_BR_WARN")

nginx.write_text(text, encoding="utf-8")

local = Path("/home/semit/Documentos/api-semit/backend/public/turismo/local/index.html")
if local.exists():
    lt = local.read_text(encoding="utf-8")
    lt2 = lt.replace('href="/turismo/mapa/"', 'href="/mapaturistico/"')
    if lt2 != lt:
        local.write_text(lt2, encoding="utf-8")
        print("LOCAL_LINK_PATCHED")
    else:
        print("LOCAL_LINK_OK")

print("BACKUP", bak.name)
