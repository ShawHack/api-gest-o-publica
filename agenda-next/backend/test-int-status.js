async function testIntStatus() {
  const tokenRes = await fetch('http://10.15.25.31:8088/api/panels/semit/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({}),
  });
  const { accessToken } = await tokenRes.json();

  const ticketId = 777;
  for (let i = 0; i <= 10; i++) {
    try {
      const res = await fetch('http://10.15.25.31/api/filas', {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          id: ticketId,
          novoStatus: i,
          local: 2,
          usuario: 2,
        }),
      });
      const text = await res.text();
      console.log(`novoStatus=${i} -> HTTP ${res.status}:`, text);
      if (res.status === 200 || res.status === 201) {
        console.log(`SUCESSO COM STATUS INTEIRO ${i}!`);
        return;
      }
    } catch (e) {}
  }
}

testIntStatus().catch(console.error);
