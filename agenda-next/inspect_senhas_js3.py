#!/usr/bin/env python3
import re
from pathlib import Path
t = Path("/tmp/senhas.js").read_text(encoding="utf-8", errors="replace")
# long-ish portuguese UI strings
found = []
for m in re.finditer(r'`([^`]{6,80})`', t):
    s = m.group(1)
    if any(c.isalpha() for c in s) and not s.startswith("http") and "function" not in s:
        if re.search(r"[A-Za-zÀ-ú]", s):
            found.append(s)
# unique preserve order
seen=set(); out=[]
for s in found:
    if s not in seen:
        seen.add(s); out.append(s)
# filter likely UI
keys=("Painel","Senha","Admin","Novo","Gerenci","Unidade","Servi","Login","Config","TV","Totem","Abrir","Acesso","Módulo","SEMIT")
for s in out:
    if any(k.lower() in s.lower() for k in keys) or (len(s)<40 and " " in s and s[0].isupper()):
        print(s)
print("---PATHS---")
for m in re.finditer(r'["\'](/[a-zA-Z0-9_./-]{2,60})["\']', t):
    p=m.group(1)
    if p.startswith("/assets"): continue
    if any(x in p for x in ("admin","p/","painel","login","sga","senha")):
        print(p)
