#!/bin/bash
echo '=== tv server routes ==='
docker exec tv-semit sh -c 'grep -n "app\.\(get\|post\|use\)" server.js | head -60'
echo '=== agenda calls ==='
curl -sk --max-time 5 'https://127.0.0.1/api/agenda/public/panels/calls?slug=semit' | head -c 500; echo
curl -sk --max-time 5 'https://127.0.0.1/api/agenda/public/panels/calls?slug=sedetur' | head -c 500; echo
echo '=== api container ==='
docker ps --format '{{.Names}} {{.Status}}' | grep -E '^api |agenda'
echo '=== search tickets on host ==='
grep -RIn 'api/tickets\|/tickets?unitId' /home/semit/Documentos/api-semit /home/semit/Documentos/semit* 2>/dev/null | head -30
echo '=== 8088 any tickets json ==='
curl -s --max-time 5 'http://10.15.25.31:8088/api/panels/semit' | head -c 200; echo
# try novosga websocket-ish endpoints used by painel web
curl -s --max-time 5 'http://10.15.25.31:8088/api/weather' | head -c 100; echo
