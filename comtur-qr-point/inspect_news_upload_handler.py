#!/usr/bin/env python3
from pathlib import Path
admin = Path("/home/semit/Documentos/api-semit/backend/public/comtur-content-admin.html").read_text(encoding="utf-8")
i = admin.find("async function uploadNewsCover")
print(admin[i:i+1600])
print("==== controller ====")
print(Path("/home/semit/Documentos/api-semit/backend/controllers/ComturMediaController.js").read_text(encoding="utf-8")[:800])
# compare other uploads success checks
for name in ["uploadResearchCover", "uploadAcc", "uploadNewsCover", "uploadOpenData"]:
    j = admin.find(f"async function {name}")
    if j < 0:
        j = admin.find(f"function {name}")
    chunk = admin[j:j+1200] if j>=0 else ""
    print(f"\n-- {name} --")
    for line in chunk.splitlines():
        if "data.url" in line or "payload" in line or "res.ok" in line or "fetchAuth" in line or "fetchWithAuth" in line:
            print(line.strip())
