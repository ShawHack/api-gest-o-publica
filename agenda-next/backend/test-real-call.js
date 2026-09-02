const mongoose = require('mongoose');

async function testCallAndCheckTv() {
  const MONGO_URI = 'mongodb://mongo:27017/apicemiterio?replicaSet=rs0';
  await mongoose.connect(MONGO_URI);

  // 1. Obter atendente para auth
  const User = mongoose.model('User', new mongoose.Schema({}, { strict: false }), 'users');
  const user = await User.findOne({ email: /saulo/i }).lean();
  console.log('Usuario:', user?.email);

  // 2. Chamar o appointment via script
  const AgendaAppointment = mongoose.model('AgendaAppointment', new mongoose.Schema({}, { strict: false }), 'agendaappointments');
  const apt = await AgendaAppointment.findById('6a96ff1a0e95359e110f7fb7').lean();

  const callData = {
    id: Date.now(),
    senha: 'AG01',
    siglaSenha: 'AG',
    numeroSenha: 1,
    local: 'Guichê',
    numeroLocal: 2,
    panelSlug: 'semit',
    servico: { id: 82, nome: 'Transporte Escolar' },
    nomeCliente: 'Cangaceiro Javascript',
  };

  // 3. Fazer request na rota publica do proxy da TV
  const tokenRes = await fetch('http://10.15.25.31:8088/api/panels/semit/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({}),
  });
  const { accessToken } = await tokenRes.json();

  const res = await fetch('https://api.garca.sp.gov.br/senhas/api/unidades/6/painel?servicos=82,83,84', {
    headers: { 'Authorization': `Bearer ${accessToken}` },
  });

  const list = await res.json();
  console.log('Retorno recebido pela TV oficial:', JSON.stringify(list.slice(0, 3), null, 2));

  await mongoose.disconnect();
}

testCallAndCheckTv().catch(console.error);
