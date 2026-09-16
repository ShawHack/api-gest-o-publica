#!/bin/bash
set -euo pipefail
echo "=== search atrativos ==="
curl -sk "https://127.0.0.1/api/comtur/content?q=atrativos&limit=20" | python3 -c '
import sys,json
d=json.load(sys.stdin)
items=d.get("data") or d.get("items") or d if isinstance(d,list) else []
print("count", len(items) if isinstance(items,list) else type(items))
for i in (items if isinstance(items,list) else []):
  print(i.get("type"), "|", i.get("title"), "| featured=", i.get("featured"), "| status=", i.get("status"), "| slug=", i.get("slug"), "| id=", i.get("_id"))
'
echo "=== open_data published ==="
curl -sk "https://127.0.0.1/api/comtur/content?type=open_data&limit=20" | python3 -c '
import sys,json
d=json.load(sys.stdin)
items=d.get("data") or d.get("items") or []
for i in items:
  print(i.get("title"), "| featured=", i.get("featured"), "| slug=", i.get("slug"))
'
echo "=== attraction published count ==="
curl -sk "https://127.0.0.1/api/comtur/content?type=attraction&limit=5" | python3 -c '
import sys,json
d=json.load(sys.stdin)
items=d.get("data") or d.get("items") or []
print("n=", len(items))
for i in items[:5]:
  print("-", i.get("title"))
'
