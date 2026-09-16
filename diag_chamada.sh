#!/bin/bash
set -e
echo '=== PANEL SEMIT CONFIG ==='
curl -s --max-time 8 http://10.15.25.31:8088/api/panels | python3 - <<'PY'
import sys,json
d=json.load(sys.stdin)
for p in d:
  if p.get('slug')=='semit':
    print('novosgaApiUrl=', p.get('novosgaApiUrl'))
    print('mercure=', p.get('mercurePublicUrl'))
    print('units=', p.get('units'))
    print('speech=', p.get('speechEnabled'), 'status=', p.get('status'))
    print('layout=', p.get('displayLayout'))
    print('mediaItems=', p.get('mediaItems'))
PY

echo '=== NOVOSGA INTERNAL ==='
curl -sI --max-time 5 http://10.15.25.31/ | head -5
curl -sI --max-time 5 http://10.15.25.31/senhas/ 2>/dev/null | head -5
# typical novosga api
for u in '/api' '/api/v1' '/server/api' '/admin/api' '/novosga/api'; do
  code=$(curl -s -o /dev/null -w '%{http_code}' --max-time 4 "http://10.15.25.31$u")
  echo "$u -> $code"
done

echo '=== MERCURE ==='
curl -sI --max-time 5 'http://10.15.25.31:3000/.well-known/mercure' | head -8
curl -s --max-time 5 -o /dev/null -w 'mercure_get=%{http_code}\n' 'http://10.15.25.31:3000/.well-known/mercure?topic=/unidades/6/painel'

echo '=== 443 SENHAS / PAINEL ==='
curl -skI --max-time 5 https://127.0.0.1/senhas/ | head -6
curl -skI --max-time 5 https://127.0.0.1/painel-senhas/ | head -6
curl -skI --max-time 5 'https://127.0.0.1/p/semit' | head -8
curl -sk --max-time 5 'https://127.0.0.1/api/panels' | head -c 200; echo

echo '=== RECENT CALLS LOGS ==='
docker logs --tail 800 nginx 2>&1 | grep -E 'painel|senhas|mercure|/p/|tickets|8088' | tail -40
