const mongoose = require('./db/conn');
const User = require('./models/User');
const jwt = require('jsonwebtoken');

async function testCall() {
  await mongoose.connect(process.env.MONGODB_URI || 'mongodb://mongo:27017/apicemiterio?replicaSet=rs0');
  
  // 1. Obter usuário admin / operador
  const admin = await User.findOne({ email: /saulo/i }).lean();
  if (!admin) {
    console.error('Usuário não encontrado');
    process.exit(1);
  }
  
  const token = jwt.sign(
    { id: admin._id, email: admin.email, role: 'agenda_admin' },
    process.env.JWT_SECRET || 'secret',
    { expiresIn: '1h' }
  );

  const aptId = '6abba3ffd11c942985b86e46';
  console.log('Chamando agendamento:', aptId);

  // 2. Chamar endpoint oficial de chamada
  const callRes = await fetch('http://127.0.0.1:5000/api/agenda/admin/appointments/' + aptId + '/call', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': 'Bearer ' + token,
    },
    body: JSON.stringify({ localName: 'Guichê', localNumber: 1 }),
  });

  console.log('Status da chamada:', callRes.status);
  const data = await callRes.json();
  console.log('Resultado da chamada:', JSON.stringify(data, null, 2));

  // 3. Consultar o proxy da TV oficial
  const proxyRes = await fetch('http://127.0.0.1:5000/api/agenda/public/novosga-proxy/unidades/6/painel?servicos=82,83,84');
  console.log('Status proxy TV:', proxyRes.status);
  const proxyList = await proxyRes.json();
  console.log('Primeira senha visível na TV oficial:', JSON.stringify(proxyList[0], null, 2));

  process.exit(0);
}

testCall().catch((e) => {
  console.error(e);
  process.exit(1);
});
