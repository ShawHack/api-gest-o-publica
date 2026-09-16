#!/bin/bash
set -e
echo '=== token sedetur ==='
TOKEN=$(curl -s --max-time 8 -X POST http://10.15.25.31:8088/api/panels/sedetur/token -H 'Content-Type: application/json' -d '{}')
echo "$TOKEN" | head -c 200; echo
AT=$(python3 -c "import json,sys; print(json.load(sys.stdin).get('accessToken',''))" <<<"$TOKEN")
echo "token_len=${#AT}"
echo '=== painel unit 4 ==='
curl -s --max-time 8 -H "Authorization: Bearer $AT" "http://10.15.25.31/api/unidades/4/painel" | head -c 800
echo
echo '=== token semit ==='
TOKEN2=$(curl -s --max-time 8 -X POST http://10.15.25.31:8088/api/panels/semit/token -H 'Content-Type: application/json' -d '{}')
AT2=$(python3 -c "import json,sys; print(json.load(sys.stdin).get('accessToken',''))" <<<"$TOKEN2")
curl -s --max-time 8 -H "Authorization: Bearer $AT2" "http://10.15.25.31/api/unidades/6/painel" | head -c 800
echo
