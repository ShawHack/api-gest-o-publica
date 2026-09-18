import json
import re
import subprocess
from pathlib import Path

# 1. Update playlist.json files in tv-semit
files = ["/app/data/playlist.json", "/app/data/playlist_semit.json", "/app/data/playlist_default.json"]
for f in files:
    try:
        raw = subprocess.check_output(["docker", "exec", "tv-semit", "cat", f], text=True)
        pl = json.loads(raw)
        filtered = [item for item in pl if not (
            item.get("url", "").endswith("29.png") or 
            item.get("subtitle", "") == "29.png" or 
            "logo" in item.get("url", "").lower()
        )]
        with open("/tmp/cleaned_pl.json", "w", encoding="utf-8") as out:
            json.dump(filtered, out, indent=2)
        subprocess.check_call(["docker", "cp", "/tmp/cleaned_pl.json", f"tv-semit:{f}"])
        print(f"Cleaned {f}: removed 29.png watermark from playlist")
    except Exception as e:
        print(f"Skipping {f}: {e}")

# 2. Patch server.js in tv-semit so it never adds 29.png / watermark to playlist
src = subprocess.check_output(["docker", "exec", "tv-semit", "cat", "/app/server.js"], text=True)
old_line = "if (fs.existsSync(savePath) && fs.statSync(savePath).size > 0) {"
new_line = "if (fs.existsSync(savePath) && fs.statSync(savePath).size > 0 && item.pathName !== '29.png' && !item.pathName.toLowerCase().includes('watermark')) {"

if old_line in src:
    src = src.replace(old_line, new_line)
    with open("/tmp/server_patched.js", "w", encoding="utf-8") as out:
        out.write(src)
    subprocess.check_call(["docker", "cp", "/tmp/server_patched.js", "tv-semit:/app/server.js"])
    subprocess.check_call(["docker", "restart", "tv-semit"])
    print("Patched server.js in tv-semit successfully!")
else:
    print("old_line not found in server.js")
