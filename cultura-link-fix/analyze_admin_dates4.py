#!/usr/bin/env python3
from pathlib import Path
import re

admin = Path("/home/semit/Documentos/api-semit/backend/public/cultura/admin.html").read_text(encoding="utf-8")

print("=== /api/cultura mentions ===")
for m in re.finditer(r"/api/cultura[^\"'\s)]*", admin):
    print(m.group(0))

print("\n=== function names ===")
for m in re.finditer(r"(async\s+)?function\s+(\w+)", admin):
    name = m.group(2)
    if re.search(r"save|salvar|submit|post|session|agenda|edit|load|render|fetch", name, re.I):
        print(name)

for name in ["savePost", "salvar", "addSession", "renderPosts", "loadPosts", "editPost", "fetchPosts", "handleSubmit", "submitForm"]:
    for prefix in ["function ", "async function "]:
        i = admin.find(prefix + name)
        if i >= 0:
            print(f"\n===== {prefix}{name} =====")
            print(admin[i:i+2200])
            break

# tempDate / sessions usage
print("\n=== tempDate / sessions chunks ===")
for key in ["tempDate", "tempStart", "tempEnd", "sessions", "dataCriacao", "dataInicio"]:
    idxs = [m.start() for m in re.finditer(re.escape(key), admin)]
    print(key, "count", len(idxs))
    for i in idxs[:3]:
        print(admin[max(0,i-120):i+180].replace("\n", " | "))
        print("---")

# backend routes
print("\n=== backend cultura routes ===")
for p in Path("/home/semit/Documentos/api-semit/backend").rglob("*Cultura*"):
    print(p)
for p in Path("/home/semit/Documentos/api-semit/backend/routes").glob("*.js"):
    t = p.read_text(encoding="utf-8", errors="ignore")
    if "cultura" in t.lower() or "dataCriacao" in t:
        if "Cultura" in p.name or "/cultura" in t or "cultura/" in t:
            print("ROUTE", p.name, "cultura refs", t.lower().count("cultura"))
