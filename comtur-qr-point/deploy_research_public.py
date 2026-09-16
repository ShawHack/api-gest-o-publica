#!/usr/bin/env python3
from pathlib import Path
from datetime import datetime
import shutil

PESQ = Path("/home/semit/Documentos/api-semit/backend/public/turismo/pesquisas")
PESQ.mkdir(parents=True, exist_ok=True)
shutil.copy("/tmp/pesquisas-index.html", PESQ / "index.html")
# detail template used by nginx try_files for /turismo/pesquisas/*
shutil.copy("/tmp/pesquisas-detail.html", PESQ / "detalhe.html")
# also place as catch-all via nginx alias to detalhe.html

nginx = Path("/home/semit/Documentos/api-semit/nginx/nginx.conf")
bak = nginx.with_name(f"nginx.conf.bak-research-{datetime.now().strftime('%Y%m%d-%H%M%S')}")
bak.write_bytes(nginx.read_bytes())
text = nginx.read_text(encoding="utf-8")

block = """  location = /turismo/pesquisas {
    return 301 /turismo/pesquisas/;
  }
  location = /turismo/pesquisas/ {
    root /opt/backend-public;
    try_files /turismo/pesquisas/index.html =404;
    add_header Cache-Control "no-cache, no-store, must-revalidate" always;
  }
  location ^~ /turismo/pesquisas/ {
    root /opt/backend-public;
    try_files /turismo/pesquisas/detalhe.html =404;
    add_header Cache-Control "no-cache, no-store, must-revalidate" always;
  }
"""

if "location ^~ /turismo/pesquisas/" not in text:
    anchor = "  location ^~ /turismo/local/ {"
    if anchor not in text:
        raise SystemExit("nginx local anchor missing")
    text = text.replace(anchor, block + anchor, 1)
    nginx.write_text(text, encoding="utf-8")
    print("NGINX_PATCHED", bak.name)
else:
    print("NGINX_ALREADY")

print("PAGES", list(PESQ.iterdir()))
