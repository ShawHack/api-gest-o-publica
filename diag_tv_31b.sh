#!/bin/bash
echo '===31 paths==='
for u in / /painel /admin '/api' '/unidades/4/painel' /paineis; do
  code=$(curl -sI --max-time 4 "http://10.15.25.31$u" | head -1)
  echo "$u -> $code"
done
echo '===8088 panels==='
curl -s --max-time 5 'http://10.15.25.31:8088/api/panels' | head -c 500
echo
echo '===mercure==='
curl -sI --max-time 4 'http://10.15.25.31:3000/.well-known/mercure' | head -8
echo '===tv-semit app==='
docker exec tv-semit ls /app
docker exec tv-semit sh -c 'grep -n "tickets\|listen\|3050\|10.15" server.js | head -40'
echo '===old container still has data?==='
docker inspect tv-semit-old-ctir-20260908 --format '{{.State.Status}}'
