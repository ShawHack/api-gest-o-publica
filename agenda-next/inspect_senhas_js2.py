#!/usr/bin/env python3
from pathlib import Path
t = Path("/tmp/senhas.js").read_text(encoding="utf-8", errors="replace")
idx = 0
n = 0
while n < 25:
    i = t.lower().find("novosga", idx)
    if i < 0:
        break
    print("---", i, "---")
    print(t[max(0, i - 80): i + 120].replace("\n", " "))
    idx = i + 7
    n += 1
print("href count", t.count("href"))
for kw in ["modules", "links", "cards", "atendente", "totem", "chamada"]:
    print(kw, t.lower().count(kw.lower()))
