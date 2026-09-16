#!/usr/bin/env python3
from pathlib import Path
from datetime import datetime

f = Path("/home/semit/Documentos/api-semit/backend/public/turismo/assets/index-BsvdOgSz.js")
t = f.read_text(encoding="utf-8")
bak = f.with_suffix(f.suffix + f".bak-vermapa-{datetime.now().strftime('%Y%m%d-%H%M%S')}")
bak.write_text(t, encoding="utf-8")

old = ',l.jsx("a",{...To,children:"Ver mapa"})'
if old not in t:
    # try without comma variants
    raise SystemExit("pattern not found: " + repr(t[t.find("Ver mapa")-80:t.find("Ver mapa")+40]))

t2 = t.replace(old, "", 1)
f.write_text(t2, encoding="utf-8")
print("REMOVED", bak.name)
print("remaining Ver mapa", t2.count("Ver mapa"))
# show context
i = t2.find("Em evidência")
print(t2[i:i+220])
