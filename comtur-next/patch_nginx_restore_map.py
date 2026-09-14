#!/usr/bin/env python3
from pathlib import Path

path = Path("/home/semit/Documentos/api-semit/nginx/nginx.conf")
text = path.read_text(encoding="utf-8")
original = text

stolen = """  location = /mapaturistico {
    return 302 /turismo/mapa;
  }

  location ^~ /mapaturistico/ {
    return 302 /turismo/mapa;
  }
"""
restored = """  location = /mapaturistico {
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
if stolen not in text:
    raise SystemExit("bloco /mapaturistico redirecionado nao encontrado")
text = text.replace(stolen, restored, 1)
text = text.replace(
    "    rewrite ^/br/mapaturistico/(.*)$ /turismo/mapa permanent;\n",
    "    rewrite ^/br/mapaturistico/(.*)$ /mapaturistico/$1 permanent;\n",
    1,
)
text = text.replace(
    "  # Portal municipal de turismo (substitui HTML do COMTUR e, no cutover, mapaturistico).\n",
    "  # Portal municipal de turismo (Visit Garça). O mapa legado permanece em /mapaturistico/.\n",
    1,
)

if text == original:
    raise SystemExit("nginx nao mudou")
path.write_text(text, encoding="utf-8")
print("MAPA_RESTAURADO")
