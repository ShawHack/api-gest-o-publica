#!/usr/bin/env python3
from pathlib import Path
import re

admin = Path("/home/semit/Documentos/api-semit/backend/public/comtur-content-admin.html").read_text(encoding="utf-8")

# find showNotice and notice element
for needle in ["function showNotice", "id=\"notice\"", "comtur-notice", "showNotice("]:
    print(needle, admin.count(needle), "first", admin.find(needle))

i = admin.find("function showNotice")
print("\n=== showNotice ===")
print(admin[i:i+900])

# find notice HTML
for m in re.finditer(r'.{0,80}id="[^"]*notice[^"]*".{0,120}', admin, re.I):
    print("HTML", m.group(0)[:200])

# actions bar near gastronomy publish
j = admin.find("Publicar Imediatamente")
print("\nPUB_BTN", admin[j-200:j+250])

# shared actions
for needle in ["sharedNonGastroActions", "comtur-actions-bar", "saveContent('published')"]:
    print(needle, admin.count(needle))
