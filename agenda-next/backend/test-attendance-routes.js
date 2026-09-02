async function findAttendanceEndpoints() {
  const tokenRes = await fetch('http://10.15.25.31:8088/api/panels/semit/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({}),
  });
  const { accessToken } = await tokenRes.json();

  // Testar rotas comuns do NovoSGA 2.x
  const endpoints = [
    '/novosga.attendance/chamar',
    '/novosga.attendance/chama_senha',
    '/novosga.atendimento/chamar',
    '/attendance/chamar',
    '/atendimento/chamar',
    '/api/atendimentos',
    '/api/unidades/6/atendimentos',
  ];

  for (const ep of endpoints) {
    try {
      const res = await fetch(`http://10.15.25.31${ep}`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          unidade: 6,
          servico: 82,
          local: 2,
        }),
      });
      console.log(`POST http://10.15.25.31${ep} -> HTTP ${res.status}`);
      if (res.status !== 404 && res.status !== 405) {
        console.log('   Resposta:', (await res.text()).slice(0, 200));
      }
    } catch (e) {
      console.error(ep, e.message);
    }
  }
}

findAttendanceEndpoints().catch(console.error);
