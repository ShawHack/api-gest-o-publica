#!/bin/bash
set -euo pipefail
cd /home/semit/Documentos/api-semit

echo '=== resetPassword no container ==='
docker exec api grep -n 'resetPassword' /app/controllers/VotingAuditorController.js || echo AUSENTE

echo '=== backups de votacaoRoutes ==='
ls -lt backend/routes/votacaoRoutes.js* 2>/dev/null | head -20

# Preferir backup recente que nao seja .orig (imagem desatualizada)
# Se houver arquivo de antes do nosso deploy no host history - tentar pre_sync
ls -lt backend.pre_sync_bak.*/routes/votacaoRoutes.js 2>/dev/null | head -5 || true

# Ver se resetPassword existe no host
grep -n 'resetPassword' backend/controllers/VotingAuditorController.js || echo 'host AUSENTE'

# Remover temporariamente a rota reset-password se o handler nao existir — restaura API
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
if 'VotingAuditorController.resetPassword' in t:
    # comenta o bloco para a API subir
    commented = '\n'.join('// DISABLED_MISSING_HANDLER ' + line if line.strip() else line for line in block.splitlines(True))
    # simpler: remove the route block
    if block in t:
        t = t.replace(block, '/* reset-password disabled: handler missing */\n', 1)
        p.write_text(t, encoding='utf-8')
        print('rota reset-password removida')
    else:
        # try CRLF
        block2 = block.replace('\n', '\r\n')
        if block2 in t:
            t = t.replace(block2, '/* reset-password disabled: handler missing */\r\n', 1)
            p.write_text(t, encoding='utf-8')
            print('rota reset-password removida (crlf)')
        else:
            print('bloco exato nao encontrado; tentando regex')
            import re
            t2, n = re.subn(
                r"router\.post\(\s*'/admin/votacoes/:id/auditores/:membershipId/reset-password'[\s\S]*?VotingAuditorController\.resetPassword\s*\)\s*",
                '/* reset-password disabled: handler missing */\n',
                t,
                count=1,
            )
            if n:
                p.write_text(t2, encoding='utf-8')
                print('rota removida via regex')
            else:
                raise SystemExit('nao conseguiu remover rota')
else:
    print('rota resetPassword ja ausente')

# garantir export-resultado
if 'export-resultado-v2.csv' not in t and 'export-resultado-v2.csv' not in p.read_text(encoding='utf-8'):
    t = p.read_text(encoding='utf-8')
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
    if needle in t:
        p.write_text(t.replace(needle, insert, 1), encoding='utf-8')
        print('export-resultado inserido')
    else:
        print('AVISO: needle export-votos nao encontrado')
else:
    print('export-resultado ok')
PY

# garantir exportResultsV2 no controller
if ! grep -q 'async exportResultsV2' backend/controllers/VotingElectionAdminController.js; then
  if [ -f exportResultsV2.snippet.js ]; then
    python3 <<'PY'
from pathlib import Path
ctrl = Path('backend/controllers/VotingElectionAdminController.js')
snippet = Path('exportResultsV2.snippet.js').read_text(encoding='utf-8').rstrip() + ',\n\n'
t = ctrl.read_text(encoding='utf-8')
marker = '  async exportParticipation(req, res) {'
if marker not in t:
    raise SystemExit('marker missing')
ctrl.write_text(t.replace(marker, snippet + marker, 1), encoding='utf-8')
print('controller patch ok')
PY
  fi
fi

docker cp backend/routes/votacaoRoutes.js api:/app/routes/votacaoRoutes.js
docker cp backend/controllers/VotingElectionAdminController.js api:/app/controllers/VotingElectionAdminController.js
docker restart api
sleep 20
echo '--- status ---'
docker ps --filter name=api --format '{{.Names}} {{.Status}}'
curl -s -o /dev/null -w 'votacao/status=%{http_code}\n' http://127.0.0.1:5000/api/votacao/status || true
docker logs api --tail 25 2>&1
