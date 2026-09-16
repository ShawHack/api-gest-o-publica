#!/usr/bin/env python3
from pathlib import Path
import re, subprocess

ADMIN = Path("/home/semit/Documentos/api-semit/backend/public/comtur-content-admin.html")
text = ADMIN.read_text(encoding="utf-8")

# Find remaining unsafe gastro*.value / .checked / .trim patterns
unsafe = re.findall(r"\$\('(gastro[^']+)'\)\.(value|checked)", text)
print("UNSAFE_COUNT", len(unsafe))
for u in sorted(set(unsafe)):
    exists = f'id="{u[0]}"' in text
    print(f"  {u[0]}.{u[1]} exists={exists}")

# Replace in load/reset paths carefully:
# $('gastroX').value = ...  -> if ($('gastroX')) $('gastroX').value = ...
# $('gastroX').value.trim() already fixed in build
# $('gastroX').checked = 

# For assignments like: if ($('gastroName')) $('gastroName').value = ...
# Pattern: $('gastroFoo').value = 
# Pattern: $('gastroFoo').checked =

def safe_assign(src: str) -> str:
    # value assignments
    src2 = re.sub(
        r"(?<!if \()\$\('(gastro[^']+)'\)\.value\s*=",
        r"if ($('\1')) $('\1').value =",
        src,
    )
    # checked assignments
    src2 = re.sub(
        r"(?<!if \()\$\('(gastro[^']+)'\)\.checked\s*=",
        r"if ($('\1')) $('\1').checked =",
        src2,
    )
    # remaining .value reads outside fieldVal - convert common ones
    # $('gastroX').value.trim() 
    src2 = re.sub(
        r"\$\('(gastro[^']+)'\)\.value\.trim\(\)",
        r"fieldVal('\1')",
        src2,
    )
    # $('gastroX').value (bare read) - careful not to break assignments already guarded
    # Only replace when not followed by = and not already fieldVal
    src2 = re.sub(
        r"\$\('(gastro[^']+)'\)\.value(?!\s*=)",
        r"fieldVal('\1')",
        src2,
    )
    # $('gastroX').checked reads
    src2 = re.sub(
        r"\$\('(gastro[^']+)'\)\.checked(?!\s*=)",
        r"!!fieldVal('\1', false)",
        src2,
    )
    return src2

text2 = safe_assign(text)
print("CHANGED", text2 != text)

# fix double if (if ($('x')) if ($('x'))
text2 = re.sub(r"if \(\$\('(gastro[^']+)'\)\) if \(\$\('\1'\)\)", r"if ($('\1'))", text2)

ADMIN.write_text(text2, encoding="utf-8")

# syntax
Path("/tmp/check_admin4.js").write_text(
    "const fs=require('fs');const h=fs.readFileSync('/home/semit/Documentos/api-semit/backend/public/comtur-content-admin.html','utf8');"
    "const scripts=[...h.matchAll(/<script>([\\s\\S]*?)<\\/script>/g)].map(m=>m[1]).join('\\n');"
    "try{new Function(scripts); console.log('SYNTAX_OK')}catch(e){console.error('SYNTAX_ERR', e.message); process.exit(1)}",
    encoding="utf-8",
)
r = subprocess.run(["node", "/tmp/check_admin4.js"], capture_output=True, text=True)
print(r.stdout.strip() or r.stderr.strip())

text3 = ADMIN.read_text(encoding="utf-8")
left = re.findall(r"\$\('(gastro[^']+)'\)\.(value|checked)", text3)
print("LEFT", left)
print("DONE")
