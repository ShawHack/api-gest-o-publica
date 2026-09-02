const mongoose = require('./db/conn');
require('./models/AgendaAppointment');
require('./models/AgendaService');
require('./models/AgendaUnit');
require('./models/User');

async function test() {
  const apt = await mongoose.model('AgendaAppointment').findOne().sort({ startsAt: -1 }).lean();
  console.log('Agendamento encontrado:', apt?._id, apt?.identitySnapshot?.name);

  const loginRes = await fetch('http://127.0.0.1:5000/api/users/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'saulo.lima@garca.sp.gov.br', password: 'Prefeitura@123' }),
  });
  const token = (await loginRes.json()).token;

  if (apt) {
    const callRes = await fetch(`http://127.0.0.1:5000/api/agenda/admin/appointments/${apt._id}/call`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify({ localName: 'Guichê', localNumber: 2 }),
    });
    console.log('Call Response Status:', callRes.status);
    const callData = await callRes.json();
    console.log('Call Response:', callData);
  }

  // Verificar se a chamada está no stream de chamadas recentes
  const recentRes = await fetch('http://127.0.0.1:5000/api/agenda/public/panels/calls');
  const recent = await recentRes.json();
  console.log('Chamadas recentes no painel:', recent);
  process.exit(0);
}

test().catch((e) => { console.error(e); process.exit(1); });
