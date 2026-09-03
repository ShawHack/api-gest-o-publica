const mongoose = require('mongoose');

async function main() {
  await mongoose.connect('mongodb://mongo:27017/apicemiterio?replicaSet=rs0');
  console.log('Conectado!');

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

  const AgendaUnit = mongoose.model('AgendaUnit', new mongoose.Schema({ name: String, slug: String }));
  const AgendaService = mongoose.model('AgendaService', new mongoose.Schema({ name: String, slug: String, unitId: mongoose.Schema.Types.ObjectId, resourceIds: Array }));
  const AgendaResource = mongoose.model('AgendaResource', new mongoose.Schema({ name: String, email: String, unitId: mongoose.Schema.Types.ObjectId }));
  const User = mongoose.model('User', new mongoose.Schema({ name: String, email: String }));

  const all = await AgendaAppointment.find()
    .populate('unitId', 'name')
    .populate('serviceId', 'name unitId resourceIds')
    .populate('resourceId', 'name email')
    .sort({ startsAt: -1 })
    .lean();

  console.log(`Total de agendamentos no banco: ${all.length}`);
  for (const a of all) {
    console.log({
      id: a._id,
      protocol: a.protocol,
      startsAt: a.startsAt,
      status: a.status,
      unit: a.unitId?.name,
      unitId: a.unitId?._id,
      service: a.serviceId?.name,
      serviceId: a.serviceId?._id,
      serviceUnitId: a.serviceId?.unitId,
      serviceResourceIds: a.serviceId?.resourceIds,
      resource: a.resourceId?.name,
      resourceId: a.resourceId?._id,
      citizen: a.identitySnapshot?.name || a.userId?.name,
    });
  }

  process.exit(0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
