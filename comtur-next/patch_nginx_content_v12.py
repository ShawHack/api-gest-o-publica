#!/usr/bin/env python3
from pathlib import Path
p = Path("/home/semit/Documentos/api-semit/nginx/nginx.conf")
t = p.read_text(encoding="utf-8")
t2 = t.replace("comtur-content-admin.html?v=10", "comtur-content-admin.html?v=12")
if t2 == t:
    print("CONTENT_V12_MISSING_OR_DONE", "v=12" in t)
else:
    p.write_text(t2, encoding="utf-8")
    print("CONTENT_V12_OK")
