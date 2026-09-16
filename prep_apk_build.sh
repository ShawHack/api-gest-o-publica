#!/bin/bash
set -e
echo '=== java candidates ==='
ls /usr/lib/jvm 2>/dev/null || true
command -v java || true
command -v javac || true
ls /home/semit/android* 2>/dev/null || true
ls /home/semit/Documentos/semit_painel_native/app/build/outputs/apk/release/ 2>/dev/null || true

echo '=== tickets now ==='
curl -sk --max-time 8 'https://127.0.0.1/tv/api/tickets?unitId=4' | python3 -c 'import sys,json;d=json.load(sys.stdin);print(len(d), type(d[0]["id"]).__name__ if d else None, d[0].get("senha") if d else None)'
curl -sk --max-time 8 'https://127.0.0.1/tv/api/tickets?unitId=6' | python3 -c 'import sys,json;d=json.load(sys.stdin);print("u6",len(d))'

echo '=== apk polls ==='
docker logs --tail 30 nginx 2>&1 | grep 'tickets?unitId' | tail -8

echo '=== mercure in nginx ==='
docker exec nginx grep -n 'mercure\|3000' /etc/nginx/conf.d/default.conf | head -20
