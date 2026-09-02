#!/bin/bash
set -euo pipefail
cd /home/semit/Documentos/api-semit

echo '=== VotingAuditorController exports ==='
docker exec api node -e 'const A=require("./controllers/VotingAuditorController"); console.log(Object.keys(A).join(",")); console.log("resetPassword="+typeof A.resetPassword)'

echo '=== voting-authz ==='
docker exec api node -e 'const z=require("./helpers/voting-authz"); console.log(Object.keys(z).join(",")); console.log("write="+typeof z.requireVotingPleitoWrite)'

echo '=== recent bak routes ==='
ls -lt backend/routes/votacaoRoutes.js* | head -15

# Se resetPassword nao existe, comenta a rota para subir a API
python3 <<'PY'
from pathlib import Path
p = Path('backend/routes/votacaoRoutes.js')
t = p.read_text(encoding='utf-8')
block = """router.post(
  '/admin/votacoes/:id/auditores/:membershipId/reset-password',
  verifyToken,
  requireVotingPleitoWrite,
  VotingAuditorController.resetPassword
)
"""
if 'VotingAuditorController.resetPassword' in t and block in t:
    t2 = t.replace(block, '/* reset-password desabilitado: handler ausente no controller da imagem */\n', 1)
    p.write_text(t2, encoding='utf-8')
    print('rota reset-password removida temporariamente')
elif 'VotingAuditorController.resetPassword' in t:
    # fallback regex-ish manual
    import re
    t2, n = re.subn(
        r"router\.post\(\s*'/admin/votacoes/:id/auditores/:membershipId/reset-password'[\s\S]*?VotingAuditorController\.resetPassword\s*\)\s*",
        '/* reset-password desabilitado: handler ausente */\n',
        t,
        count=1,
    )
    if n != 1:
        raise SystemExit(f'falha ao remover rota reset-password (n={n})')
    p.write_text(t2, encoding='utf-8')
    print('rota reset-password removida via regex')
else:
    print('rota reset-password ja ausente')

# Garante export-resultado
if 'export-resultado-v2.csv' not in p.read_text(encoding='utf-8'):
    raise SystemExit('export-resultado sumiu — abortando')
print('export-resultado presente')
PY

# Garante exportResultsV2 no controller
if ! grep -q 'async exportResultsV2' backend/controllers/VotingElectionAdminController.js; then
  echo 'reaplicando snippet controller'
  python3 <<'PY'
from pathlib import Path
ctrl = Path('backend/controllers/VotingElectionAdminController.js')
snippet = Path('exportResultsV2.snippet.js').read_text(encoding='utf-8')
if not snippet.rstrip().endswith(','):
    snippet = snippet.rstrip() + ',\n'
snippet = snippet if snippet.endswith('\n') else snippet + '\n'
t = ctrl.read_text(encoding='utf-8')
marker = '  async exportParticipation(req, res) {'
if marker not in t:
    raise SystemExit('marker ausente')
ctrl.write_text(t.replace(marker, snippet + '\n' + marker, 1), encoding='utf-8')
print('controller ok')
PY
fi

docker cp backend/routes/votacaoRoutes.js api:/app/routes/votacaoRoutes.js
docker cp backend/controllers/VotingElectionAdminController.js api:/app/controllers/VotingElectionAdminController.js
docker restart api
sleep 20
echo '--- status ---'
docker ps --filter name=api --format '{{.Names}} {{.Status}}'
code=$(curl -s -o /dev/null -w '%{http_code}' http://127.0.0.1:5000/api/votacao/status || echo fail)
echo "votacao/status=$code"
echo '--- logs ---'
docker logs api --tail 25 2>&1
