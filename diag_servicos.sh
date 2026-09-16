#!/bin/bash
set -e
AT=$(curl -s --max-time 8 -X POST http://10.15.25.31:8088/api/panels/semit/token -H 'Content-Type: application/json' -d '{}' | python3 -c 'import sys,json; print(json.load(sys.stdin).get("accessToken",""))')
echo "=== semit com servicos ==="
curl -s --max-time 8 -H "Authorization: Bearer $AT" 'http://10.15.25.31/api/unidades/6/painel?servicos=82,83,84' | head -c 1200; echo
curl -s --max-time 8 -H "Authorization: Bearer $AT" 'http://10.15.25.31/api/unidades/6/painel' | head -c 200; echo

AT4=$(curl -s --max-time 8 -X POST http://10.15.25.31:8088/api/panels/sedetur/token -H 'Content-Type: application/json' -d '{}' | python3 -c 'import sys,json; print(json.load(sys.stdin).get("accessToken",""))')
echo "=== sedetur com servicos ==="
curl -s --max-time 8 -H "Authorization: Bearer $AT4" 'http://10.15.25.31/api/unidades/4/painel?servicos=85,75,22,26,77,73,88,78,52,74,56,58,60,63,20,65,67,68' | head -c 1200; echo

echo "=== panel oauth fields ==="
curl -s --max-time 8 http://10.15.25.31:8088/api/panels | python3 -c '
import sys,json
for p in json.load(sys.stdin):
  keys=[k for k in p.keys() if "oauth" in k.lower() or "client" in k.lower() or "user" in k.lower() or "secret" in k.lower() or "pass" in k.lower() or "has" in k.lower()]
  print(p["slug"], "keys", keys, "hasOauth", p.get("hasOauth"))
  for k in keys:
    v=p.get(k)
    if isinstance(v,str) and len(v)>4: v=v[:4]+"***"
    print(" ",k,v)
'

echo "=== how web fetches painel ==="
ASSET=/assets/index-LSdTg9vQ.js
curl -s --max-time 8 "http://10.15.25.31:8088$ASSET" | python3 -c '
import sys,re
s=sys.stdin.read()
for m in re.finditer(r".{0,60}unidades/.{0,100}", s):
  print(m.group(0)[:160])
  print("---")
' | head -40
