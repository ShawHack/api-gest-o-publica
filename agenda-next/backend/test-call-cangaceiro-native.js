async function callCangaceiroNative() {
  console.log('1. Obtendo token OAuth do NovoSGA...');
  const tokenRes = await fetch('http://10.15.25.31:8088/api/panels/semit/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({}),
  });
  const { accessToken } = await tokenRes.json();

  console.log('2. Emitindo e chamando ticket oficial para Cangaceiro Javascript...');
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

  const ticket = await distRes.json();
  console.log('Ticket oficial gerado no NovoSGA:', {
    id: ticket.id,
    senha: ticket.senha?.format,
    cliente: ticket.cliente?.nome,
  });

  // Consultar se já está na lista da TV
  const tvRes = await fetch('http://10.15.25.31/api/unidades/6/painel?servicos=82,83,84', {
    headers: { 'Authorization': `Bearer ${accessToken}` },
  });
  const list = await tvRes.json();
  console.log('Item no topo da TV oficial:', list[0]);
}

callCangaceiroNative().catch(console.error);
