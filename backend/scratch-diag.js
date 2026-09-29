const mongoose = require('./db/conn');
const AgendaAppointment = require('./models/AgendaAppointment');
const AgendaService = require('./models/AgendaService');
const AgendaUnit = require('./models/AgendaUnit');
const { nextAgendaTicketNumber } = require('./helpers/panel-calls-store');
const { zonedDateKey } = require('./helpers/agenda-time');

async function check() {
  await mongoose.connect(process.env.MONGODB_URI || 'mongodb://mongo:27017/apicemiterio?replicaSet=rs0');
  const apt = await AgendaAppointment.findById('6abba3ffd11c942985b86e46');
  console.log('Appointment found:', apt?._id, 'protocol:', apt?.protocol, 'panelTicket:', JSON.stringify(apt?.panelTicket));
  if (!apt) return process.exit(0);

  const service = await AgendaService.findById(apt.serviceId).populate('unitId');
  console.log('Service found:', service?.name, 'panelPrefix:', service?.panelPrefix, 'unit:', service?.unitId?.name);

  const timezone = service.unitId?.timezone || 'America/Sao_Paulo';
  const dateKey = zonedDateKey(apt.startsAt, timezone);
  const prefix = String(service?.panelPrefix || 'AG').trim() || 'AG';
  const ticketNumber = await nextAgendaTicketNumber(String(service.unitId._id || service.unitId), String(service._id), dateKey);
  const ticketCode = prefix + String(ticketNumber).padStart(2, '0');
  console.log('Generated ticketCode:', ticketCode, 'prefix:', prefix, 'number:', ticketNumber);

  process.exit(0);
}
check().catch(e => { console.error('Error:', e); process.exit(1); });
