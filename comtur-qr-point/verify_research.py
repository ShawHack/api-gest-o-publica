#!/usr/bin/env python3
from pathlib import Path
import re

admin = Path("/home/semit/Documentos/api-semit/backend/public/comtur-content-admin.html").read_text(encoding="utf-8")
checks = [
    'id="researchFields"',
    "'research': 'researchFields'",
    "Nenhuma pesquisa cadastrada",
    "item.type === 'research'",
    "currentType === 'research'",
    "PESQUISAS",
    "Nova pesquisa",
    "Buscar pesquisa",
    "admin/content/${savedId}/transition",
]
for c in checks:
    print(("OK" if c in admin else "MISS"), c)

i = admin.find("specializedMap")
print("MAP_SNIP", repr(admin[i : i + 400]))

# how sidebar titles work
for m in re.finditer(r"research|Pesquisa|TYPE_|typeConfig|labels\[|CONTENT_TYPE", admin):
    pass

# find type option and labels around research
for m in re.finditer(r".{0,80}research.{0,80}", admin):
    s = m.group(0).replace("\n", " ")
    if "option" in s.lower() or "label" in s.lower() or "title" in s.lower() or "Nova" in s:
        print("CTX", s[:180])

# find setType / updateUI titles
for needle in ["function setType", "function updateChrome", "listTitle", "btnNewLabel", "searchPlaceholder", "TYPE_META", "typeMeta"]:
    idx = admin.find(needle)
    print("FIND", needle, idx)

# print TYPE related object if exists
for pat in [r"const TYPE_[A-Z]+ = \{[\s\S]{0,2500}?research[\s\S]{0,400}", r"research:\s*\{[\s\S]{0,300}\}"]:
    m = re.search(pat, admin)
    if m:
        print("OBJ", m.group(0)[:500])

# nginx block
nginx = Path("/home/semit/Documentos/api-semit/nginx/nginx.conf").read_text(encoding="utf-8")
idx = nginx.find("pesquisas")
print("NGINX", nginx[idx - 80 : idx + 500] if idx >= 0 else "missing")
print("PAGES", list(Path("/home/semit/Documentos/api-semit/backend/public/turismo/pesquisas").iterdir()))
