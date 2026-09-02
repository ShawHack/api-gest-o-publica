const crypto = require('crypto');

function makeJwt(secret) {
  const header = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64url');
  const payload = Buffer.from(JSON.stringify({
    mercure: {
      publish: ['*'],
      subscribe: ['*'],
    },
    exp: Math.floor(Date.now() / 1000) + 86400,
  })).toString('base64url');
  const signature = crypto.createHmac('sha256', secret).update(`${header}.${payload}`).digest('base64url');
  return `${header}.${payload}.${signature}`;
}

async function testMercure() {
  const secret = '!ChangeThisMercureHubJWTSecretKey!';
  const token = makeJwt(secret);
  const MERCURE_HUB = 'http://10.15.25.31:3000/.well-known/mercure';

  const topics = [
    'http://10.15.25.31/unidades/6/painel',
    '/unidades/6/painel',
    '/paineis',
    'http://10.15.25.31/paineis',
  ];

  const payload = {
    '@type': 'PainelSenha',
    id: Date.now(),
    senha: 'AG017',
    siglaSenha: 'AG',
    numeroSenha: 17,
    local: 'Guichê',
    numeroLocal: 3,
    peso: 1,
    prioridade: 'Agendamento Web',
    corPrioridade: '#059669',
    nomeCliente: 'cidadao',
    documentoCliente: '83253860027',
    servico: { id: 82, nome: 'Transporte Escolar' },
  };

  for (const topic of topics) {
    const body = new URLSearchParams();
    body.set('topic', topic);
    body.set('data', JSON.stringify(payload));

    const res = await fetch(MERCURE_HUB, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Authorization': `Bearer ${token}`,
      },
      body: body.toString(),
    });

    console.log(`Topic: ${topic} -> Status: ${res.status}, Resposta: ${await res.text()}`);
  }
}

testMercure().catch(console.error);
