async function testDirectTvCall() {
  const payload = {
    id: Date.now(),
    senha: 'AG01',
    siglaSenha: 'AG',
    numeroSenha: 1,
    local: 'Guichê',
    numeroLocal: 2,
    servico: {
      id: 82,
      nome: 'Transporte Escolar',
    },
    prioridade: 'Agendamento Web',
    peso: 1,
    corPrioridade: '#059669',
    nomeCliente: 'Cangaceiro Javascript',
    documentoCliente: '55149811223',
    calledAt: new Date().toISOString(),
  };

  console.log('Enviando chamada direta para http://10.15.25.31:8088/api/panels/semit/call...');
  const res = await fetch('http://10.15.25.31:8088/api/panels/semit/call', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });

  console.log('Status HTTP:', res.status);
  const data = await res.json();
  console.log('Resposta do painel oficial:', data);
}

testDirectTvCall().catch(console.error);
