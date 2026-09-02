#!/bin/bash
set -euo pipefail

BASE=/home/semit/Documentos/api-gestao-publica/backend
RT=/home/semit/runtime/api-gestao-publica/assets/backend-public/votacao
TS=$(date +%Y%m%d%H%M%S)

echo "== precheck =="
curl -sf -o /dev/null http://127.0.0.1:5000/health
curl -sf -o /dev/null http://127.0.0.1:5000/api/votacao/status
echo OK

cp -a "$BASE/routes/votacaoRoutes.js" "$BASE/routes/votacaoRoutes.js.bak-auditor-export-$TS"
cp -a "$RT/admin/assets/admin-app.js" "$RT/admin/assets/admin-app.js.bak-auditor-export-$TS"
cp -a "$RT/admin.html" "$RT/admin.html.bak-auditor-export-$TS"

python3 <<'PY'
from pathlib import Path

routes = Path('/home/semit/Documentos/api-gestao-publica/backend/routes/votacaoRoutes.js')
rtxt = routes.read_text(encoding='utf-8')
old = (
    "router.get(\n"
    "  '/admin/votacoes/:id/export-resultado-v2.csv',\n"
    "  verifyToken,\n"
    "  requireVotingAdmin,\n"
    "  VotingElectionAdminController.exportResultsV2\n"
    ")\n"
)
new = (
    "router.get(\n"
    "  '/admin/votacoes/:id/export-resultado-v2.csv',\n"
    "  verifyToken,\n"
    "  requireVotingPleitoRead,\n"
    "  VotingElectionAdminController.exportResultsV2\n"
    ")\n"
)
if 'export-resultado-v2.csv' not in rtxt:
    raise SystemExit('rota export-resultado ausente')
if 'requireVotingPleitoRead,\n  VotingElectionAdminController.exportResultsV2' in rtxt:
    print('routes: ja usa requireVotingPleitoRead')
elif old not in rtxt:
    raise SystemExit('bloco export-resultado nao encontrado para trocar middleware')
else:
    routes.write_text(rtxt.replace(old, new, 1), encoding='utf-8')
    print('routes: export-resultado agora requireVotingPleitoRead')

# admin-app: auditor so ve botao de apuracao (nao votos/comparecimento)
app = Path('/home/semit/runtime/api-gestao-publica/assets/backend-public/votacao/admin/assets/admin-app.js')
t = app.read_text(encoding='utf-8')
old_btns = """    main.innerHTML = `
      <div class="card">
        <h2>Apuração</h2>
        <p class="muted">Resultados deste pleito apenas — sem seletor de outro processo.</p>
        <div class="row">
          <button type="button" id="btnApurar">Atualizar</button>
          <button type="button" class="secondary" id="btnExportVotos">Exportar votos</button>
          <button type="button" class="secondary" id="btnExportPresenca">Exportar comparecimento</button>
          <button type="button" class="secondary" id="btnExportApuracao">Exportar apuração (planilha)</button>
        </div>
"""
new_btns = """    const write = V.canWrite()
    main.innerHTML = `
      <div class="card">
        <h2>Apuração</h2>
        <p class="muted">Resultados deste pleito apenas — sem seletor de outro processo.</p>
        <div class="row">
          <button type="button" id="btnApurar">Atualizar</button>
          ${write ? '<button type="button" class="secondary" id="btnExportVotos">Exportar votos</button>' : ''}
          ${write ? '<button type="button" class="secondary" id="btnExportPresenca">Exportar comparecimento</button>' : ''}
          <button type="button" class="secondary" id="btnExportApuracao">Exportar apuração (planilha)</button>
        </div>
"""
if '${write ? \'<button type="button" class="secondary" id="btnExportVotos">' in t or \
   "${write ? '<button type=\"button\" class=\"secondary\" id=\"btnExportVotos'>" in t or \
   "write ? '<button type=\"button\" class=\"secondary\" id=\"btnExportVotos'" in t:
    print('admin-app: botoes condicionais ja presentes')
elif old_btns not in t:
    # try without export apuracao already having write pattern
    raise SystemExit('admin-app: bloco de botoes Apuracao nao encontrado')
else:
    t = t.replace(old_btns, new_btns, 1)
    # listeners so para botoes existentes
    old_listeners = """    el('btnApurar').addEventListener('click', run)
    el('btnExportVotos').addEventListener('click', () =>
      downloadExport(pleitoId, 'export-votos-v2.csv', 'votos.csv'),
    )
    el('btnExportPresenca').addEventListener('click', () =>
      downloadExport(pleitoId, 'export-comparecimento.csv', 'comparecimento.csv'),
    )
    el('btnExportApuracao').addEventListener('click', () =>
      downloadExport(pleitoId, 'export-resultado-v2.csv', 'apuracao.csv'),
    )
"""
    new_listeners = """    el('btnApurar').addEventListener('click', run)
    if (write) {
      el('btnExportVotos').addEventListener('click', () =>
        downloadExport(pleitoId, 'export-votos-v2.csv', 'votos.csv'),
      )
      el('btnExportPresenca').addEventListener('click', () =>
        downloadExport(pleitoId, 'export-comparecimento.csv', 'comparecimento.csv'),
      )
    }
    el('btnExportApuracao').addEventListener('click', () =>
      downloadExport(pleitoId, 'export-resultado-v2.csv', 'apuracao.csv'),
    )
"""
    if old_listeners not in t:
        raise SystemExit('admin-app: listeners export nao encontrados')
    t = t.replace(old_listeners, new_listeners, 1)
    app.write_text(t, encoding='utf-8')
    print('admin-app: auditor ve so Exportar apuracao')

# espelha Documentos
doc = Path('/home/semit/Documentos/api-gestao-publica/backend/public/votacao/admin/assets/admin-app.js')
if doc.exists():
    doc.write_text(app.read_text(encoding='utf-8'), encoding='utf-8')
    print('Documentos admin-app.js espelhado')

# admin.html legado: so gestores usam? ainda assim liberar botao (rota ja libera auditor)
# Nao escondemos no admin.html legado pois nao tem V.canWrite; rota decide.
print('admin.html legado: inalterado (API decide autorizacao)')
PY

# sanity
grep -A5 "export-resultado-v2" "$BASE/routes/votacaoRoutes.js" | head -8
grep -n 'requireVotingAdmin' "$BASE/routes/votacaoRoutes.js" | grep export-resultado && {
  echo 'ABORT: ainda requireVotingAdmin no export-resultado'
  exit 1
} || true
grep -A6 "export-resultado-v2" "$BASE/routes/votacaoRoutes.js" | grep -q requireVotingPleitoRead

node --check "$BASE/routes/votacaoRoutes.js"

echo "== docker cp routes + restart api only =="
docker cp "$BASE/routes/votacaoRoutes.js" api:/app/routes/votacaoRoutes.js
docker restart api

ok=0
for i in $(seq 1 30); do
  if curl -sf -o /dev/null http://127.0.0.1:5000/health && curl -sf -o /dev/null http://127.0.0.1:5000/api/votacao/status; then
    ok=1
    break
  fi
  sleep 2
done
docker ps --filter name=^api$ --format '{{.Names}} {{.Status}}'
[ "$ok" = "1" ] || { docker logs api --tail 30; exit 1; }

# endpoint existe
code=$(curl -s -o /dev/null -w '%{http_code}' \
  http://127.0.0.1:5000/api/votacao/admin/votacoes/000000000000000000000000/export-resultado-v2.csv)
echo "export-resultado sem token=$code (esperado 401)"
echo DONE
