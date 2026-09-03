const mongoose = require('mongoose');

async function main() {
  await mongoose.connect('mongodb://mongo:27017/apicemiterio?replicaSet=rs0');

  const AgendaAppointment = mongoose.model('AgendaAppointment', new mongoose.Schema({
    unitId: { type: mongoose.Schema.Types.ObjectId, ref: 'AgendaUnit' },
    serviceId: { type: mongoose.Schema.Types.ObjectId, ref: 'AgendaService' },
    resourceId: { type: mongoose.Schema.Types.ObjectId, ref: 'AgendaResource' },
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    startsAt: Date,
    status: String,
    protocol: String,
    panelTicket: String,
    identitySnapshot: Object,
  }));

  const AgendaUnit = mongoose.model('AgendaUnit', new mongoose.Schema({ name: String }));
  const AgendaService = mongoose.model('AgendaService', new mongoose.Schema({ name: String, unitId: mongoose.Schema.Types.ObjectId }));
  const AgendaResource = mongoose.model('AgendaResource', new mongoose.Schema({ name: String, email: String, unitId: mongoose.Schema.Types.ObjectId }));

  const from = new Date('2026-09-03T00:00:00.000-03:00');
  const to = new Date('2026-09-03T23:59:59.999-03:00');

  const list = await AgendaAppointment.find({ startsAt: { $gte: from, $lte: to } })
    .populate('unitId', 'name')
    .populate('serviceId', 'name unitId')
    .populate('resourceId', 'name email')
    .lean();

  console.log(`=== AGENDAMENTOS DO DIA 03/09/2026 (${list.length}) ===`);
  for (const a of list) {
    console.log({
      id: a._id,
      protocol: a.protocol,
      startsAt: a.startsAt,
      status: a.status,
      unitName: a.unitId?.name,
      unitId: a.unitId?._id,
      serviceName: a.serviceId?.name,
      serviceId: a.serviceId?._id,
      resourceName: a.resourceId?.name,
      citizen: a.identitySnapshot?.name || a.userId?.name,
    });
  }

  process.exit(0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
