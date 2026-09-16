#!/bin/bash
set -e
echo '=== routes tickets ==='
docker exec tv-semit sh -c "grep -RIn 'tickets\|10.15.25.31\|sga\|novosga' /app --include='*.js' 2>/dev/null | head -40"
echo '=== health ==='
curl -s --max-time 5 http://127.0.0.1:3050/api/health 2>&1 | head -5 || true
docker exec tv-semit wget -qO- http://127.0.0.1:3050/api/health 2>&1 | head -5
echo '=== displays full ==='
curl -sk --max-time 5 https://127.0.0.1/tv/api/displays
echo
echo '=== playlist semit ==='
curl -sk --max-time 5 'https://127.0.0.1/tv/api/playlist?display=semit' | head -c 500
echo
echo '=== nginx painel on 443 via .31 ==='
curl -skI --max-time 5 https://127.0.0.1/painel-senhas/ | head -8
curl -sI --max-time 5 http://10.15.25.31:8088/ | head -5
