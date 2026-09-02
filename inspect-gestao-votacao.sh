#!/bin/bash
set -euo pipefail

BASE=/home/semit/Documentos/api-gestao-publica/backend
RT=/home/semit/runtime/api-gestao-publica/assets/backend-public/votacao

echo '=== controller exports ==='
grep -n 'async export\|tallyElection\|csvEscape\|exportParticipation\|exportResults' \
  "$BASE/controllers/VotingElectionAdminController.js" | head -30

echo '=== routes export/reset ==='
grep -n 'export-\|resetPassword\|exportResults' "$BASE/routes/votacaoRoutes.js" | head -25

echo '=== auditor resetPassword ==='
grep -n 'resetPassword' "$BASE/controllers/VotingAuditorController.js" | head -10

echo '=== UI buttons runtime ==='
grep -n 'btnExport\|downloadExport\|Apuracao' \
  "$RT/admin.html" "$RT/admin/assets/admin-app.js" 2>/dev/null | head -40

echo '=== Documentos public votacao ==='
ls -la "$BASE/public/votacao/" 2>/dev/null | head -20
ls -la "$BASE/public/votacao/admin/assets/" 2>/dev/null | head -15

echo '=== md5 controller host vs container ==='
md5sum "$BASE/controllers/VotingElectionAdminController.js"
docker exec api md5sum /app/controllers/VotingElectionAdminController.js

echo '=== health ==='
curl -s -o /dev/null -w 'health=%{http_code}\n' http://127.0.0.1:5000/health
curl -s -o /dev/null -w 'votacao=%{http_code}\n' http://127.0.0.1:5000/api/votacao/status
