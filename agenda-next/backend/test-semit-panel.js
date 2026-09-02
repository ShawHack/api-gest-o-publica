async function run() {
  const tokenRes = await fetch('http://10.15.25.31:8088/api/panels/semit/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({}),
  });
  const token = (await tokenRes.json()).accessToken;

  // Testar rotas de chamada no NovoSGA
  const routes = [
    'https://api.garca.sp.gov.br/senhas/api/unidades/6',
    'https://api.garca.sp.gov.br/senhas/api/unidades/6/servicos',
    'https://api.garca.sp.gov.br/senhas/api/atendimentos',
  ];

  for (const r of routes) {
    const res = await fetch(r, { headers: { 'Authorization': `Bearer ${token}` } });
    console.log(`GET ${r} -> ${res.status}`);
  }
}

run().catch(console.error);
