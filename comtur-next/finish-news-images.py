#!/usr/bin/env python3
from pathlib import Path
import subprocess
public = Path("/home/semit/Documentos/api-semit/backend/public")
src = Path("/tmp/comtur-news-images")
(public / "turismo" / "assets").mkdir(parents=True, exist_ok=True)
pairs = [
    (src / "comtur-content-admin.html", public / "comtur-content-admin.html"),
    (src / "comtur-admin-nav.js", public / "comtur-admin-nav.js"),
    (src / "index.html", public / "turismo" / "index.html"),
]
for item in src.glob("index-*"):
    pairs.append((item, public / "turismo" / "assets" / item.name))
for srcf, dest in pairs:
    if srcf.exists():
        dest.write_bytes(srcf.read_bytes())
        print("installed", dest.name)
subprocess.check_call(["python3", str(src / "patch_nginx_content_v12.py")])
subprocess.check_call(["docker", "exec", "nginx", "nginx", "-t"])
subprocess.check_call(["docker", "exec", "nginx", "nginx", "-s", "reload"])
print("NEWS_IMAGES_OK")
