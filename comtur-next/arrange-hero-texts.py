#!/usr/bin/env python3
from pathlib import Path
src = Path("/tmp/comtur-hero-texts")
# scp may have created a file instead of a dir; handle both
if src.is_file():
    raise SystemExit("upload dir is a file")
(src / "helpers").mkdir(exist_ok=True)
(src / "portal").mkdir(exist_ok=True)
(src / "turismo" / "assets").mkdir(parents=True, exist_ok=True)
moves = {
    "comtur-branding.js": src / "helpers" / "comtur-branding.js",
    "comtur-branding-admin.html": src / "portal" / "comtur-branding-admin.html",
    "comtur-admin-nav.js": src / "portal" / "comtur-admin-nav.js",
    "index.html": src / "turismo" / "index.html",
    "index-C9CG42aO.css": src / "turismo" / "assets" / "index-C9CG42aO.css",
    "index-BFbObpjB.js": src / "turismo" / "assets" / "index-BFbObpjB.js",
}
for name, dest in moves.items():
    p = src / name
    if p.exists():
        dest.write_bytes(p.read_bytes())
        print("ok", name)
    else:
        print("missing", name)
