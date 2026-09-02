async function testEndToEnd() {
  // 1. Simular chamada enviada pela Agenda Garça
  const fakeCall = {
    id: Date.now(),
    senha: 'AG01',
    siglaSenha: 'AG',
    numeroSenha: 1,
    local: 'Guichê',
    numeroLocal: 2,
    panelSlug: 'semit',
    servico: { id: 82, nome: 'Transporte Escolar' },
    nomeCliente: 'Vinicius Donato',
  };

  // 2. Chamar endpoint interno da Agenda Garça
  console.log('Simulando chamada na Agenda Garça...');
  // A chamada armazena em globalThis.__recentPanelCalls

  // 3. Testar a rota do Painel Oficial consumida pela TV em /p/semit
  const tokenRes = await fetch('http://10.15.25.31:8088/api/panels/semit/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({}),
  });
  const { accessToken } = await tokenRes.json();

  const tvRes = await fetch('https://api.garca.sp.gov.br/senhas/api/unidades/6/painel?servicos=82,83,84', {
    headers: { 'Authorization': `Bearer ${accessToken}` },
  });

  const list = await tvRes.json();
  console.log('Total de itens recebidos pelo painel oficial da TV:', list.length);
  console.log('Item mais recente (topo da TV):', JSON.stringify(list[0], null, 2));
}

testEndToEnd().catch(console.error);
