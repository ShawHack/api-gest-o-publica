#!/usr/bin/env python3
"""Restringe Xibo CMS :8080 a rede interna (CTIR #134353)."""
from pathlib import Path
from datetime import datetime

path = Path("/home/semit/Documentos/api-semit/nginx/nginx.conf")
text = path.read_text(encoding="utf-8")
bak = path.with_name(
    "nginx.conf.bak-ctir-8080-" + datetime.now().strftime("%Y%m%d-%H%M%S")
)
bak.write_text(text, encoding="utf-8")
print("backup", bak)

old = """# -------------------------------------------------------------
# XIBO CMS - Servidor Dedicado Porta 8080 (Acesso 100% Nativo sem conflito)
# URL Oficial: https://api.garca.sp.gov.br:8080/
# -------------------------------------------------------------
server {
  listen 8080 ssl;
  server_name api.garca.sp.gov.br;

  ssl_certificate     /etc/letsencrypt/live/api.garca.sp.gov.br/fullchain.pem;
  ssl_certificate_key /etc/letsencrypt/live/api.garca.sp.gov.br/privkey.pem;

  client_max_body_size 500m;

  location / {
    proxy_pass http://10.15.25.29:80/;
    proxy_http_version 1.1;
    proxy_set_header Host 10.15.25.29;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto https;
    proxy_read_timeout 300s;
    proxy_send_timeout 300s;
  }
}"""

new = """# -------------------------------------------------------------
# XIBO CMS - Porta 8080 restrita a rede interna (CTIR #134353)
# Acesso: redes 10.0.0.0/8 (Prefeitura) + localhost
# CMS backend: http://10.15.25.29:80/
# -------------------------------------------------------------
server {
  listen 8080 ssl;
  server_name api.garca.sp.gov.br;

  ssl_certificate     /etc/letsencrypt/live/api.garca.sp.gov.br/fullchain.pem;
  ssl_certificate_key /etc/letsencrypt/live/api.garca.sp.gov.br/privkey.pem;

  client_max_body_size 500m;

  # Bloqueia internet; libera apenas LAN municipal e localhost
  allow 10.0.0.0/8;
  allow 127.0.0.1;
  allow ::1;
  deny all;

  location / {
    proxy_pass http://10.15.25.29:80/;
    proxy_http_version 1.1;
    proxy_set_header Host 10.15.25.29;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto https;
    proxy_read_timeout 300s;
    proxy_send_timeout 300s;
  }
}"""

if old not in text:
    raise SystemExit("bloco 8080 nao encontrado exatamente; abortando")

path.write_text(text.replace(old, new, 1), encoding="utf-8")
print("patched ok")
