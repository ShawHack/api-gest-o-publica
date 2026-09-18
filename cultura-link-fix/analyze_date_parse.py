#!/usr/bin/env python3
from pathlib import Path
import re

for f in [
    "/home/semit/Documentos/api-semit/backend/public/cultura/eventos/eventos.js",
    "/home/semit/Documentos/api-semit/backend/public/cultura/eventos/detalhes.js",
    "/home/semit/Documentos/api-semit/backend/public/cultura/admin.html",
]:
    t = Path(f).read_text(encoding="utf-8", errors="ignore")
    print("\n====", f, "====")
    for m in re.finditer(r"function\s+getCreationDateStr[\s\S]{0,600}", t):
        print(m.group(0)[:600])
    for m in re.finditer(r"new Date\([^)]*\)", t):
        # show surrounding
        i = m.start()
        ctx = t[max(0,i-80):i+100].replace("\n"," ")
        print("NEWDATE", ctx[:200])

# sample DB docs
print("\n==== sample posts from mongo ====")
