#!/usr/bin/env python3
from pathlib import Path

path = Path("/home/semit/Documentos/api-semit/nginx/nginx.conf")
text = path.read_text(encoding="utf-8")
needle = """  location = /turismo {
    return 301 /turismo/;
  }
  location ^~ /turismo/ {
"""
insert = """  location = /turismo {
    return 301 /turismo/;
  }
  location = /turismo/mapa {
    return 302 /mapaturistico/;
  }
  location = /turismo/mapa/ {
    return 302 /mapaturistico/;
  }
  location ^~ /turismo/ {
"""
if "location = /turismo/mapa {" in text:
    print("MAPA_REDIRECT_ALREADY")
    raise SystemExit(0)
if needle not in text:
    raise SystemExit("bloco /turismo nao encontrado")
path.write_text(text.replace(needle, insert, 1), encoding="utf-8")
print("MAPA_REDIRECT_OK")
