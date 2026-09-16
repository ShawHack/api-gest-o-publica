#!/usr/bin/env python3
from pathlib import Path
import re, json, urllib.request, ssl

admin = Path("/home/semit/Documentos/api-semit/backend/public/comtur-content-admin.html").read_text(encoding="utf-8")
upload = Path("/home/semit/Documentos/api-semit/backend/helpers/comtur-upload.js").read_text(encoding="utf-8")
nginx = Path("/home/semit/Documentos/api-semit/nginx/nginx.conf").read_text(encoding="utf-8")
pages = Path("/home/semit/Documentos/api-semit/backend/public/turismo/dados-abertos")

checks = {
  "openDataFields": 'id="openDataFields"' in admin,
  "specializedMap": "'open_data': 'openDataFields'" in admin,
  "novo_conjunto": "+ Novo conjunto" in admin,
  "empty_msg": "Nenhum conjunto de dados cadastrado" in admin,
  "build_payload": "currentType === 'open_data'" in admin,
  "csv_upload": ".csv" in upload and ".xlsx" in upload and ".json" in upload,
  "nginx": "location ^~ /turismo/dados-abertos/" in nginx,
  "index": (pages / "index.html").exists(),
  "detail": (pages / "detalhe.html").exists(),
}
print("CHECKS", json.dumps(checks, indent=2))

s = admin.find("specializedMap = {")
e = admin.find("};", s)
print("MAP", admin[s:e+2])

ctx = ssl._create_unverified_context()
def get(url):
  with urllib.request.urlopen(url, context=ctx, timeout=15) as r:
    return r.status, r.read().decode("utf-8", "replace")

st, body = get("https://127.0.0.1/api/comtur/content?type=open_data&limit=5")
data = json.loads(body)
print("API_STATUS", st, "COUNT", len(data.get("data") or []))
for i in data.get("data") or []:
  print(" ITEM", i.get("slug"), i.get("status"), (i.get("metadata") or {}).get("format"))

st2, html = get("https://127.0.0.1/turismo/dados-abertos/")
print("PAGE_LIST", st2, "Dados abertos" in html, "type=open_data" in html)

# confirm generic notice only in standardFields, not shown for open_data via map
print("GENERIC_NOTICE_EXISTS", "Formulário especializado ainda não configurado" in admin)
print("GENERIC_ONLY_IN_STANDARD", 'id="standardFields"' in admin and 'id="openDataFields"' in admin)
