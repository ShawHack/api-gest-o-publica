async function testFrontendSchema() {
  // 1. Inserir chamada
  const testCall = {
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

  const tokenRes = await fetch('http://10.15.25.31:8088/api/panels/semit/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({}),
  });
  const { accessToken } = await tokenRes.json();

  const res = await fetch('https://api.garca.sp.gov.br/senhas/api/unidades/6/painel?servicos=82,83,84', {
    headers: { 'Authorization': `Bearer ${accessToken}` },
  });

  const list = await res.json();
  console.log('Total recebido:', list.length);
  console.log('Item [0] recebido pelo frontend:', list[0]);
}

testFrontendSchema().catch(console.error);
