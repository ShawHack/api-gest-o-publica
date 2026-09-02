#!/usr/bin/env node
const fs = require('fs')
const path = process.argv[2] || '/home/semit/Documentos/api-semit/backend/controllers/AgendaController.js'
let content = fs.readFileSync(path, 'utf8')

const old = `      // 3. Chamadas recentes da Agenda (TTL 2 min, ids compatíveis com NovoSGA)
      const recentCalls = globalThis.__recentPanelCalls || []
      const agendaTtlMs = 120_000
      const nowMs = Date.now()
      const maxNovosgaId = novosgaCalls.reduce((max, c) => Math.max(max, Number(c.id) || 0), 0)
      const agendaCalls = recentCalls
        .filter((c) => {
          const calledMs = Date.parse(c.calledAt || '')
          return Number.isFinite(calledMs) && (nowMs - calledMs) < agendaTtlMs
        })`

const replacement = `      // 3. Chamadas recentes da Agenda (TTL 2 min, ids compatíveis com NovoSGA)
      const store = globalThis.__recentPanelCalls || (globalThis.__recentPanelCalls = [])
      let recentCalls = Array.isArray(store) ? store : []
      if (!recentCalls.length) {
        try {
          const port = Number(process.env.PORT || 5000)
          const selfRes = await fetch(\`http://127.0.0.1:\${port}/api/agenda/public/panels/calls\`, {
            signal: AbortSignal.timeout(2000),
          })
          if (selfRes.ok) {
            const data = await selfRes.json()
            if (Array.isArray(data.items)) recentCalls = data.items
          }
        } catch (_e) {}
      }
      const agendaTtlMs = 120_000
      const nowMs = Date.now()
      const maxNovosgaId = novosgaCalls.reduce((max, c) => Math.max(max, Number(c.id) || 0), 0)
      const agendaCalls = recentCalls
        .filter((c) => {
          const calledMs = Date.parse(c.calledAt || '') || (Number(c.id) > 1_000_000_000 ? Number(c.id) : NaN)
          return Number.isFinite(calledMs) && (nowMs - calledMs) < agendaTtlMs
        })`

if (content.includes('let recentCalls = Array.isArray(store)')) {
  console.log('already patched v2')
} else if (!content.includes(old)) {
  console.error('block not found')
  process.exit(1)
} else {
  content = content.replace(old, replacement)
  fs.writeFileSync(path, content, 'utf8')
  console.log('patched v2 ok')
}
