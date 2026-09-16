#!/usr/bin/env python3
from pathlib import Path
import re

admin = Path("/home/semit/Documentos/api-semit/backend/public/comtur-content-admin.html").read_text(encoding="utf-8")
helper = Path("/home/semit/Documentos/api-semit/backend/helpers/comtur-content.js").read_text(encoding="utf-8")

print("=== url() ===")
i = helper.find("function url")
print(helper[i:i+500])

print("\n=== gastroMedia usages ===")
for m in re.finditer(r".{0,40}gastroMedia.{0,80}", admin):
    s = m.group(0).replace("\n", " ")
    print(s[:140])

print("\n=== push objects ===")
for m in re.finditer(r"gastroMedia\.push\((\{[\s\S]{0,600}?\})\)", admin):
    print(m.group(1)[:500])
    print("---")

# upload gastro success assignment
for pat in ["ObjectURL", "kind:", "isCover", "gastroCoverUrl", "uploadGastro", "onGastroFiles"]:
    print(pat, admin.count(pat))

i = admin.find("gastroCoverUrl")
print("\nCOVER CTX", admin[i:i+800] if i>=0 else None)
# find file input change for gastro gallery
i = admin.find("gastroGallery")
print("\nGALLERY", admin[i:i+1200] if i>=0 else "no")
