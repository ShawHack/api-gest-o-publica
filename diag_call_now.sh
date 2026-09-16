#!/bin/bash
set -e
echo '=== tickets agora ==='
echo -n 'unit4 count='; curl -sk --max-time 8 'https://127.0.0.1/tv/api/tickets?unitId=4' | python3 -c 'import sys,json; d=json.load(sys.stdin); print(len(d));
print("first", (d[0].get("senha"), d[0].get("local"), d[0].get("numeroLocal")) if d else None)'
echo -n 'unit6 count='; curl -sk --max-time 8 'https://127.0.0.1/tv/api/tickets?unitId=6' | python3 -c 'import sys,json; d=json.load(sys.stdin); print(len(d));
print("first", (d[0].get("senha"), d[0].get("local"), d[0].get("numeroLocal")) if d else None)'

echo '=== direct novosga ==='
AT=$(curl -s --max-time 8 -X POST http://10.15.25.31:8088/api/panels/semit/token -H 'Content-Type: application/json' -d '{}' | python3 -c 'import sys,json; print(json.load(sys.stdin).get("accessToken",""))')
curl -s --max-time 8 -H "Authorization: Bearer $AT" 'http://10.15.25.31/api/unidades/6/painel?servicos=82,83,84' | python3 -c 'import sys,json; d=json.load(sys.stdin); print("semit direct", len(d), d[:1] if d else None)'
AT4=$(curl -s --max-time 8 -X POST http://10.15.25.31:8088/api/panels/sedetur/token -H 'Content-Type: application/json' -d '{}' | python3 -c 'import sys,json; print(json.load(sys.stdin).get("accessToken",""))')
curl -s --max-time 8 -H "Authorization: Bearer $AT4" 'http://10.15.25.31/api/unidades/4/painel?servicos=85,75,22,26,77,73,88,78,52,74,56,58,60,63,20,65,67,68' | python3 -c 'import sys,json; d=json.load(sys.stdin); print("sedetur direct", len(d));
print([(x.get("senha"), x.get("servico",{}).get("nome")) for x in d[:3]])'

echo '=== recent client polls ==='
docker logs --tail 800 nginx 2>&1 | grep 'tv/api/tickets' | tail -20

echo '=== mercure publish test subscribe ==='
# listen briefly for mercure events on unit 6 and 4
timeout 3 curl -sN --max-time 3 'http://10.15.25.31:3000/.well-known/mercure?topic=/unidades/6/painel&topic=/unidades/4/painel&topic=/paineis' | head -c 400 || true
echo

echo '=== panel config display ==='
curl -s --max-time 5 http://10.15.25.31:8088/api/panels | python3 -c '
import sys,json
for p in json.load(sys.stdin):
  print(p["slug"], "layout=", p.get("displayLayout"), "units=", [(u["id"], u.get("serviceIds")) for u in p.get("units",[])], "hasOauth=", p.get("hasOauth"))
'
