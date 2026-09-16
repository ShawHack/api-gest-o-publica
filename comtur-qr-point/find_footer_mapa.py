#!/usr/bin/env python3
from pathlib import Path
from datetime import datetime
import re

f = Path("/home/semit/Documentos/api-semit/backend/public/turismo/assets/index-BsvdOgSz.js")
t = f.read_text(encoding="utf-8")
print("Mapa turístico count", t.count("Mapa turístico"))
for m in re.finditer(r".{0,160}Mapa turístico.{0,160}", t):
    print("---")
    print(m.group(0))
