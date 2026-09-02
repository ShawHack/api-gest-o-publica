async function testExternalVsInternal() {
  const tokenRes = await fetch('http://10.15.25.31:8088/api/panels/semit/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({}),
  });
  const { accessToken } = await tokenRes.json();

  console.log('1. Testando requisicao EXTERNA (https://api.garca.sp.gov.br/senhas/api/unidades/6/painel)...');
  const extRes = await fetch('https://api.garca.sp.gov.br/senhas/api/unidades/6/painel?servicos=82,83,84', {
    headers: { 'Authorization': `Bearer ${accessToken}` },
  });
  const extList = await extRes.json();
  console.log('Total na requisicao externa:', extList.length);
  console.log('Item [0] na requisicao EXTERNA:', extList[0]);

  console.log('\n2. Testando requisicao INTERNA DIRETA (http://127.0.0.1:5000/api/agenda/public/novosga-proxy/unidades/6/painel)...');
  const intRes = await fetch('http://127.0.0.1:5000/api/agenda/public/novosga-proxy/unidades/6/painel?servicos=82,83,84', {
    headers: { 'Authorization': `Bearer ${accessToken}` },
  });
  const intList = await intRes.json();
  console.log('Total na requisicao interna:', intList.length);
  console.log('Item [0] na requisicao INTERNA:', intList[0]);
}

testExternalVsInternal().catch(console.error);
