async function inspectApiRoutes() {
  const tokenRes = await fetch('http://10.15.25.31:8088/api/panels/semit/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({}),
  });
  const { accessToken } = await tokenRes.json();

  const ticketId = 767;
  const testEndpoints = [
    { method: 'POST', url: `http://10.15.25.31/api/atendimentos/${ticketId}/chamar` },
    { method: 'POST', url: `http://10.15.25.31/api/atendimento/${ticketId}/chamar` },
    { method: 'POST', url: `http://10.15.25.31/api/unidades/6/chamar` },
    { method: 'POST', url: `http://10.15.25.31/api/chamar` },
    { method: 'POST', url: `http://10.15.25.31/api/chamada` },
    { method: 'POST', url: `http://10.15.25.31/api/painel/chamar` },
    { method: 'POST', url: `http://10.15.25.31/api/unidades/6/painel` },
  ];

  for (const ep of testEndpoints) {
    try {
      const res = await fetch(ep.url, {
        method: ep.method,
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          local: 'Guichê',
          numeroLocal: 2,
          servico: 82,
          atendimento: ticketId,
          atendimentoId: ticketId,
          usuario: 2,
        }),
      });
      console.log(`[${ep.method}] ${ep.url} -> HTTP ${res.status}`);
      if (res.status !== 404 && res.status !== 405) {
        console.log('   Resposta:', await res.text());
      }
    } catch (e) {
      console.error(ep.url, e.message);
    }
  }
}

inspectApiRoutes().catch(console.error);
