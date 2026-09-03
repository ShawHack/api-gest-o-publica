const mongoose = require('./db/conn');
require('./models/AgendaAppointment');
require('./models/AgendaService');
require('./models/AgendaUnit');
require('./models/User');

async function test() {
  const apt = await mongoose.model('AgendaAppointment').findOne({ status: { $in: ['booked', 'confirmed'] } }).sort({ startsAt: -1 }).lean();
  console.log('Agendamento para teste:', apt?._id, apt?.protocol, apt?.identitySnapshot?.name);

  const loginRes = await fetch('http://127.0.0.1:5000/api/users/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'saulo.lima@garca.sp.gov.br', password: 'Prefeitura@123' }),
  });
  const token = (await loginRes.json()).token;

  if (apt && token) {
    const callRes = await fetch(`http://127.0.0.1:5000/api/agenda/admin/appointments/${apt._id}/call`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify({ localName: 'Guichê', localNumber: 1 }),
    });
    console.log('Call Response Status:', callRes.status);
    const data = await callRes.json();
    console.log('Call Result:', JSON.stringify(data, null, 2));
  }

  process.exit(0);
}

test().catch(console.error);
