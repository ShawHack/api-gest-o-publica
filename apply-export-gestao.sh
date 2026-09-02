#!/bin/bash
set -euo pipefail

GESTAO=/home/semit/Documentos/api-gestao-publica
BASE="$GESTAO/backend"
RT=/home/semit/runtime/api-gestao-publica/assets/backend-public/votacao
TS=$(date +%Y%m%d%H%M%S)
SNIPPET=/tmp/exportResultsV2.snippet.js

echo "== precheck health =="
curl -sf -o /dev/null http://127.0.0.1:5000/health
curl -sf -o /dev/null http://127.0.0.1:5000/api/votacao/status
echo OK

# backups
cp -a "$BASE/controllers/VotingElectionAdminController.js" \
  "$BASE/controllers/VotingElectionAdminController.js.bak-export-$TS"
cp -a "$BASE/routes/votacaoRoutes.js" \
  "$BASE/routes/votacaoRoutes.js.bak-export-$TS"
cp -a "$RT/admin.html" "$RT/admin.html.bak-export-$TS"
cp -a "$RT/admin/assets/admin-app.js" "$RT/admin/assets/admin-app.js.bak-export-$TS"
if [ -f "$BASE/public/votacao/admin/assets/admin-app.js" ]; then
  cp -a "$BASE/public/votacao/admin/assets/admin-app.js" \
    "$BASE/public/votacao/admin/assets/admin-app.js.bak-export-$TS"
fi

# --- snippet method ---
cat > "$SNIPPET" <<'EOF'
  async exportResultsV2(req, res) {
    try {
      const vot = await Votation.findById(req.params.id).lean()
      if (!vot) return res.status(404).json({ message: 'Pleito não encontrado.' })
      const tally = await tallyElection(vot._id)
      const pct = (votes, total) =>
        total > 0 ? (Math.round((votes * 10000) / total) / 100).toFixed(2) : '0.00'

      const lines = [
        'pleito,status,elegiveis,participantes,abstencoes',
        [
          csvEscape(vot.title || ''),
          csvEscape(vot.status || ''),
          csvEscape(tally.eligibleVoters ?? ''),
          csvEscape(tally.participants ?? ''),
          csvEscape(tally.abstentions ?? ''),
        ].join(','),
        '',
        'categoria,numero,nome,votos,percentual',
      ]

      for (const cat of tally.categories || []) {
        const total = cat.totalVotes || 0
        for (const c of cat.candidates || []) {
          const percent =
            c.percent != null ? Number(c.percent).toFixed(2) : pct(c.votes || 0, total)
          lines.push(
            [
              csvEscape(cat.name || ''),
              csvEscape(c.number ?? ''),
              csvEscape(c.name || ''),
              csvEscape(c.votes ?? 0),
              csvEscape(`${percent}%`),
            ].join(',')
          )
        }
        const blank = cat.blank || 0
        const nullVotes = cat.null || 0
        lines.push(
          [
            csvEscape(cat.name || ''),
            '',
            'Branco',
            csvEscape(blank),
            csvEscape(`${pct(blank, total)}%`),
          ].join(',')
        )
        lines.push(
          [
            csvEscape(cat.name || ''),
            '',
            'Nulo',
            csvEscape(nullVotes),
            csvEscape(`${pct(nullVotes, total)}%`),
          ].join(',')
        )
      }

      void recordVoteEvent(req, {
        votationId: vot._id,
        action: 'admin.export_results_v2',
        resourceType: 'votation',
        resourceId: vot._id,
        eventType: 'EXPORT',
      })
      res.setHeader('Content-Type', 'text/csv; charset=utf-8')
      res.setHeader('Content-Disposition', `attachment; filename="pleito-${vot._id}-apuracao.csv"`)
      return res.send('\uFEFF' + lines.join('\n'))
    } catch (e) {
      console.error('[VotingElectionAdmin.exportResultsV2]', e)
      return res.status(500).json({ message: 'Erro ao exportar apuração.' })
    }
  },
EOF

python3 <<'PY'
from pathlib import Path

base = Path('/home/semit/Documentos/api-gestao-publica/backend')
rt = Path('/home/semit/runtime/api-gestao-publica/assets/backend-public/votacao')
snippet = Path('/tmp/exportResultsV2.snippet.js').read_text(encoding='utf-8')
if not snippet.rstrip().endswith(','):
    snippet = snippet.rstrip() + ',\n'
else:
    snippet = snippet if snippet.endswith('\n') else snippet + '\n'

# 1) controller
ctrl = base / 'controllers/VotingElectionAdminController.js'
ct = ctrl.read_text(encoding='utf-8')
if 'async exportResultsV2' in ct:
    print('controller: ja tem exportResultsV2')
else:
    marker = '  async exportParticipation(req, res) {'
    if marker not in ct:
        raise SystemExit('controller: marker exportParticipation ausente')
    ctrl.write_text(ct.replace(marker, snippet + '\n' + marker, 1), encoding='utf-8')
    print('controller: exportResultsV2 inserido')

# 2) routes
routes = base / 'routes/votacaoRoutes.js'
rtxt = routes.read_text(encoding='utf-8')
if 'export-resultado-v2.csv' in rtxt:
    print('routes: ja tem export-resultado-v2')
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
    if needle not in rtxt:
        raise SystemExit('routes: needle export-votos-v2 ausente')
    routes.write_text(rtxt.replace(needle, insert, 1), encoding='utf-8')
    print('routes: export-resultado-v2 inserido')

# 3) runtime admin.html
admin = rt / 'admin.html'
at = admin.read_text(encoding='utf-8')
changed = False
if 'btnExportApuracao' not in at:
    old_btn = (
        '          <button class="secondary" id="btnExportPresenca">Exportar comparecimento</button>\n'
    )
    new_btn = old_btn + (
        '          <button class="secondary" id="btnExportApuracao">Exportar apuração (planilha)</button>\n'
    )
    if old_btn not in at:
        raise SystemExit('admin.html: botao comparecimento nao encontrado')
    at = at.replace(old_btn, new_btn, 1)
    changed = True

if "path.includes('resultado')" not in at:
    old_dl = "      a.download = path.includes('comparecimento') ? 'comparecimento.csv' : 'votos.csv';"
    new_dl = (
        "      a.download = path.includes('comparecimento')\n"
        "        ? 'comparecimento.csv'\n"
        "        : path.includes('resultado')\n"
        "          ? 'apuracao.csv'\n"
        "          : 'votos.csv';"
    )
    if old_dl not in at:
        raise SystemExit('admin.html: downloadExport filename nao encontrado')
    at = at.replace(old_dl, new_dl, 1)
    changed = True

if "btnExportApuracao').addEventListener" not in at and 'btnExportApuracao").addEventListener' not in at:
    old_ev = (
        "    el('btnExportPresenca').addEventListener('click', () => downloadExport('/admin/votacoes/:id/export-comparecimento.csv'));\n"
    )
    new_ev = old_ev + (
        "    el('btnExportApuracao').addEventListener('click', () => downloadExport('/admin/votacoes/:id/export-resultado-v2.csv'));\n"
    )
    if old_ev not in at:
        raise SystemExit('admin.html: listener comparecimento nao encontrado')
    at = at.replace(old_ev, new_ev, 1)
    changed = True

if changed:
    admin.write_text(at, encoding='utf-8')
    print('runtime admin.html: atualizado')
else:
    print('runtime admin.html: ja ok')

# 4) runtime admin-app.js
app = rt / 'admin/assets/admin-app.js'
app_t = app.read_text(encoding='utf-8')
changed = False
if 'btnExportApuracao' not in app_t:
    old_btn = (
        '          <button type="button" class="secondary" id="btnExportPresenca">Exportar comparecimento</button>\n'
    )
    new_btn = old_btn + (
        '          <button type="button" class="secondary" id="btnExportApuracao">Exportar apuração (planilha)</button>\n'
    )
    if old_btn not in app_t:
        raise SystemExit('admin-app.js: botao comparecimento nao encontrado')
    app_t = app_t.replace(old_btn, new_btn, 1)
    changed = True

if "export-resultado-v2.csv" not in app_t:
    old_ev = (
        "    el('btnExportPresenca').addEventListener('click', () =>\n"
        "      downloadExport(pleitoId, 'export-comparecimento.csv', 'comparecimento.csv'),\n"
        "    )\n"
    )
    new_ev = old_ev + (
        "    el('btnExportApuracao').addEventListener('click', () =>\n"
        "      downloadExport(pleitoId, 'export-resultado-v2.csv', 'apuracao.csv'),\n"
        "    )\n"
    )
    if old_ev not in app_t:
        raise SystemExit('admin-app.js: listener comparecimento nao encontrado')
    app_t = app_t.replace(old_ev, new_ev, 1)
    changed = True

if changed:
    app.write_text(app_t, encoding='utf-8')
    print('runtime admin-app.js: atualizado')
else:
    print('runtime admin-app.js: ja ok')

# 5) espelha admin-app no Documentos (fonte)
doc_app = base / 'public/votacao/admin/assets/admin-app.js'
if doc_app.exists():
    doc_app.write_text(app.read_text(encoding='utf-8'), encoding='utf-8')
    print('Documentos admin-app.js: espelhado do runtime')

# sanity: resetPassword still in routes+controller
r = routes.read_text(encoding='utf-8')
c = (base / 'controllers/VotingAuditorController.js').read_text(encoding='utf-8')
if 'VotingAuditorController.resetPassword' not in r:
    raise SystemExit('ABORT: rota resetPassword sumiu')
if 'static async resetPassword' not in c and 'async resetPassword' not in c:
    raise SystemExit('ABORT: resetPassword ausente no auditor')
if 'exportResultsV2' not in ctrl.read_text(encoding='utf-8'):
    raise SystemExit('ABORT: exportResultsV2 nao ficou no controller')
if 'export-resultado-v2.csv' not in routes.read_text(encoding='utf-8'):
    raise SystemExit('ABORT: rota export-resultado ausente')
print('sanity OK')
PY

echo "== syntax check node =="
node --check "$BASE/controllers/VotingElectionAdminController.js"
node --check "$BASE/routes/votacaoRoutes.js"

echo "== apply into container (somente 2 arquivos) =="
docker cp "$BASE/controllers/VotingElectionAdminController.js" api:/app/controllers/VotingElectionAdminController.js
docker cp "$BASE/routes/votacaoRoutes.js" api:/app/routes/votacaoRoutes.js

echo "== restart SOMENTE api =="
docker restart api

echo "== wait health =="
ok=0
for i in $(seq 1 30); do
  if curl -sf -o /dev/null http://127.0.0.1:5000/health && curl -sf -o /dev/null http://127.0.0.1:5000/api/votacao/status; then
    ok=1
    break
  fi
  sleep 2
done

docker ps --filter name=^api$ --format '{{.Names}} {{.Status}}'
if [ "$ok" != "1" ]; then
  echo 'FALHA health — mostrando logs'
  docker logs api --tail 40
  exit 1
fi

echo "== verify endpoint (esperado 401 sem token) =="
code=$(curl -s -o /dev/null -w '%{http_code}' \
  http://127.0.0.1:5000/api/votacao/admin/votacoes/000000000000000000000000/export-resultado-v2.csv)
echo "export-resultado http=$code"
grep -n 'btnExportApuracao\|export-resultado' "$RT/admin.html" "$RT/admin/assets/admin-app.js" | head -20
echo DONE
