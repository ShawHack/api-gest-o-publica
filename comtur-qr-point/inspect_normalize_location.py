#!/usr/bin/env python3
from pathlib import Path
import re
h = Path("/home/semit/Documentos/api-semit/backend/helpers/comtur-content.js").read_text(encoding="utf-8")
# also container
import subprocess
c = subprocess.check_output(["docker","exec","api","cat","/app/helpers/comtur-content.js"], text=True, errors="replace")
for label,t in [("host",h),("container",c)]:
    print("====", label, "====")
    i = t.find("function normalize")
    print(t[i:i+2200])
    print("location mentions", len(re.findall(r"location", t[i:i+5000])))
