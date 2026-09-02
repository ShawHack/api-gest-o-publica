#!/bin/bash
set -euo pipefail
cd /home/semit/Documentos/api-semit

# Extrai originais da imagem se ainda nao existirem
if [ ! -f backend/routes/votacaoRoutes.js.orig ]; then
  IMG=$(docker inspect api --format '{{.Image}}')
  cid=$(docker create "$IMG")
  docker cp "$cid:/app/routes/votacaoRoutes.js" backend/routes/votacaoRoutes.js.orig
  docker cp "$cid:/app/controllers/VotingElectionAdminController.js" backend/controllers/VotingElectionAdminController.js.orig
  docker rm "$cid" >/dev/null
fi

cp backend/routes/votacaoRoutes.js.orig backend/routes/votacaoRoutes.js
cp backend/controllers/VotingElectionAdminController.js.orig backend/controllers/VotingElectionAdminController.js

# Patch routes
python3 <<'PY'
from pathlib import Path
p = Path('backend/routes/votacaoRoutes.js')
t = p.read_text(encoding='utf-8')
if 'export-resultado-v2.csv' in t:
    print('rota ok')
else:
    needle = (
        "router.get(\n"
        "  '/admin/votacoes/:id/export-votos-v2.csv',\n"
        "  verifyToken,\n"
        "  requireVotingAdmin,\n"
        "  VotingElectionAdminController.exportVotesV2\n"
        ")\n"
    )
    insert = needle + (
        "router.get(\n"
        "  '/admin/votacoes/:id/export-resultado-v2.csv',\n"
        "  verifyToken,\n"
        "  requireVotingAdmin,\n"
        "  VotingElectionAdminController.exportResultsV2\n"
        ")\n"
    )
    if needle not in t:
        raise SystemExit('needle routes nao encontrado')
    p.write_text(t.replace(needle, insert, 1), encoding='utf-8')
    print('rota inserida')
PY

# Patch controller
python3 <<'PY'
from pathlib import Path
ctrl = Path('backend/controllers/VotingElectionAdminController.js')
snippet = Path('exportResultsV2.snippet.js').read_text(encoding='utf-8')
if not snippet.strip().endswith(','):
    snippet = snippet.rstrip() + ',\n'
else:
    snippet = snippet if snippet.endswith('\n') else snippet + '\n'
t = ctrl.read_text(encoding='utf-8')
if 'async exportResultsV2' in t:
    print('controller ok')
else:
    marker = '  async exportParticipation(req, res) {'
    if marker not in t:
        raise SystemExit('marker controller nao encontrado')
    ctrl.write_text(t.replace(marker, snippet + '\n' + marker, 1), encoding='utf-8')
    print('controller patch aplicado')
PY

docker cp backend/routes/votacaoRoutes.js api:/app/routes/votacaoRoutes.js
docker cp backend/controllers/VotingElectionAdminController.js api:/app/controllers/VotingElectionAdminController.js
docker restart api
sleep 18
echo '--- status ---'
docker ps --filter name=api --format '{{.Names}} {{.Status}}'
curl -s -o /dev/null -w 'votacao/status=%{http_code}\n' http://127.0.0.1:5000/api/votacao/status || true
echo '--- logs ---'
docker logs api --tail 20 2>&1
