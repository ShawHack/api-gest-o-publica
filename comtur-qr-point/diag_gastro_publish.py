#!/usr/bin/env python3
"""Diagnose gastronomy publish + noticeNearActions on live admin."""
from pathlib import Path
import re

admin = Path("/home/semit/Documentos/api-semit/backend/public/comtur-content-admin.html").read_text(encoding="utf-8")
nav = Path("/home/semit/Documentos/api-semit/backend/public/comtur-admin-nav.js").read_text(encoding="utf-8")

print("HAS noticeNearActions", "noticeNearActions" in admin)
print("NAV refs", re.findall(r"comtur-content-admin\.html\?v=\d+", nav))

# showNotice function
m = re.search(r"function showNotice\(msg, isError = false\) \{[\s\S]{0,2500}?\n  \}", admin)
print("SHOWNOTICE_LEN", len(m.group(0)) if m else None)
if m:
    print(m.group(0)[:1200])

# syntax risk: check brace balance around showNotice
# find saveContent for gastronomy / errors swallowed
i = admin.find("async function saveContent")
print("\nSAVECONTENT", admin[i:i+1800])

# gastronomy buildPayload validation that might return null silently
for needle in ["currentType === 'gastronomy'", "gastro", "buildPayload"]:
    print(needle, admin.count(needle))

j = admin.find("if (currentType === 'gastronomy')")
# find in buildPayload region
parts = admin.split("// Default / Standard")
print("build sections", len(parts))
# search all gastronomy build blocks
for m in re.finditer(r"if \(currentType === 'gastronomy'\) \{[\s\S]{0,2000}", admin):
    chunk = m.group(0)[:1500]
    if "showNotice" in chunk or "return null" in chunk or "title" in chunk:
        print("\n--- GASTRO BLOCK ---")
        print(chunk[:1500])
        break

# actions bar for gastronomy - id
k = admin.find("gastronomyFields")
print("\nGASTRO_ACTIONS", "comtur-actions-bar" in admin[k:k+50000])
# count actions bars inside gastronomyFields
end = admin.find('id="', k+20)
# better: find closing of gastronomyFields by next category
end = admin.find('id="lodgingFields"', k)
if end < 0:
    end = admin.find('id="newsFields"', k)
chunk = admin[k:end]
print("gastro chunk size", len(chunk))
print("actions-bar in gastro", chunk.count("comtur-actions-bar"))
print("Publicar in gastro", chunk.count("Publicar"))
# print last 800 of gastro form
print(chunk[-900:])

# Check if showNotice has JS syntax error - unbalanced template
sn = m.group(0) if m else ""
print("backticks in showNotice", sn.count("`"))
print("unescaped issues", "\\'" in sn)
