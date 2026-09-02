async function testPutFilas() {
  const tokenRes = await fetch('http://10.15.25.31:8088/api/panels/semit/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({}),
  });
  const { accessToken } = await tokenRes.json();

  // 1. Distribuir um ticket novinho no NovoSGA
  console.log('Distribuindo ticket no NovoSGA...');
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
        nome: 'Vinicius Donato',
        documento: '51814026827',
      },
    }),
  });
  const ticket = await distRes.json();
  console.log('Ticket criado no NovoSGA:', { id: ticket.id, senha: ticket.senha?.format });

  // 2. Testar status para PUT /api/filas
  const testStatus = ['chamado', 'chamando', 'chamar', 'atendendo', 'iniciado', 'iniciar', 'emitido', 'transferido'];
  for (const st of testStatus) {
    try {
      const res = await fetch('http://10.15.25.31/api/filas', {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          id: ticket.id,
          status: st,
          unidade: 6,
          local: 2,
          usuario: 2,
        }),
      });
      console.log(`PUT /api/filas status=${st} -> HTTP ${res.status}`);
      const text = await res.text();
      console.log('   Resposta:', text);
      if (res.status === 200 || res.status === 201) {
        console.log(`SUCESSO COM STATUS: ${st}!`);
        break;
      }
    } catch (e) {
      console.error(st, e.message);
    }
  }

  // 3. Consultar a API de painel do NovoSGA para ver se entrou na TV
  const painelRes = await fetch('http://10.15.25.31/api/unidades/6/painel?servicos=82,83,84', {
    headers: { 'Authorization': `Bearer ${accessToken}` },
  });
  const list = await painelRes.json();
  console.log('Topo da TV NovoSGA:', list[0]);
}

testPutFilas().catch(console.error);
