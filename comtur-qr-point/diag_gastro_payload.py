#!/usr/bin/env python3
"""Find gastronomy buildPayload silent failures; harden showNotice as fixed toast."""
from pathlib import Path
from datetime import datetime
import re, subprocess

ADMIN = Path("/home/semit/Documentos/api-semit/backend/public/comtur-content-admin.html")
NAV = Path("/home/semit/Documentos/api-semit/backend/public/comtur-admin-nav.js")
text = ADMIN.read_text(encoding="utf-8")

# Extract all if (currentType === 'gastronomy') blocks in JS
for i, m in enumerate(re.finditer(r"if \(currentType === 'gastronomy'\) \{", text)):
    start = m.start()
    # naive brace match
    depth = 0
    end = start
    for j, ch in enumerate(text[start:], start):
        if ch == '{': depth += 1
        elif ch == '}':
            depth -= 1
            if depth == 0:
                end = j + 1
                break
    block = text[start:end]
    print(f"\n==== BLOCK {i} len={len(block)} ====")
    print(block[:2500])
    print("... tail ...")
    print(block[-800:])

# Check sharedNonGastroActions visibility for gastronomy
print("\nsharedNonGastro", "sharedNonGastroActions" in text)
idx = text.find("sharedNonGastroActions")
print(text[idx:idx+400])

# Syntax check with node
Path("/tmp/check_admin.js").write_text(
    "const fs=require('fs');const h=fs.readFileSync('/home/semit/Documentos/api-semit/backend/public/comtur-content-admin.html','utf8');"
    "const scripts=[...h.matchAll(/<script>([\\s\\S]*?)<\\/script>/g)].map(m=>m[1]).join('\\n');"
    "try{new Function(scripts); console.log('SYNTAX_OK', scripts.length)}catch(e){console.error('SYNTAX_ERR', e.message);}",
    encoding="utf-8",
)
r = subprocess.run(["node", "/tmp/check_admin.js"], capture_output=True, text=True)
print("NODE", r.stdout, r.stderr)
