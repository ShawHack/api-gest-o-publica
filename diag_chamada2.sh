#!/bin/bash
echo '=== PANEL SEMIT CONFIG ==='
curl -s --max-time 8 http://10.15.25.31:8088/api/panels -o /tmp/panels.json
wc -c /tmp/panels.json
python3 -c "
import json
d=json.load(open('/tmp/panels.json'))
for p in d:
  print(p.get('slug'), 'novosga=', p.get('novosgaApiUrl'), 'mercure=', p.get('mercurePublicUrl'), 'units=', p.get('units'), 'speech=', p.get('speechEnabled'), 'layout=', p.get('displayLayout'))
"

echo '=== NOVOSGA .31 ==='
curl -sI --max-time 5 http://10.15.25.31/ | head -5
for u in '/api' '/admin/api' '/server'; do
  code=$(curl -s -o /dev/null -w '%{http_code}' --max-time 4 "http://10.15.25.31$u")
  echo "$u -> $code"
done

echo '=== MERCURE ==='
curl -sI --max-time 5 'http://10.15.25.31:3000/.well-known/mercure' | head -8
curl -s -o /dev/null -w 'topic6=%{http_code}\n' --max-time 5 'http://10.15.25.31:3000/.well-known/mercure?topic=/unidades/6/painel'

echo '=== 443 PATHS ==='
curl -skI --max-time 5 https://127.0.0.1/senhas/ | head -6
curl -skI --max-time 5 'https://127.0.0.1/p/semit' | head -8
curl -sk --max-time 5 'https://127.0.0.1/api/panels' | head -c 300; echo

echo '=== APP TICKETS 404 ==='
curl -sk --max-time 5 'https://127.0.0.1/tv/api/tickets?unitId=6'; echo
curl -s --max-time 5 'http://10.15.25.31:8088/tickets?unitId=6' | head -c 400; echo

echo '=== NGINX RECENT ==='
docker logs --tail 1000 nginx 2>&1 | grep -E 'painel|senhas|/p/|tickets|mercure|8088|unitId' | tail -30
