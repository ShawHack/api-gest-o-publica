async function inspectFilasEndpoint() {
  const tokenRes = await fetch('http://10.15.25.31:8088/api/panels/semit/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({}),
  });
  const { accessToken } = await tokenRes.json();

  const methods = ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'];
  for (const m of methods) {
    try {
      const res = await fetch('http://10.15.25.31/api/filas', {
        method: m,
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: m === 'POST' || m === 'PUT' ? JSON.stringify({ unidade: 6, usuario: 2, local: 2 }) : undefined,
      });
      console.log(`[${m}] /api/filas -> HTTP ${res.status}`);
      console.log('   Allow header:', res.headers.get('allow'));
      console.log('   Resposta:', (await res.text()).slice(0, 300));
    } catch (e) {
      console.error(m, e.message);
    }
  }
}

inspectFilasEndpoint().catch(console.error);
