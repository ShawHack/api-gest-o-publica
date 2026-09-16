#!/usr/bin/env python3
"""Analyze COMTUR type=integration for specialized form suggestion."""
from pathlib import Path
import re

admin = Path("/home/semit/Documentos/api-semit/backend/public/comtur-content-admin.html").read_text(encoding="utf-8")
model = Path("/home/semit/Documentos/api-semit/backend/models/ComturContent.js").read_text(encoding="utf-8")
helper = Path("/home/semit/Documentos/api-semit/backend/helpers/comtur-content.js").read_text(encoding="utf-8")

print("=== MODEL ===")
m = re.search(r"TYPES = \[([^\]]+)\]", model)
print(m.group(0) if m else "missing")

print("\n=== CATEGORY ===")
m = re.search(r"\{\s*id:\s*'integration'[^}]+\}", admin)
print(m.group(0) if m else "MISSING")

print("\n=== specializedMap ===")
s = admin.find("specializedMap = {")
e = admin.find("};", s)
print(admin[s:e+2])

print("\n=== aliases ===")
for m in re.finditer(r".{0,40}integration.{0,80}", admin):
    print(m.group(0).replace("\n", " ")[:160])

print("\n=== mentions counts ===")
for k in ["integration", "Integração", "integrationFields", "qr_point", "open_data", "research"]:
    print(k, admin.count(k))

print("\n=== helper ===")
print("integration in helper", "integration" in helper)
for m in re.finditer(r".{0,50}integrat.{0,80}", helper, re.I):
    print("H", m.group(0).replace("\n", " ")[:160])

# existing integrations elsewhere in turismo/api?
root = Path("/home/semit/Documentos/api-semit/backend")
print("\n=== related files ===")
for p in root.rglob("*"):
    if not p.is_file():
        continue
    if p.suffix not in {".js", ".html", ".md", ".json"}:
        continue
    name = p.name.lower()
    if "integr" in name or "oauth" in name or "webhook" in name:
        print(" ", p.relative_to(root))

# sample metadata patterns from other specialized types (keys only from buildPayload)
print("\n=== nearby specialized field ids (sample) ===")
for needle in ["indicatorFields", "qr_point", "openDataFields", "researchFields"]:
    i = admin.find(f'id="{needle}"' if needle.endswith("Fields") else needle)
    print(needle, "pos", i)

# CATEGORIES full list titles
print("\n=== ALL CATEGORIES ===")
for m in re.finditer(r"\{\s*id:\s*'([^']+)',\s*label:\s*'([^']+)'[^}]*listTitle:\s*'([^']+)'[^}]*newBtnLabel:\s*'([^']+)'[^}]*formNewTitle:\s*'([^']+)'", admin):
    print(f"  {m.group(1):16} | {m.group(2):22} | {m.group(3):18} | {m.group(4)} | {m.group(5)}")
