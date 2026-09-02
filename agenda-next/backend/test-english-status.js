async function testEnglishStatus() {
  const tokenRes = await fetch('http://10.15.25.31:8088/api/panels/semit/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({}),
  });
  const { accessToken } = await tokenRes.json();

  const ticketId = 777;
  const testStatus = ['called', 'calling', 'call', 'serving', 'served', 'completed', 'canceled', 'no_show'];
  for (const st of testStatus) {
    try {
      const res = await fetch('http://10.15.25.31/api/filas', {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          id: ticketId,
          status: st,
          unidade: 6,
          local: 2,
          usuario: 2,
        }),
      });
      console.log(`PUT /api/filas status=${st} -> HTTP ${res.status}`);
      const text = await res.text();
      console.log('   Resposta:', text);
      if (res.status === 200 || res.status === 201) {
        console.log(`SUCESSO COM STATUS: ${st}!`);
        break;
      }
    } catch (e) {
      console.error(st, e.message);
    }
  }
}

testEnglishStatus().catch(console.error);
