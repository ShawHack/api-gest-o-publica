async function testNovoSgaPainel() {
  const tokenRes = await fetch('http://10.15.25.31:8088/api/panels/semit/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({}),
  });
  const tokenData = await tokenRes.json();
  const token = tokenData.accessToken;
  console.log('Token obtido:', token ? token.slice(0, 20) + '...' : 'FALHA');

  const painelRes = await fetch('https://api.garca.sp.gov.br/senhas/api/unidades/6/painel?servicos=82,83,84', {
    headers: { 'Authorization': `Bearer ${token}` },
  });
  console.log('Status NovoSGA painel:', painelRes.status);
  const data = await painelRes.json();
  console.log('Senhas retornadas pelo NovoSGA para a TV SEMIT:', JSON.stringify(data, null, 2));
}

testNovoSgaPainel().catch(console.error);
