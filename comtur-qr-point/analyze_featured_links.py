#!/usr/bin/env python3
"""Find how turismo SPA builds featured item URLs."""
from pathlib import Path
import re

assets = Path("/home/semit/Documentos/api-semit/backend/public/turismo/assets")
files = sorted(assets.glob("index-*.js"), key=lambda p: p.stat().st_mtime, reverse=True)[:3]
for f in files:
    t = f.read_text(encoding="utf-8", errors="ignore")
    print("FILE", f.name, "size", len(t))
    for needle in [
        "Em evidência",
        "featured",
        "DOCUMENTO DO COMTUR",
        "Ver detalhes",
        "type===",
        "type==",
        "/atrativos",
        "mapaturistico",
        "integracoes",
        "integration",
        "open_data",
        "research",
    ]:
        print(f"  {needle}: {t.count(needle)}")

    # find featured route builders
    for pat in [
        r".{0,80}featured.{0,120}",
        r".{0,60}/atrativos/.{0,80}",
        r".{0,40}DOCUMENTO.{0,80}",
        r"type\s*===?\s*[\"']integration[\"'].{0,100}",
        r"type\s*===?\s*[\"']attraction[\"'].{0,100}",
        r"[\"']/turismo/[a-z-]+/\$\{[^}]{0,40}\}",
        r"pathByType|routeByType|contentPath|tipoToPath|TYPE_ROUTE",
    ]:
        ms = list(re.finditer(pat, t))
        if ms:
            print(" PAT", pat[:50], "hits", len(ms))
            for m in ms[:8]:
                print("  ", m.group(0).replace("\n", " ")[:180])

# also check if featured API returns our integration
import urllib.request, ssl, json
ctx = ssl._create_unverified_context()
for url in [
    "https://127.0.0.1/api/comtur/content?featured=true&limit=10",
    "https://127.0.0.1/api/comtur/content?limit=10",
]:
    with urllib.request.urlopen(url, context=ctx, timeout=15) as r:
        data = json.loads(r.read().decode())
    items = data.get("data") or []
    print("API", url.split("?")[1], "count", len(items))
    for i in items[:8]:
        print(" ", i.get("type"), i.get("slug"), i.get("featured"), i.get("title", "")[:50])
