const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');

async function triggerLiveCall() {
  await mongoose.connect('mongodb://mongo:27017/apicemiterio?replicaSet=rs0');
  const User = mongoose.model('User', new mongoose.Schema({}, { strict: false }), 'users');
  const user = await User.findOne({ email: /saulo/i }).lean();
  console.log('Usuario encontrado:', { id: user._id, email: user.email, role: user.role });

  const JWT_SECRET = process.env.JWT_SECRET || 'secret';
  const token = jwt.sign(
    {
      id: String(user._id),
      email: user.email,
      role: user.role,
      agendaRole: 'global_admin',
    },
    JWT_SECRET,
    { expiresIn: '1h' }
  );

  console.log('Disparando chamada do Cangaceiro via endpoint oficial...');
  const res = await fetch('http://127.0.0.1:5000/api/agenda/admin/appointments/6a96ff1a0e95359e110f7fb7/call', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      localName: 'Guichê',
      localNumber: 2,
    }),
  });

  console.log('Status chamada atendente:', res.status);
  const data = await res.json();
  console.log('Resposta chamada:', data);

  // 2. Consultar o proxy que a TV consome
  console.log('\nConsultando proxy da TV oficial...');
  const tvTokenRes = await fetch('http://10.15.25.31:8088/api/panels/semit/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({}),
  });
  const { accessToken } = await tvTokenRes.json();

  const tvRes = await fetch('http://127.0.0.1:5000/api/agenda/public/novosga-proxy/unidades/6/painel?servicos=82,83,84', {
    headers: { 'Authorization': `Bearer ${accessToken}` },
  });

  const tvList = await tvRes.json();
  console.log('Total de itens na TV:', tvList.length);
  console.log('Item [0] no topo da TV:', tvList[0]);

  await mongoose.disconnect();
}

triggerLiveCall().catch(console.error);
