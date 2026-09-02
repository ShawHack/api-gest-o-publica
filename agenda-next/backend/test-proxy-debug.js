async function testProxy() {
  const unitId = 6;
  const servicos = '82,83,84';
  const query = servicos ? `?servicos=${encodeURIComponent(servicos)}` : '';

  let token = '';
  try {
    const slug = unitId === 4 ? 'sedetur' : 'semit';
    const tokenRes = await fetch(`http://10.15.25.31:8088/api/panels/${slug}/token`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({}),
      signal: AbortSignal.timeout(3000),
    });
    if (tokenRes.ok) {
      const tokenData = await tokenRes.json();
      token = tokenData.accessToken || '';
    }
  } catch (e) {
    console.error('Erro token:', e.message);
  }
  console.log('Token obtido:', token ? token.slice(0, 15) + '...' : 'SEM TOKEN');

  let novosgaCalls = [];
  try {
    const headers = token ? { Authorization: `Bearer ${token}` } : {};
    const novosgaRes = await fetch(`https://api.garca.sp.gov.br/senhas/api/unidades/${unitId}/painel${query}`, {
      headers,
      signal: AbortSignal.timeout(3000),
    });
    console.log('Status NovoSGA:', novosgaRes.status);
    if (novosgaRes.ok) {
      const data = await novosgaRes.json();
      console.log('Retorno NovoSGA:', Array.isArray(data) ? `Array com ${data.length} itens` : typeof data);
      if (Array.isArray(data)) novosgaCalls = data;
    }
  } catch (e) {
    console.error('Erro NovoSGA:', e.message);
  }

  console.log('Total de chamadas do NovoSGA:', novosgaCalls.length);
}

testProxy().catch(console.error);
