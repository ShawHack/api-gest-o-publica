async function testTvWithToken() {
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
  console.log('Status HTTP recebido pela TV oficial:', res.status);
  console.log('Total de itens:', Array.isArray(list) ? list.length : list);
  if (Array.isArray(list) && list.length > 0) {
    console.log('Item [0] no topo da TV:', list[0]);
  }
}

testTvWithToken().catch(console.error);
