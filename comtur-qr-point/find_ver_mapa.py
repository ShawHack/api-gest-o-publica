#!/usr/bin/env python3
from pathlib import Path
import re

f = Path("/home/semit/Documentos/api-semit/backend/public/turismo/assets/index-BsvdOgSz.js")
t = f.read_text(encoding="utf-8")
print("Ver mapa count", t.count("Ver mapa"))
for m in re.finditer(r".{0,120}Ver mapa.{0,120}", t):
    print("---")
    print(m.group(0))
