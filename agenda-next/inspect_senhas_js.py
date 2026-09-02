#!/usr/bin/env python3
import re
from pathlib import Path
t = Path("/tmp/senhas.js").read_text(encoding="utf-8", errors="replace")
print("len", len(t))
for kw in ["Novo SGA", "novosga", "/senhas", "/sga", "gerenciador", "Painel"]:
    print(kw, t.lower().count(kw.lower()))
pat = re.compile(r'["\']([^"\']{0,100}(?:SGA|Senha|senha|triagem|Totem|gerenci)[^"\']{0,100})["\']')
seen = set()
for m in pat.finditer(t):
    s = m.group(1)
    if s not in seen and len(s) < 140:
        seen.add(s)
        print("STR", s)
