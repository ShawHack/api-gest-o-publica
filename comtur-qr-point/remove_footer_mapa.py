#!/usr/bin/env python3
from pathlib import Path
from datetime import datetime

f = Path("/home/semit/Documentos/api-semit/backend/public/turismo/assets/index-BsvdOgSz.js")
t = f.read_text(encoding="utf-8")
bak = f.with_suffix(f.suffix + f".bak-footer-mapa-{datetime.now().strftime('%Y%m%d-%H%M%S')}")
bak.write_text(t, encoding="utf-8")

# Remove entire Portal column (heading + Mapa turístico link)
old = ',l.jsxs("div",{children:[l.jsx("span",{children:"Portal"}),l.jsx("p",{children:l.jsx("a",{...To,children:"Mapa turístico"})})]})'
if old not in t:
    raise SystemExit("pattern not found near: " + repr(t[t.find("Mapa turístico")-120:t.find("Mapa turístico")+80]))

t2 = t.replace(old, "", 1)
f.write_text(t2, encoding="utf-8")
print("REMOVED", bak.name)
print("Mapa turístico left", t2.count("Mapa turístico"))
print("Portal left in footer context", "children:\"Portal\"" in t2)
i = t2.find('children:"Explorar"')  # nearby footer maybe
# show around where it was - look for footer-ish
needle = 'children:"Portal"'
print("portal spans", t2.count(needle))
# show nearby after removal - find "}:null,l.jsxs" pattern remnant
j = t2.find("]}):null,")
# better: find unique nearby "b&&l.jsx(Nh"
k = t2.find("b&&l.jsx(Nh")
print("CTX", t2[k-180:k+40])
