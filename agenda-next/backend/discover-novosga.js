async function discoverAllNovoSgaRoutes() {
  const tokenRes = await fetch('http://10.15.25.31:8088/api/panels/semit/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({}),
  });
  const { accessToken } = await tokenRes.json();

  // 1. Obter info da API
  const infoRes = await fetch('http://10.15.25.31/api', {
    headers: { 'Authorization': `Bearer ${accessToken}` },
  });
  console.log('API Info:', await infoRes.json().catch(() => ({})));

  // 2. Testar rotas de atendimentos / filas / triagem
  const candidates = [
    '/api/atendimentos',
    '/api/unidades/6/fila',
    '/api/unidades/6/filas',
    '/api/unidades/6/atendimentos',
    '/api/unidades/6/atendimentos/chamar',
    '/api/fila',
    '/api/filas',
    '/api/servicos',
    '/api/usuarios',
    '/api/unidades/6/usuarios',
  ];

  for (const c of candidates) {
    try {
      const res = await fetch(`http://10.15.25.31${c}`, {
        headers: { 'Authorization': `Bearer ${accessToken}` },
      });
      console.log(`[GET] ${c} -> HTTP ${res.status}`);
      if (res.ok) {
        const text = await res.text();
        console.log(`   Resultado (${c}):`, text.slice(0, 300));
      }
    } catch (e) {
      console.error(c, e.message);
    }
  }
}

discoverAllNovoSgaRoutes().catch(console.error);
