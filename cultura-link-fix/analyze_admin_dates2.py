#!/usr/bin/env python3
from pathlib import Path
import re

paths = [
    Path("/home/semit/Documentos/api-semit/backend/public/cultura/admin.html"),
    Path("/home/semit/Documentos/api-semit/backend/public/cultura/cultura-api.js"),
]
# also search backend for cultura news routes
for p in Path("/home/semit/Documentos/api-semit/backend").rglob("*"):
    if p.is_file() and p.suffix in {".js", ".ts", ".mjs"} and p.stat().st_size < 2_000_000:
        name = str(p).lower()
        if "cultura" in name or "pnab" in name:
            paths.append(p)

seen = set()
for p in paths:
    if str(p) in seen or not p.exists():
        continue
    seen.add(str(p))
    t = p.read_text(encoding="utf-8", errors="ignore")
    if "dataCriacao" not in t and "dataEvento" not in t and "sessions" not in t:
        continue
    print("\n########", p)
    for key in ["dataCriacao", "dataPublicacao", "dataEvento", "dataInicio", "horario", "sessions", "new Date"]:
        if key in t:
            print(f"  has {key}: {t.count(key)}")
    # extract relevant chunks
    for m in re.finditer(r".{0,60}dataCriacao.{0,120}", t):
        print("CTX", m.group(0).replace("\n", " ")[:220])
    for m in re.finditer(r"function\s+\w*(save|salvar|create|criar|build|payload|submit)\w*\s*\([^)]*\)\s*\{", t, re.I):
        start = m.start()
        print("FN", m.group(0), "at", start)

# Focused dump around dataCriacao assignment in admin
admin = Path("/home/semit/Documentos/api-semit/backend/public/cultura/admin.html").read_text(encoding="utf-8")
print("\n=== ALL dataCriacao occurrences with wider context ===")
for m in re.finditer(r"dataCriacao", admin):
    i = m.start()
    print(admin[max(0, i - 250): i + 250].replace("\n", "\n"))
    print("-----")

print("\n=== session/agenda date inputs ===")
for m in re.finditer(r"id=\"[^\"]*(data|date|hora|session)[^\"]*\"", admin, re.I):
    print(m.group(0))
