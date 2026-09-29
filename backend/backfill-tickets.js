const mongoose = require('./db/conn');
const AgendaAppointment = require('./models/AgendaAppointment');
const AgendaService = require('./models/AgendaService');
const AgendaUnit = require('./models/AgendaUnit');
const { nextAgendaTicketNumber } = require('./helpers/panel-calls-store');
const { zonedDateKey } = require('./helpers/agenda-time');

async function backfill() {
  await mongoose.connect(process.env.MONGODB_URI || 'mongodb://mongo:27017/apicemiterio?replicaSet=rs0');
  
  const filter = {
    status: { $in: ['booked', 'confirmed'] },
    $or: [{ panelTicket: { $exists: false } }, { panelTicket: '' }, { panelTicket: null }],
  };
  
  const pending = await AgendaAppointment.find(filter);
  console.log('Agendamentos pendentes de senha encontrados:', pending.length);

  for (const apt of pending) {
    const service = await AgendaService.findById(apt.serviceId).populate('unitId');
    const unit = service?.unitId || (apt.unitId ? await AgendaUnit.findById(apt.unitId) : null);
    const timezone = unit?.timezone || 'America/Sao_Paulo';
    const dateKey = zonedDateKey(apt.startsAt, timezone);
    const prefix = String(service?.panelPrefix || 'AG').trim() || 'AG';
    const ticketNumber = await nextAgendaTicketNumber(String(unit?._id || unit || 'default'), String(service?._id || service || 'default'), dateKey);
    const ticketCode = prefix + String(ticketNumber).padStart(2, '0');
    
    apt.panelTicket = ticketCode;
    apt.panelTicketPrefix = prefix;
    apt.panelTicketNumber = ticketNumber;
    await apt.save();
    console.log('Atribuído com sucesso:', apt.protocol, '-> Senha:', ticketCode);
  }

  process.exit(0);
}

backfill().catch((err) => {
  console.error('Erro no backfill:', err);
  process.exit(1);
});
