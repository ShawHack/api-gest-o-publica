async function checkPrioridades() {
  const tokenRes = await fetch('http://10.15.25.31:8088/api/panels/semit/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({}),
  });
  const { accessToken } = await tokenRes.json();

  const res = await fetch('http://10.15.25.31/api/prioridades', {
    headers: { 'Authorization': `Bearer ${accessToken}` },
  });
  console.log('Prioridades NovoSGA:', await res.json());

  // Obter serviços da unidade 6
  const servRes = await fetch('http://10.15.25.31/api/unidades/6/servicos', {
    headers: { 'Authorization': `Bearer ${accessToken}` },
  });
  console.log('Servicos da Unidade 6:', await servRes.json());
}

checkPrioridades().catch(console.error);
