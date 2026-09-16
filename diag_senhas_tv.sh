#!/bin/bash
set -e
echo '=== tickets route ==='
curl -sk --max-time 8 'https://127.0.0.1/tv/api/tickets?unitId=4' ; echo
curl -sk --max-time 8 'https://127.0.0.1/tv/api/tickets?unitId=6' ; echo

echo '=== panel via 443 ==='
curl -skI --max-time 5 'https://127.0.0.1/p/semit' | head -10
curl -skI --max-time 5 'https://127.0.0.1/painel-senhas/' | head -8

echo '=== mercure via nginx? ==='
docker exec nginx grep -n 'mercure\|3000' /etc/nginx/conf.d/default.conf | head -20

echo '=== token + painel live ==='
AT=$(curl -s --max-time 8 -X POST http://10.15.25.31:8088/api/panels/semit/token -H 'Content-Type: application/json' -d '{}' | python3 -c 'import sys,json; print(json.load(sys.stdin).get("accessToken",""))')
echo "token_len=${#AT}"
curl -s --max-time 8 -H "Authorization: Bearer $AT" 'http://10.15.25.31/api/unidades/6/painel' | head -c 1000; echo
AT4=$(curl -s --max-time 8 -X POST http://10.15.25.31:8088/api/panels/sedetur/token -H 'Content-Type: application/json' -d '{}' | python3 -c 'import sys,json; print(json.load(sys.stdin).get("accessToken",""))')
curl -s --max-time 8 -H "Authorization: Bearer $AT4" 'http://10.15.25.31/api/unidades/4/painel' | head -c 1000; echo

echo '=== recent apk/tv hits ==='
docker logs --tail 1500 nginx 2>&1 | grep -E 'tickets|mercure|/p/|painel-senhas|unitId' | tail -40

echo '=== panel js mercure refs ==='
curl -sk --max-time 8 'https://127.0.0.1/p/semit' | head -c 500; echo
# find asset and search mercure
ASSET=$(curl -sk --max-time 8 'http://10.15.25.31:8088/' | grep -oE '/assets/index-[^"]+\.js' | head -1)
echo "asset=$ASSET"
curl -s --max-time 8 "http://10.15.25.31:8088$ASSET" | grep -oE '.{0,40}mercure.{0,80}' | head -10
curl -s --max-time 8 "http://10.15.25.31:8088$ASSET" | grep -oE '.{0,40}novosgaApiUrl.{0,80}' | head -5
