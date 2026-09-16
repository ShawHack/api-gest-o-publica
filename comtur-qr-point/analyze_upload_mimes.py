#!/usr/bin/env python3
from pathlib import Path
import re
root = Path("/home/semit/Documentos/api-semit/backend")
# find upload mime allowlist
for p in list(root.rglob("*media*")) + list(root.rglob("*upload*")) + list(root.rglob("*Comtur*")):
    if p.is_file() and p.suffix in {".js", ".ts", ".mjs"}:
        t = p.read_text(encoding="utf-8", errors="ignore")
        if "csv" in t.lower() or "xlsx" in t.lower() or "mimetype" in t.lower() or "allowed" in t.lower():
            if any(k in t.lower() for k in ["csv", "xlsx", "spreadsheet", "multipart", "upload"]):
                print("FILE", p)
                for m in re.finditer(r".{0,40}(csv|xlsx|json|mime|allowed|accept).{0,80}", t, re.I):
                    s = m.group(0).replace("\n"," ")
                    if len(s) < 160:
                        print(" ", s)
print("--- routes ---")
for p in (root/"routes").glob("*.js"):
    t = p.read_text(encoding="utf-8", errors="ignore")
    if "comtur" in t.lower() and "upload" in t.lower():
        print(p)
        for m in re.finditer(r".{0,30}upload.{0,100}", t, re.I):
            print(" ", m.group(0).replace("\n"," ")[:140])
