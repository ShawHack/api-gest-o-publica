#!/bin/bash
set -e
echo '=== panel semit detail ==='
curl -s --max-time 8 'http://10.15.25.31:8088/api/panels' | python3 -c "import sys,json; d=json.load(sys.stdin);
for p in d:
  print(p.get('slug'), p.get('id'), p.get('novosgaApiUrl'), p.get('mercurePublicUrl'))"

echo
echo '=== try update endpoints ==='
# discover update API
for method in GET; do
  curl -sI --max-time 4 http://10.15.25.31:8088/api/panels/semit | head -3
done

# common patterns
curl -s --max-time 5 -X OPTIONS http://10.15.25.31:8088/api/panels 2>&1 | head -10

echo '=== senhas 443 ==='
curl -skI --max-time 5 https://127.0.0.1/senhas/ | head -8
curl -sI --max-time 5 http://10.15.25.31/ | head -5

echo '=== find panel store on .31 via .28 docs ==='
grep -RIn 'novosgaApiUrl\|api/panels' /home/semit/Documentos/api-semit --include='*.md' --include='*.js' --include='*.ts' 2>/dev/null | head -30
