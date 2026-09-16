#!/usr/bin/env python3
from pathlib import Path
from datetime import datetime
import shutil

DIR = Path("/home/semit/Documentos/api-semit/backend/public/turismo/integracoes")
DIR.mkdir(parents=True, exist_ok=True)
shutil.copy("/tmp/integracoes-index.html", DIR / "index.html")
shutil.copy("/tmp/integracoes-detail.html", DIR / "detalhe.html")

nginx = Path("/home/semit/Documentos/api-semit/nginx/nginx.conf")
bak = nginx.with_name(f"nginx.conf.bak-integration-{datetime.now().strftime('%Y%m%d-%H%M%S')}")
bak.write_bytes(nginx.read_bytes())
text = nginx.read_text(encoding="utf-8")

block = """  location = /turismo/integracoes {
    return 301 /turismo/integracoes/;
  }
  location = /turismo/integracoes/ {
    root /opt/backend-public;
    try_files /turismo/integracoes/index.html =404;
    add_header Cache-Control "no-cache, no-store, must-revalidate" always;
  }
  location ^~ /turismo/integracoes/ {
    root /opt/backend-public;
    try_files /turismo/integracoes/detalhe.html =404;
    add_header Cache-Control "no-cache, no-store, must-revalidate" always;
  }
"""

if "location ^~ /turismo/integracoes/" not in text:
    for anchor in [
        "  location = /turismo/dados-abertos {",
        "  location = /turismo/pesquisas {",
        "  location ^~ /turismo/local/ {",
    ]:
        if anchor in text:
            text = text.replace(anchor, block + anchor, 1)
            nginx.write_text(text, encoding="utf-8")
            print("NGINX_PATCHED", bak.name)
            break
    else:
        raise SystemExit("nginx anchor missing")
else:
    print("NGINX_ALREADY")

print("PAGES", list(DIR.iterdir()))
