const { pushRecentPanelCall, getRecentPanelCalls } = require('./helpers/panel-calls-store')

const payload = {
  id: Date.now(),
  senha: 'AG01',
  siglaSenha: 'AG',
  numeroSenha: 1,
  local: 'Guichê',
  numeroLocal: 3,
  servico: { id: 82, nome: 'Transporte Escolar' },
  prioridade: 'Agendamento Web',
  peso: 1,
  corPrioridade: '#059669',
  nomeCliente: 'Teste Redis',
  calledAt: new Date().toISOString(),
  panelSlug: 'semit',
}

pushRecentPanelCall(payload)
  .then(() => getRecentPanelCalls())
  .then((items) => {
    console.log('OK stored', items.length, items[0]?.senha)
    process.exit(0)
  })
  .catch((err) => {
    console.error('ERR', err.message)
    process.exit(1)
  })
