async function testNovoStatusKeys() {
  const tokenRes = await fetch('http://10.15.25.31:8088/api/panels/semit/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({}),
  });
  const { accessToken } = await tokenRes.json();

  const ticketId = 777;
  const statuses = ['chamado', 'iniciado', 'encerrado', 'cancelado', 'nao_compareceu'];
  const fieldNames = ['novoStatus', 'status', 'novo_status', 'action', 'acao'];

  for (const f of fieldNames) {
    for (const s of statuses) {
      try {
        const body = { id: ticketId, [f]: s, local: 2, usuario: 2 };
        const res = await fetch('http://10.15.25.31/api/filas', {
          method: 'PUT',
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(body),
        });
        const text = await res.text();
        if (res.status === 200 || res.status === 201) {
          console.log(`SUCESSO COM ${f}=${s}! Resposta:`, text);
          return;
        } else if (!text.includes('Novo status inválido')) {
          console.log(`DIFERENTE (${f}=${s}) -> HTTP ${res.status}:`, text);
        }
      } catch (e) {}
    }
  }
}

testNovoStatusKeys().catch(console.error);
