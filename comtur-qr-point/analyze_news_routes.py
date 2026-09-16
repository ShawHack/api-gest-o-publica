#!/usr/bin/env python3
from pathlib import Path
import re

f = Path("/home/semit/Documentos/api-semit/backend/public/turismo/assets/index-BsvdOgSz.js")
t = f.read_text(encoding="utf-8", errors="ignore")

# find path strings around news
for m in re.finditer(r".{0,80}noticias.{0,120}", t):
    print("N", m.group(0).replace("\n", " ")[:200])
    print("---")

for m in re.finditer(r".{0,60}type:\"news\".{0,120}", t):
    print("T", m.group(0).replace("\n", " ")[:200])
    print("---")

for m in re.finditer(r".{0,40}/api/comtur/content[^\"']{0,80}", t):
    print("API", m.group(0).replace("\n", " ")[:180])
    print("---")

# createBrowserRouter or Route paths
paths = sorted(set(re.findall(r'path:\s*[\"']([^\"']+)[\"']', t)))
print("PATHS", [p for p in paths if not p.startswith(":") ][:80])
