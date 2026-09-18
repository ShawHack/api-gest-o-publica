#!/usr/bin/env python3
from pathlib import Path

files = [
    "/home/semit/Documentos/api-semit/backend/models/CulturaPost.js",
    "/home/semit/Documentos/api-semit/backend/controllers/CulturaPostController.js",
    "/home/semit/Documentos/api-semit/backend/public/cultura/eventos/eventos.js",
]
for f in files:
    p = Path(f)
    print("\n" + "=" * 20, p.name, "=" * 20)
    print(p.read_text(encoding="utf-8", errors="ignore")[:8000])
