require('./models/AgendaAppointment');
require('./models/AgendaService');
require('./models/AgendaUnit');
require('./models/User');
const mongoose = require('./db/conn');
const { publishCallToPanel } = require('./helpers/panel-service');

async function testCall() {
  const appointment = await mongoose.model('AgendaAppointment').findOne().sort({ startsAt: -1 }).populate('serviceId').populate('unitId').lean();
  console.log('Agendamento selecionado para teste:', appointment?._id, appointment?.identitySnapshot?.name);
  if (!appointment) {
    console.log('Nenhum agendamento encontrado.');
    process.exit(0);
  }
  const res = await publishCallToPanel({
    panelSlug: 'sedetur',
    unitId: 4,
    ticket: 'AG01',
    prefix: 'AG',
    number: 1,
    localName: 'Mesa',
    localNumber: 1,
    serviceName: appointment.serviceId?.name || 'Transporte Escolar',
    serviceId: appointment.serviceId?._id,
    clientName: appointment.identitySnapshot?.name || 'Vinicius Donato',
    document: appointment.identitySnapshot?.cpf || '',
  });
  console.log('Resultado da publicação na TV:', res);
  process.exit(0);
}

testCall().catch((e) => {
  console.error(e);
  process.exit(1);
});
