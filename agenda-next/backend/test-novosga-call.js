async function testNovoSgaDistributeAndCall() {
  const tokenRes = await fetch('http://10.15.25.31:8088/api/panels/semit/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({}),
  });
  const { accessToken } = await tokenRes.json();

  // 1. Distribuir Senha no NovoSGA
  console.log('Distribuindo senha no NovoSGA com prioridade 3 (Normal)...');
  const distRes = await fetch('http://10.15.25.31/api/distribui', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      unidade: 6,
      servico: 82,
      prioridade: 3,
      cliente: {
        nome: 'Cangaceiro Javascript',
        documento: '55149811223',
      },
    }),
  });
  console.log('Status distribui:', distRes.status);
  const ticket = await distRes.json();
  console.log('Ticket distribuido:', JSON.stringify(ticket, null, 2));

  // 2. Chamar a senha na API de atendimento
  if (ticket.id) {
    console.log('Chamando atendimento no NovoSGA...');
    const callRes = await fetch('http://10.15.25.31/api/atendimentos/chamar', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        unidade: 6,
        servico: 82,
        local: 2,
        atendimentoId: ticket.id,
      }),
    });
    console.log('Status chamar:', callRes.status);
    console.log('Resultado chamar:', await callRes.text());
  }

  // 3. Consultar painel da TV oficial
  const painelRes = await fetch('http://10.15.25.31/api/unidades/6/painel?servicos=82,83,84', {
    headers: { 'Authorization': `Bearer ${accessToken}` },
  });
  const list = await painelRes.json();
  console.log('Primeira senha no painel da TV:', JSON.stringify(list[0], null, 2));
}

testNovoSgaDistributeAndCall().catch(console.error);
