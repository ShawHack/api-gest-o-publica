#!/usr/bin/env python3
from pathlib import Path
import re

assets = Path("/home/semit/Documentos/api-semit/backend/public/turismo/assets")
files = sorted(assets.glob("index-*.js"), key=lambda p: p.stat().st_mtime, reverse=True)[:2]
for f in files:
    t = f.read_text(encoding="utf-8", errors="ignore")
    print("FILE", f.name, "size", len(t))
    for needle in [
        "noticias",
        "pesquisas",
        "type=news",
        'type:"news"',
        "/api/comtur/content",
        "research",
    ]:
        print(" ", needle, t.count(needle))
    routes = sorted(
        set(
            re.findall(
                r"[\"']/(?:noticias|pesquisas|atrativos|eventos|comtur|transparencia)[^\"']{0,80}",
                t,
            )
        )
    )
    print(" routes", routes[:40])

# accountability upload snippet lines
admin = Path("/home/semit/Documentos/api-semit/backend/public/comtur-content-admin.html")
lines = admin.read_text(encoding="utf-8").splitlines()
for i, line in enumerate(lines, 1):
    if "async function uploadAcc" in line or "accPdfFile" in line and "let " in line:
        print("ADMIN", i, line[:120])
    if "function buildPayload" in line:
        print("BUILD", i)
    if "currentType === 'accountability'" in line:
        print("ACC", i, line[:100])
    if "currentType === 'news'" in line and "if (" in line:
        print("NEWS", i, line[:100])
