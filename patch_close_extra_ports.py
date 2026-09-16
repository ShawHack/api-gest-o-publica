#!/usr/bin/env python3
"""Fecha 8082/8088/8090 no nginx e 3050 publico no tv-semit."""
from pathlib import Path
from datetime import datetime
import json
import subprocess
import sys

stamp = datetime.now().strftime("%Y%m%d-%H%M%S")

compose = Path("/home/semit/Documentos/api-semit/docker-compose.yml")
text = compose.read_text(encoding="utf-8")
bak = compose.with_name(f"docker-compose.yml.bak-ctir-ports-{stamp}")
bak.write_text(text, encoding="utf-8")
print("backup", bak)

for old, new in [
    ('      - "8088:8088"\n', "      # CTIR: 8088 removida (painel via /painel-senhas/)\n"),
    ('      - "8082:8082"\n', "      # CTIR: 8082 removida (triagem via /triagem/)\n"),
    ('      - "8090:8090"\n', "      # CTIR: 8090 removida (orfa)\n"),
]:
    if old not in text:
        print("MISSING", old.strip())
        sys.exit(1)
    text = text.replace(old, new, 1)
    print("ok", old.strip())

compose.write_text(text, encoding="utf-8")
print("compose patched")
