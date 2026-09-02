const mongoose = require('mongoose');

async function testCallAndCheck() {
  const tokenRes = await fetch('http://10.15.25.31:8088/api/panels/semit/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({}),
  });
  const { accessToken } = await tokenRes.json();

  // 1. Simular registro em globalThis.__recentPanelCalls
  const fakeCall = {
    id: Date.now(),
    senha: 'AG01',
    siglaSenha: 'AG',
    numeroSenha: 1,
    local: 'Guichê',
    numeroLocal: 2,
    panelSlug: 'semit',
    servico: { id: 82, nome: 'Transporte Escolar' },
    nomeCliente: 'Cangaceiro Javascript',
  };

  const recent = globalThis.__recentPanelCalls || (globalThis.__recentPanelCalls = []);
  recent.unshift(fakeCall);

  // 2. Chamar o proxy exatamente como a TV em /p/semit chama
  const res = await fetch('https://api.garca.sp.gov.br/senhas/api/unidades/6/painel?servicos=82,83,84', {
    headers: { 'Authorization': `Bearer ${accessToken}` },
  });

  const list = await res.json();
  console.log('Total de itens recebidos pela TV oficial:', Array.isArray(list) ? list.length : list);
  if (Array.isArray(list) && list.length > 0) {
    console.log('Senha chamada no topo da TV:', list[0]);
  }
}

testCallAndCheck().catch(console.error);
