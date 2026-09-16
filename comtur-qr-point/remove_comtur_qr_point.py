#!/usr/bin/env python3
from pathlib import Path
import re

p = Path("/home/semit/Documentos/api-semit/backend/public/comtur-content-admin.html")
text = p.read_text(encoding="utf-8")
orig = text

text, n1 = re.subn(
    r'\s*<option value="qr_point">[^<]*</option>\s*',
    "\n",
    text,
    count=1,
)
text, n2 = re.subn(
    r"\s*\{ id: 'qr_point', label: 'Ponto QR',[^}]+\},?\n",
    "\n",
    text,
    count=1,
)
text, n3 = re.subn(
    r"\s*'ponto_qr': 'qr_point', 'ponto-qr': 'qr_point', 'qr': 'qr_point', 'qr_code': 'qr_point',\n",
    "\n",
    text,
    count=1,
)
text, n4 = re.subn(r",\n\s*'qr_point': 'qrPointFields'\n", "\n", text, count=1)
if n4 == 0:
    text, n4 = re.subn(r"\n\s*'qr_point': 'qrPointFields',\n", "\n", text, count=1)

# If someone opens ?type=qr_point, fall back to event
if "normalizeType(newType)" in text and "qr_point removed" not in text:
    text = text.replace(
        "currentType = normalizeType(newType);",
        "currentType = normalizeType(newType);\n"
        "    // qr_point removed — QR agora fica no mapaturistico antigo\n"
        "    if (currentType === 'qr_point') currentType = 'event';",
        1,
    )

if text != orig:
    p.write_text(text, encoding="utf-8")
    print("REMOVED", {"option": n1, "type": n2, "alias": n3, "map": n4})
else:
    print("NO_CHANGE", n1, n2, n3, n4)

nav = Path("/home/semit/Documentos/api-semit/backend/public/comtur-admin-nav.js")
nav_t = nav.read_text(encoding="utf-8")
nav_t2 = nav_t.replace(
    "comtur-content-admin.html?v=15", "comtur-content-admin.html?v=16"
).replace("comtur-content-admin.html?v=14", "comtur-content-admin.html?v=16")
if nav_t2 != nav_t:
    nav.write_text(nav_t2, encoding="utf-8")
    print("NAV_BUMPED_v16")

final = p.read_text(encoding="utf-8")
print("option_left", 'value="qr_point"' in final)
print("type_left", "id: 'qr_point'" in final)
