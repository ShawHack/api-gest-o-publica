#!/usr/bin/env python3
from pathlib import Path
import re

p = Path("/home/semit/Documentos/api-semit/backend/public/cultura/admin.html")
t = p.read_text(encoding="utf-8", errors="ignore")
print("size", len(t))
for pat in [
    "Invalid Date", "Criado em", "toLocaleDateString", "toISOString",
    "getTimezoneOffset", "createdAt", "publishedAt", "dataEvento",
    "eventDate", "sessions", "agenda", "T00:00:00", "UTC",
]:
    print(f"{pat}: {t.count(pat)}")

print("\n=== Criado em ===")
for m in re.finditer(r".{0,80}Criado em.{0,200}", t):
    print(m.group(0).replace("\n", " ")[:350])
    print("---")

print("\n=== date format helpers ===")
for m in re.finditer(r"function\s+\w*[Dd]ate\w*\s*\([^)]*\)\s*\{[\s\S]{0,800}?\}", t):
    print(m.group(0)[:900])
    print("====")

print("\n=== toISOString / new Date(value) near save ===")
for m in re.finditer(r".{0,100}(toISOString|new Date\([^)]*\)).{0,100}", t):
    s = m.group(0).replace("\n", " ")
    if any(k in s.lower() for k in ["creat", "publish", "agenda", "session", "data", "save", "payload", "inicio", "start"]):
        print(s[:300])
        print("---")
