const mongoose = require('mongoose');

async function testCallExecution() {
  await mongoose.connect('mongodb://mongo:27017/apicemiterio?replicaSet=rs0');

  // 1. Obter atendente
  const User = mongoose.model('User', new mongoose.Schema({}, { strict: false }), 'users');
  const user = await User.findOne({ email: /saulo/i }).lean();

  // 2. Obter agendamento
  const AgendaAppointment = mongoose.model('AgendaAppointment', new mongoose.Schema({}, { strict: false }), 'agendaappointments');
  const apt = await AgendaAppointment.findById('6a96ff1a0e95359e110f7fb7').lean();

  console.log('Testando requisicao interna...');
  const res = await fetch('http://127.0.0.1:5000/api/agenda/public/novosga-proxy/unidades/6/painel?servicos=82,83,84');
  console.log('Status proxy:', res.status);
  const data = await res.json();
  console.log('Total recebido:', data.length);

  await mongoose.disconnect();
}

testCallExecution().catch(console.error);
