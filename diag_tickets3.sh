#!/bin/bash
docker exec tv-semit grep -n "app.get\|tickets\|unitId\|/api/" server.js | head -80
echo ===
curl -sk --max-time 8 "https://127.0.0.1/api/agenda/public/panels/calls?slug=semit" | head -c 800
echo
docker ps --format "{{.Names}} {{.Status}}" | grep -E "api|nginx|tv"
echo ===
# try known proxy paths
for u in \
  "/api/agenda/novosga/tickets?unitId=4" \
  "/api/agenda/public/novosga/tickets?unitId=4" \
  "/senhas/api/tickets?unitId=4" \
  "/api/tickets?unitId=4"
 do
  code=$(curl -sk -o /tmp/t.json -w "%{http_code}" --max-time 5 "https://127.0.0.1$u")
  echo "$code $u $(head -c 120 /tmp/t.json)"
done
