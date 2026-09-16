#!/usr/bin/env python3
"""CTIR #134353: remove publicacao da porta 8080 (nao escuta na internet)."""
from pathlib import Path
from datetime import datetime

path = Path("/home/semit/Documentos/api-semit/docker-compose.yml")
text = path.read_text(encoding="utf-8")
stamp = datetime.now().strftime("%Y%m%d-%H%M%S")
bak = path.with_name("docker-compose.yml.bak-ctir-8080-" + stamp)
bak.write_text(text, encoding="utf-8")
print("backup", bak)

# Aceita tanto binding publico quanto ja restrito a LAN
candidates = [
    '      - "8080:8080"\n',
    '      - "10.15.25.28:8080:8080"  # CTIR #134353: so LAN, nao 0.0.0.0\n',
    '      - "10.15.25.28:8080:8080"\n',
]
replacement = (
    "      # CTIR #134353: 8080 removida da internet.\n"
    "      # CMS interno: http://10.15.25.29/  (sem porta publica)\n"
)

found = False
for old in candidates:
    if old in text:
        text = text.replace(old, replacement, 1)
        found = True
        break

if not found:
    if "CTIR #134353: 8080 removida" in text:
        print("ja removida")
    else:
        raise SystemExit("linha 8080 nao encontrada no compose")
else:
    path.write_text(text, encoding="utf-8")
    print("compose: 8080 unpublished")
