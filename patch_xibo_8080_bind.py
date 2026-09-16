#!/usr/bin/env python3
"""CTIR #134353: publicar 8080 apenas no IP LAN 10.15.25.28."""
from pathlib import Path
from datetime import datetime

path = Path("/home/semit/Documentos/api-semit/docker-compose.yml")
text = path.read_text(encoding="utf-8")
bak = path.with_name(
    "docker-compose.yml.bak-ctir-8080-" + datetime.now().strftime("%Y%m%d-%H%M%S")
)
bak.write_text(text, encoding="utf-8")
print("backup", bak)

old = '      - "8080:8080"'
new = '      - "10.15.25.28:8080:8080"  # CTIR #134353: so LAN, nao 0.0.0.0'

if old not in text:
    if '10.15.25.28:8080:8080' in text:
        print("ja restrito")
    else:
        raise SystemExit("linha 8080:8080 nao encontrada")
else:
    path.write_text(text.replace(old, new, 1), encoding="utf-8")
    print("compose patched")
