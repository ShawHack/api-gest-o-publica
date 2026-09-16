#!/usr/bin/env python3
"""Corrige import CSV de eleitores: nao cair no arquivo default inexistente."""
from pathlib import Path
from datetime import datetime
import subprocess

HOST = Path("/home/semit/Documentos/api-semit/backend")
stamp = datetime.now().strftime("%Y%m%d%H%M%S")

# Patch host copies (source of truth for next rebuild)
helper = HOST / "helpers/voting-csv-import.js"
ctrl = HOST / "controllers/VotingElectionAdminController.js"
admin_js = HOST / "admin-app.votacao.production.js"

for p in (helper, ctrl):
    if p.exists():
        bak = p.with_suffix(p.suffix + f".bak-csvimport-{stamp}")
        bak.write_text(p.read_text(encoding="utf-8"), encoding="utf-8")
        print("backup", bak)

# --- helper ---
h = helper.read_text(encoding="utf-8")
old_h = """async function importVotersFromCsv(VotingServidor, options = {}) {
  const filePath = options.filePath || DEFAULT_CSV
  const content = options.content || fs.readFileSync(filePath, 'utf8')
  const { rows, errors } = parseFuncionarioCsv(content)"""
new_h = """async function importVotersFromCsv(VotingServidor, options = {}) {
  const filePath = options.filePath || DEFAULT_CSV
  let content = options.content
  if (content == null || !String(content).trim()) {
    if (options.allowFileFallback && fs.existsSync(filePath)) {
      content = fs.readFileSync(filePath, 'utf8')
    } else {
      const err = new Error('CSV vazio ou nao enviado. Cole o conteudo no campo e tente novamente.')
      err.statusCode = 400
      err.code = 'CSV_REQUIRED'
      throw err
    }
  }
  const { rows, errors } = parseFuncionarioCsv(content)
  if (!rows.length && !errors.length) {
    const err = new Error('Nenhuma linha valida encontrada. Use separador ; e colunas Nome; Empresa; Departamento; Cargo; Matricula; CPF.')
    err.statusCode = 400
    err.code = 'CSV_EMPTY_ROWS'
    throw err
  }"""
if old_h not in h:
    raise SystemExit('helper bloco nao encontrado')
helper.write_text(h.replace(old_h, new_h, 1), encoding="utf-8")
print("helper patched")

# --- controller ---
c = ctrl.read_text(encoding="utf-8")
old_c = """  async importVoters(req, res) {
    try {
      const content = req.body?.csv
      const result = await importVotersFromCsv(VotingServidor, content ? { content } : {})
      void recordVoteEvent(req, {
        action: 'admin.voters_import',
        resourceType: 'voting_servidor',
        eventType: 'CREATE',
        meta: {
          imported: result.imported,
          updated: result.updated,
          skipped: result.skipped,
          errors: result.errors.length,
        },
      })
      return res.json(result)
    } catch (e) {
      console.error('[VotingElectionAdmin.importVoters]', e)
      return res.status(500).json({ message: 'Erro ao importar eleitores.' })
    }
  }"""
new_c = """  async importVoters(req, res) {
    try {
      const content = req.body?.csv
      if (content == null || !String(content).trim()) {
        return res.status(400).json({
          message: 'Cole o conteudo do CSV antes de importar (separador ;).',
          code: 'CSV_REQUIRED',
        })
      }
      const result = await importVotersFromCsv(VotingServidor, { content: String(content) })
      void recordVoteEvent(req, {
        action: 'admin.voters_import',
        resourceType: 'voting_servidor',
        eventType: 'CREATE',
        meta: {
          imported: result.imported,
          updated: result.updated,
          skipped: result.skipped,
          errors: result.errors.length,
        },
      })
      return res.json(result)
    } catch (e) {
      console.error('[VotingElectionAdmin.importVoters]', e)
      const status = Number(e.statusCode) || 500
      return res.status(status).json({
        message: e.message || 'Erro ao importar eleitores.',
        code: e.code || 'IMPORT_FAILED',
      })
    }
  }"""
if old_c not in c:
    raise SystemExit('controller bloco nao encontrado')
ctrl.write_text(c.replace(old_c, new_c, 1), encoding="utf-8")
print("controller patched")

# --- admin UI: melhor mensagem ---
if admin_js.exists():
    a = admin_js.read_text(encoding="utf-8")
    old_a = """    el('btnImport').addEventListener('click', async () => {
      try {
        const result = await api('/admin/servidores/import', {
          method: 'POST',
          body: JSON.stringify({ csv: el('csvContent').value }),
        })
        el('importResult').textContent = JSON.stringify(result, null, 2)
        await refreshServidores()
      } catch (e) {
        el('importResult').textContent = e.message
      }
    })"""
    new_a = """    el('btnImport').addEventListener('click', async () => {
      try {
        const csv = String(el('csvContent').value || '').trim()
        if (!csv) {
          el('importResult').textContent = 'Cole o conteudo do CSV antes de importar.'
          return
        }
        el('importResult').textContent = 'Importando...'
        const result = await api('/admin/servidores/import', {
          method: 'POST',
          body: JSON.stringify({ csv }),
        })
        el('importResult').textContent = JSON.stringify(result, null, 2)
        await refreshServidores()
      } catch (e) {
        el('importResult').textContent = e.message || 'Erro ao importar eleitores.'
      }
    })"""
    if old_a in a:
        bak = admin_js.with_suffix(admin_js.suffix + f".bak-csvimport-{stamp}")
        bak.write_text(a, encoding="utf-8")
        admin_js.write_text(a.replace(old_a, new_a, 1), encoding="utf-8")
        print("admin js patched")
    else:
        print("admin js bloco nao encontrado (ok se ja diferente)")

# Copy into running container /app (not bind-mounted for helpers)
for rel in (
    "helpers/voting-csv-import.js",
    "controllers/VotingElectionAdminController.js",
):
    src = HOST / rel
    subprocess.check_call(["docker", "cp", str(src), f"api:/app/{rel}"])
    print("copied", rel)

# admin js location in container
for cand in (
    "/app/admin-app.votacao.production.js",
    "/app/public/votacao/admin-app.votacao.production.js",
    "/app/public/admin-app.votacao.production.js",
):
    r = subprocess.run(["docker", "exec", "api", "test", "-f", cand])
    if r.returncode == 0:
        subprocess.check_call(["docker", "cp", str(admin_js), f"api:{cand}"])
        print("copied admin to", cand)

subprocess.check_call(["docker", "restart", "api"])
print("api restarted")
