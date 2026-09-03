const mongoose = require('mongoose');

async function main() {
  await mongoose.connect('mongodb://mongo:27017/apicemiterio?replicaSet=rs0');

  const AgendaUnit = mongoose.model('AgendaUnit', new mongoose.Schema({ name: String }));
  const AgendaService = mongoose.model('AgendaService', new mongoose.Schema({ name: String, unitId: mongoose.Schema.Types.ObjectId, resourceIds: Array }));
  const AgendaResource = mongoose.model('AgendaResource', new mongoose.Schema({ name: String, email: String, unitId: mongoose.Schema.Types.ObjectId }));
  const AgendaAppointment = mongoose.model('AgendaAppointment', new mongoose.Schema({
    unitId: mongoose.Schema.Types.ObjectId,
    serviceId: mongoose.Schema.Types.ObjectId,
    resourceId: mongoose.Schema.Types.ObjectId,
    startsAt: Date,
    status: String,
    protocol: String,
  }));

  const service = await AgendaService.findOne({ name: /Transporte Escolar 2026/i }).populate('unitId');
  console.log('=== SERVIÇO ATUAL ===');
  console.log({
    id: service?._id,
    name: service?.name,
    unit: service?.unitId?.name,
    unitId: service?.unitId?._id,
    resourceIds: service?.resourceIds,
  });

  const units = await AgendaUnit.find().lean();
  console.log('\n=== UNIDADES DISPONÍVEIS ===');
  for (const u of units) {
    console.log({ id: u._id, name: u.name });
  }

  const appointments = await AgendaAppointment.find({ serviceId: service?._id }).lean();
  console.log(`\n=== AGENDAMENTOS DESTE SERVIÇO (${appointments.length}) ===`);
  for (const a of appointments) {
    console.log({ id: a._id, protocol: a.protocol, unitId: a.unitId, resourceId: a.resourceId });
  }

  process.exit(0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
