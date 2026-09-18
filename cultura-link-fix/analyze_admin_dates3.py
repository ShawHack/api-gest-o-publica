#!/usr/bin/env python3
from pathlib import Path
import re

admin = Path("/home/semit/Documentos/api-semit/backend/public/cultura/admin.html").read_text(encoding="utf-8")
api = Path("/home/semit/Documentos/api-semit/backend/public/cultura/cultura-api.js").read_text(encoding="utf-8")
print("=== cultura-api.js ===")
print(api[:3000])
print("\n=== admin API endpoints ===")
for m in re.finditer(r"[\"'`]/api/[^\"'`]{5,120})", admin):
    print(m.group(1))
print("\n=== save/submit functions ===")
for m in re.finditer(r"(async\s+)?function\s+(\w+)\s*\([^)]*\)\s*\{", admin):
    name = m.group(2)
    if re.search(r"save|salvar|submit|post|session|agenda|edit|load|render", name, re.I):
        print(name, "at", m.start())

# dump savePost / addSession / renderList chunks
for name in ["savePost", "salvarPost", "submitPost", "addSession", "incluirAgenda", "renderPosts", "loadPosts", "editPost", "buildPayload"]:
    i = admin.find(f"function {name}")
    if i < 0:
        i = admin.find(f"async function {name}")
    if i >= 0:
        print(f"\n===== {name} =====")
        print(admin[i:i+1800])
