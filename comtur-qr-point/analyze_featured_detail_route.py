#!/usr/bin/env python3
from pathlib import Path
import re

f = sorted(Path("/home/semit/Documentos/api-semit/backend/public/turismo/assets").glob("index-*.js"), key=lambda p: p.stat().st_mtime, reverse=True)[0]
t = f.read_text(encoding="utf-8", errors="ignore")
print("ACTIVE", f.name)

# find route p/ and type switch for detail
for pat in [
    r"p/\$\{[^}]+\}",
    r"[\"']p/[\"']",
    r"path===[\"']p/",
    r"startsWith\([\"']p/",
    r"case[\"']integration[\"']",
    r"open_data|research|legislation|accountability|council_member",
    r"DOCUMENTO DO COMTUR|Documento do COMTUR|documento",
    r"function Hn|Hn=|const Hn|Ht\(|function Ht",
]:
    ms = list(re.finditer(pat, t, re.I))
    print(pat, len(ms))
    for m in ms[:5]:
        i = m.start()
        print(" ", repr(t[max(0,i-60):i+160].replace("\n"," ")))

# find badge label map
for m in re.finditer(r".{0,30}(attraction|event|lodging|news|legislation|integration|open_data).{0,40}(.{0,40})", t):
    s = m.group(0)
    if "badge" in s.lower() or "label" in s.lower() or "Documento" in s or "Atrativo" in s:
        print("LBL", s[:160])
        if m.start() > 5:
            break

# Look for switch on item.type near detail render
idx = t.find('type==="attraction"?l.jsx')
print("\nDETAIL_SWITCH", t[idx-100:idx+800])
