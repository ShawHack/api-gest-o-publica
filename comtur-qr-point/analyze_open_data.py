#!/usr/bin/env python3
"""Analyze open_data type in COMTUR admin/backend."""
from pathlib import Path
import re

admin = Path("/home/semit/Documentos/api-semit/backend/public/comtur-content-admin.html").read_text(encoding="utf-8")
helper = Path("/home/semit/Documentos/api-semit/backend/helpers/comtur-content.js").read_text(encoding="utf-8")
model = Path("/home/semit/Documentos/api-semit/backend/models/ComturContent.js").read_text(encoding="utf-8")
nginx = Path("/home/semit/Documentos/api-semit/nginx/nginx.conf").read_text(encoding="utf-8")

print("=== MODEL TYPES ===")
m = re.search(r"TYPES = \[([^\]]+)\]", model)
print(m.group(0) if m else "missing")

print("\n=== CATEGORIES open_data ===")
m = re.search(r"\{\s*id:\s*'open_data'[^}]+\}", admin)
print(m.group(0) if m else "MISSING CATEGORY")

print("\n=== specializedMap ===")
s = admin.find("specializedMap = {")
e = admin.find("};", s)
print(admin[s:e+2])

print("\n=== open_data mentions in admin ===")
print("count", admin.count("open_data"))
for pat in ["openDataFields", "open_data", "Dados abertos", "dados-abertos", "open-data"]:
    print(pat, admin.count(pat))

print("\n=== option value ===")
for m in re.finditer(r".{0,40}open_data.{0,80}", admin):
    print(m.group(0).replace("\n"," ")[:140])

print("\n=== upload helpers patterns ===")
for needle in ["uploadResearchPdf", "uploadAcc", "media/upload", "accept=", ".csv", "xlsx", "application/json"]:
    print(needle, admin.count(needle))

print("\n=== helper public filter / TYPES ===")
print("open_data in helper", "open_data" in helper)
print("research in helper", "research" in helper)
for m in re.finditer(r".{0,40}open_data.{0,60}", helper):
    print("H", m.group(0).replace("\n"," "))

print("\n=== nginx dados/pesquisas ===")
for key in ["pesquisas", "dados-abertos", "dados_abertos", "opendata", "open-data"]:
    print(key, nginx.count(key))

print("\n=== existing public dirs ===")
pub = Path("/home/semit/Documentos/api-semit/backend/public/turismo")
if pub.exists():
    for p in sorted(pub.iterdir()):
        print(" ", p.name, "DIR" if p.is_dir() else "FILE")

print("\n=== researchFields present ===", 'id="researchFields"' in admin)
print("=== standard notice present ===", "Formulário especializado ainda não configurado" in admin)

# find CATEGORIES block around open_data / research
idx = admin.find("id: 'open_data'")
print("\nCAT_CTX", repr(admin[idx-20:idx+250]) if idx>=0 else None)
idx2 = admin.find("id: 'research'")
print("RES_CTX", repr(admin[idx2-20:idx2+250]) if idx2>=0 else None)
