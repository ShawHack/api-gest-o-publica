#!/usr/bin/env python3
from pathlib import Path

FILE_PATH = Path('/home/semit/Documentos/api-semit/nginx/nginx.conf')
marker = '  # 3. Gerenciador Geral NovoSGA (Atendentes & Administração)'
block = """  # Proxy integrado de Painel NovoSGA + Agenda Garca (TVs Oficiais)
  location ^~ /senhas/api/unidades/ {
    proxy_pass http://api:5000/api/agenda/public/novosga-proxy/unidades/;
    proxy_http_version 1.1;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto https;
    proxy_set_header Authorization $http_authorization;
    proxy_read_timeout 30s;
  }

"""

content = FILE_PATH.read_text(encoding='utf-8')
if '/senhas/api/unidades/' in content:
    print('already patched')
elif marker not in content:
    raise SystemExit('marker not found')
else:
    FILE_PATH.write_text(content.replace(marker, block + marker), encoding='utf-8')
    print('nginx patched ok')
