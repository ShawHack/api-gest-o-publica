const crypto = require('crypto');

function makeJwt(secret) {
  const header = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64url');
  const payload = Buffer.from(JSON.stringify({
    mercure: {
      publish: ['*'],
      subscribe: ['*'],
    },
    exp: Math.floor(Date.now() / 1000) + 3600,
  })).toString('base64url');
  const signature = crypto.createHmac('sha256', secret).update(`${header}.${payload}`).digest('base64url');
  return `${header}.${payload}.${signature}`;
}

const secrets = [
  '!ChangeMe!',
  'novosga',
  'secret',
  'mercure',
  'garca',
  'semit',
  'Prefeitura@123',
  'novosga2',
  'caddy',
  'cgp',
  'jwt_secret',
];

async function testAll() {
  for (const s of secrets) {
    const token = makeJwt(s);
    try {
      const body = new URLSearchParams();
      body.set('topic', 'http://10.15.25.31/unidades/4/painel');
      body.set('data', JSON.stringify({ '@type': 'PainelSenha', id: 9999 }));

      const res = await fetch('http://10.15.25.31:3000/.well-known/mercure', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'Authorization': `Bearer ${token}`,
        },
        body: body.toString(),
      });

      console.log(`Secret: "${s}" -> Status: ${res.status}`);
      if (res.ok) {
        const text = await res.text();
        console.log(`🎉 SUCESSO com secret "${s}"! ID gerado pelo Mercure: ${text}`);
        return s;
      }
    } catch (err) {
      console.error(`Erro com ${s}:`, err.message);
    }
  }
}

testAll().then(() => process.exit(0)).catch((e) => { console.error(e); process.exit(1); });
