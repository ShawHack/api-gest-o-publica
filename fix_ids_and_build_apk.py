#!/usr/bin/env python3
"""Stringify ticket ids no /api/tickets + rebuild APK painel."""
import json
import subprocess
import time
from pathlib import Path

# --- patch tv-semit to stringify ids ---
src = subprocess.check_output(["docker", "exec", "tv-semit", "cat", "/app/server.js"], text=True)
needle = "const data = await novosgaRes.json();\n    return res.status(200).json(Array.isArray(data) ? data : []);"
repl = """const data = await novosgaRes.json();
    const list = Array.isArray(data) ? data : [];
    // Android optString('id') falha com numero; forca string
    const normalized = list.map((item) => {
      if (!item || typeof item !== 'object') return item;
      const out = { ...item };
      if (out.id !== undefined && out.id !== null) out.id = String(out.id);
      if (!out.local) out.local = 'Guiche';
      return out;
    });
    return res.status(200).json(normalized);"""
if needle not in src:
    print("tickets normalize already patched or missing")
else:
    Path("/tmp/server.js.strid").write_text(src.replace(needle, repl, 1), encoding="utf-8")
    subprocess.check_call(["docker", "cp", "/tmp/server.js.strid", "tv-semit:/app/server.js"])
    subprocess.check_call(["docker", "restart", "tv-semit"])
    print("tv-semit id stringify patched")
    time.sleep(4)

# verify
out = subprocess.check_output(
    ["curl", "-sk", "--max-time", "10", "https://127.0.0.1/tv/api/tickets?unitId=4"],
    text=True,
)
d = json.loads(out)
print("unit4", len(d), "id_type", type(d[0]["id"]).__name__ if d else None, "senha", d[0].get("senha") if d else None)

# build apk
apk_dir = Path("/home/semit/Documentos/semit_painel_native")
print("building apk...")
r = subprocess.run(
    ["./gradlew", "assembleRelease", "--no-daemon"],
    cwd=str(apk_dir),
    capture_output=True,
    text=True,
)
print("gradle exit", r.returncode)
print(r.stdout[-1500:] if r.stdout else "")
print(r.stderr[-1500:] if r.stderr else "")
subprocess.run(["find", str(apk_dir), "-name", "*.apk", "-mtime", "-1"], check=False)
