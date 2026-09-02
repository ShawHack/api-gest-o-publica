#!/bin/bash
set -euo pipefail
BASE=/home/semit/Documentos/api-gestao-publica/backend
RT=/home/semit/runtime/api-gestao-publica/assets/backend-public/votacao

echo '=== rotas export / resultado / auditor ==='
grep -n 'export-\|resultado-v2\|requireVoting\|Auditor\|apuracao\|exportResults' \
  "$BASE/routes/votacaoRoutes.js" | head -60

echo '=== authz helpers ==='
grep -n 'requireVoting\|function\|exports\|admin\|auditor\|staff\|Pleito' \
  "$BASE/helpers/voting-authz.js" | head -80

echo '=== admin-app: quem ve apuracao / export / canWrite ==='
grep -n 'apuracao\|export\|canWrite\|canRead\|auditor\|staff\|Export\|isAdmin\|role' \
  "$RT/admin/assets/admin-app.js" | head -80

echo '=== container rota export-resultado middleware ==='
sed -n '150,180p' "$BASE/routes/votacaoRoutes.js"
