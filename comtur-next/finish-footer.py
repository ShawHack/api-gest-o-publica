#!/usr/bin/env python3
from pathlib import Path
src = Path("/tmp/comtur-footer")
public = Path("/home/semit/Documentos/api-semit/backend/public/turismo")
(public / "assets").mkdir(parents=True, exist_ok=True)
(public / "index.html").write_bytes((src / "index.html").read_bytes())
for item in src.glob("index-*"):
    (public / "assets" / item.name).write_bytes(item.read_bytes())
    print("ok", item.name)
print("FOOTER_OK")
