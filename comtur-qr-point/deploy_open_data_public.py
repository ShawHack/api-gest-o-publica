#!/usr/bin/env python3
from pathlib import Path
from datetime import datetime
import shutil

DIR = Path("/home/semit/Documentos/api-semit/backend/public/turismo/dados-abertos")
DIR.mkdir(parents=True, exist_ok=True)
shutil.copy("/tmp/dados-abertos-index.html", DIR / "index.html")
shutil.copy("/tmp/dados-abertos-detail.html", DIR / "detalhe.html")

nginx = Path("/home/semit/Documentos/api-semit/nginx/nginx.conf")
bak = nginx.with_name(f"nginx.conf.bak-opendata-{datetime.now().strftime('%Y%m%d-%H%M%S')}")
bak.write_bytes(nginx.read_bytes())
text = nginx.read_text(encoding="utf-8")

block = """  location = /turismo/dados-abertos {
    return 301 /turismo/dados-abertos/;
  }
  location = /turismo/dados-abertos/ {
    root /opt/backend-public;
    try_files /turismo/dados-abertos/index.html =404;
    add_header Cache-Control "no-cache, no-store, must-revalidate" always;
  }
  location ^~ /turismo/dados-abertos/ {
    root /opt/backend-public;
    try_files /turismo/dados-abertos/detalhe.html =404;
    add_header Cache-Control "no-cache, no-store, must-revalidate" always;
  }
"""

if "location ^~ /turismo/dados-abertos/" not in text:
    anchor = "  location = /turismo/pesquisas {"
    if anchor not in text:
        anchor = "  location ^~ /turismo/pesquisas/"
    if anchor not in text:
        anchor = "  location ^~ /turismo/local/ {"
    if anchor not in text:
        raise SystemExit("nginx anchor missing")
    text = text.replace(anchor, block + anchor, 1)
    nginx.write_text(text, encoding="utf-8")
    print("NGINX_PATCHED", bak.name)
else:
    print("NGINX_ALREADY")

print("PAGES", list(DIR.iterdir()))
