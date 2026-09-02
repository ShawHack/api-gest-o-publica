async function testMercurePublish() {
  const MERCURE_HUB = 'http://10.15.25.31:3000/.well-known/mercure';
  const topic = 'http://10.15.25.31/unidades/6/painel';
  const data = JSON.stringify({
    '@type': 'PainelSenha',
    'id': Date.now(),
  });

  const body = new URLSearchParams();
  body.set('topic', topic);
  body.set('data', data);

  console.log(`Publicando no Mercure Hub (${MERCURE_HUB}) topic=${topic}...`);
  try {
    const res = await fetch(MERCURE_HUB, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Authorization': 'Bearer !ChangeThisMercureHubJWTSecretKey!',
      },
      body: body.toString(),
    });

    console.log('Status Mercure com chave padrao:', res.status);
    console.log('Resposta:', await res.text());
  } catch (e) {
    console.error('Erro:', e.message);
  }

  // Tentar sem auth
  try {
    const res2 = await fetch(MERCURE_HUB, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: body.toString(),
    });
    console.log('Status Mercure sem auth:', res2.status);
    console.log('Resposta:', await res2.text());
  } catch (e) {
    console.error('Erro:', e.message);
  }
}

testMercurePublish().catch(console.error);
