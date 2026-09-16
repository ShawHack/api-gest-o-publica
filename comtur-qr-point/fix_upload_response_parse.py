#!/usr/bin/env python3
"""Fix COMTUR admin upload handlers to read nested {data:{url}} responses."""
from pathlib import Path
from datetime import datetime
import re

ADMIN = Path("/home/semit/Documentos/api-semit/backend/public/comtur-content-admin.html")
NAV = Path("/home/semit/Documentos/api-semit/backend/public/comtur-admin-nav.js")
text = ADMIN.read_text(encoding="utf-8")
bak = ADMIN.with_name(f"comtur-content-admin.html.bak-uploadfix-{datetime.now().strftime('%Y%m%d-%H%M%S')}")
bak.write_bytes(ADMIN.read_bytes())
print("BAK", bak.name)

# Common broken pattern after res.json():
#   const data = await res.json();
#   if (res.ok && data.url) {
# Replace with unwrap for known upload functions by patching globally careful patterns.

# Pattern A: const data = await res.json();\n      if (res.ok && data.url)
old_a = "const data = await res.json();\n      if (res.ok && data.url)"
new_a = "const payload = await res.json().catch(() => ({}));\n      const data = payload.data || payload;\n      if (res.ok && data.url)"
count_a = text.count(old_a)
text = text.replace(old_a, new_a)
print("PATTERN_A", count_a)

# Pattern B: already has payload in some places - skip
# Also fix error messages that use data.error when payload.error exists
# In news: data.error after failed - if we renamed to payload, need to fix those branches
# After our replace, success uses `data`; failure still uses `data.error` which is ok if data = payload.data || payload (error is on top level)

# Fix branches that still say `data.error` after failed upload when const was only payload
# News specifically:
old_err = "showNotice(`Erro ao enviar imagem: ${data.error || 'Falha no upload'}`, true);"
new_err = "showNotice(`Erro ao enviar imagem: ${(payload && payload.error) || (data && data.error) || 'Falha no upload'}`, true);"
if old_err in text:
    text = text.replace(old_err, new_err)
    print("NEWS_ERR_MSG")

# Accountability / others may use data.error after same pattern - if const data was replaced with payload+data, data.error might be undefined on fail; payload.error works for top-level.

# Ensure news/acc functions that still do const data = await res.json() without unwrap get fixed via broader regex in upload functions
for fn in ["uploadNewsCover", "uploadResearchCover", "uploadResearchPdf", "uploadIntegrationCover", "uploadAccPdf", "uploadOpenDataFile"]:
    pass

# Secondary pattern with different indentation
old_b = "const data = await res.json();\n        if (res.ok && data.url)"
new_b = "const payload = await res.json().catch(() => ({}));\n        const data = payload.data || payload;\n        if (res.ok && data.url)"
count_b = text.count(old_b)
text = text.replace(old_b, new_b)
print("PATTERN_B", count_b)

ADMIN.write_text(text, encoding="utf-8")

# verify
t2 = ADMIN.read_text(encoding="utf-8")
i = t2.find("async function uploadNewsCover")
chunk = t2[i:i+1400]
print("NEWS_HAS_UNWRAP", "payload.data || payload" in chunk)
print("NEWS_STILL_RAW", "const data = await res.json();\n      if (res.ok && data.url)" in t2)

nt = NAV.read_text(encoding="utf-8")
nt2 = (
    nt.replace("comtur-content-admin.html?v=20", "comtur-content-admin.html?v=21")
      .replace("comtur-content-admin.html?v=19", "comtur-content-admin.html?v=21")
)
if nt2 != nt:
    NAV.write_text(nt2, encoding="utf-8")
    print("NAV_v21")

print("DONE", ADMIN.stat().st_size)
