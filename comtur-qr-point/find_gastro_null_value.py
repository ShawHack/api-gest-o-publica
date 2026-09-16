#!/usr/bin/env python3
"""Find null .value access in gastronomy buildPayload vs actual form fields."""
from pathlib import Path
import re

admin = Path("/home/semit/Documentos/api-semit/backend/public/comtur-content-admin.html").read_text(encoding="utf-8")

# gastronomyFields HTML ids
start = admin.find('id="gastronomyFields"')
end = admin.find('id="lodgingFields"', start)
if end < 0:
    end = admin.find('<!-- 5. LODGING', start)
chunk = admin[start:end]
html_ids = set(re.findall(r'\bid="([^"]+)"', chunk))
print("HTML ids count", len(html_ids))

# buildPayload gastronomy block
m = re.search(r"if \(currentType === 'gastronomy'\) \{\n      const name[\s\S]*?media: gastroMedia\n      \};\n    \}", admin)
if not m:
    m = re.search(r"if \(currentType === 'gastronomy'\) \{\n      if \(!name\)[\s\S]*?media: gastroMedia\n      \};\n    \}", admin)
if not m:
    # broader
    idx = admin.find("if (currentType === 'gastronomy') {\n      const name")
    if idx < 0:
        idx = admin.find("if (currentType === 'gastronomy') {\n      if (!name)")
    # find from first gastro build with $('gastro
    for mm in re.finditer(r"if \(currentType === 'gastronomy'\) \{", admin):
        block_start = mm.start()
        snippet = admin[block_start:block_start+3500]
        if "$('gastroName')" in snippet or "$('gastroPublishDate')" in snippet:
            m = type("M", (), {"group": lambda self, n=0: snippet})()
            break

block = m.group(0) if m else ""
print("BLOCK_FOUND", bool(block), "len", len(block))
print(block[:2200])

used = re.findall(r"\$\('([^']+)'\)", block)
print("\nUSED IDS:")
missing = []
for uid in used:
    ok = uid in html_ids or uid in admin[start:start+200]  # unlikely
    # also search whole admin for id=
    exists = f'id="{uid}"' in admin
    print(f"  {uid}: {'OK' if exists else 'MISSING'}")
    if not exists:
        missing.append(uid)

print("\nMISSING", missing)

# specifically check featured / publish date
for uid in ["gastroFeatured", "gastroPublishDate", "gastroName", "gastroSlug", "gastroSummary", "gastroBody"]:
    print(uid, "exists", f'id="{uid}"' in admin)
    # find context if exists
    i = admin.find(f'id="{uid}"')
    if i >= 0:
        print(" ", admin[i-80:i+120].replace("\n"," ")[:180])
