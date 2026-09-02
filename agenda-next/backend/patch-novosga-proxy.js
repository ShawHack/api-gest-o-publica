#!/usr/bin/env node
/** Patch novosgaProxyPainel: TTL nas chamadas da agenda + ids compatíveis com NovoSGA */
const fs = require('fs')
const path = process.argv[2] || '/home/semit/Documentos/api-semit/backend/controllers/AgendaController.js'
let content = fs.readFileSync(path, 'utf8')

const oldBlock = `      // 3. Buscar chamadas recentes da Agenda Garça para o topo da lista
      const recentCalls = globalThis.__recentPanelCalls || []
      const agendaCalls = recentCalls
        .slice(0, 5)
        .map((c) => ({
          id: Number(c.id) || Date.now(),
          senha: String(c.senha || 'AG01'),
          siglaSenha: String(c.siglaSenha || 'AG'),
          numeroSenha: Number(c.numeroSenha) || 1,
          local: String(c.local || 'Guichê'),
          numeroLocal: Number(c.numeroLocal) || 1,
          peso: 1,
          prioridade: 'Agendamento Web',
          corPrioridade: '#059669',
          nomeCliente: c.nomeCliente ? String(c.nomeCliente) : null,
          documentoCliente: c.documentoCliente ? String(c.documentoCliente) : null,
          servico: {
            id: unitId === 6 ? 82 : (unitId === 4 ? 85 : 82),
            nome: String(c.servico?.nome || 'Agendamento'),
          },
        }))

      // 4. Mesclar (chamadas da Agenda mais recentes aparecem no topo)
      const merged = [...agendaCalls, ...novosgaCalls]`

const newBlock = `      // 3. Chamadas recentes da Agenda (TTL 2 min, ids compatíveis com NovoSGA)
      const recentCalls = globalThis.__recentPanelCalls || []
      const agendaTtlMs = 120_000
      const nowMs = Date.now()
      const maxNovosgaId = novosgaCalls.reduce((max, c) => Math.max(max, Number(c.id) || 0), 0)
      const agendaCalls = recentCalls
        .filter((c) => {
          const calledMs = Date.parse(c.calledAt || '')
          return Number.isFinite(calledMs) && (nowMs - calledMs) < agendaTtlMs
        })
        .slice(0, 5)
        .map((c, index) => ({
          id: maxNovosgaId + index + 1,
          senha: String(c.senha || 'AG01'),
          siglaSenha: String(c.siglaSenha || 'AG'),
          numeroSenha: Number(c.numeroSenha) || 1,
          local: String(c.local || 'Guichê'),
          numeroLocal: Number(c.numeroLocal) || 1,
          peso: 1,
          prioridade: 'Agendamento Web',
          corPrioridade: '#059669',
          nomeCliente: c.nomeCliente ? String(c.nomeCliente) : null,
          documentoCliente: c.documentoCliente ? String(c.documentoCliente) : null,
          calledAt: c.calledAt || new Date().toISOString(),
          servico: {
            id: unitId === 6 ? 82 : (unitId === 4 ? 85 : 82),
            nome: String(c.servico?.nome || 'Agendamento'),
          },
        }))

      // 4. Mesclar por data de chamada (mais recente primeiro)
      const merged = [...agendaCalls, ...novosgaCalls].sort((a, b) => {
        const ta = Date.parse(a.calledAt || '') || Number(a.id) || 0
        const tb = Date.parse(b.calledAt || '') || Number(b.id) || 0
        return tb - ta
      })`

if (content.includes('agendaTtlMs')) {
  console.log('AgendaController already patched')
} else if (!content.includes(oldBlock)) {
  console.error('AgendaController block not found')
  process.exit(1)
} else {
  content = content.replace(oldBlock, newBlock)
  fs.writeFileSync(path, content, 'utf8')
  console.log('AgendaController patched ok')
}
