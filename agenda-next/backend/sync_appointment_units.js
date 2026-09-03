const mongoose = require('mongoose');

async function main() {
  await mongoose.connect('mongodb://mongo:27017/apicemiterio?replicaSet=rs0');

  const AgendaService = mongoose.model('AgendaService', new mongoose.Schema({ name: String, unitId: mongoose.Schema.Types.ObjectId, resourceIds: Array }));
  const AgendaAppointment = mongoose.model('AgendaAppointment', new mongoose.Schema({
    unitId: mongoose.Schema.Types.ObjectId,
    serviceId: mongoose.Schema.Types.ObjectId,
    resourceId: mongoose.Schema.Types.ObjectId,
    status: String,
    protocol: String,
  }));

  const allServices = await AgendaService.find().lean();
  console.log(`Verificando sincronização de ${allServices.length} serviços...`);

  for (const s of allServices) {
    const res = await AgendaAppointment.updateMany(
      { serviceId: s._id, unitId: { $ne: s.unitId } },
      { $set: { unitId: s.unitId } }
    );
    if (res.modifiedCount > 0) {
      console.log(`Serviço "${s.name}": sincronizados ${res.modifiedCount} agendamentos para a unidade ${s.unitId}`);
    }
  }

  // Se o serviço Transporte Escolar 2026 tem resourceIds do Saulo Lima no SEDETUR, atualizar os agendamentos
  const sedeturService = await AgendaService.findOne({ name: /Transporte Escolar 2026/i }).lean();
  if (sedeturService && sedeturService.resourceIds?.length > 0) {
    const targetResource = sedeturService.resourceIds[0];
    const resRes = await AgendaAppointment.updateMany(
      { serviceId: sedeturService._id },
      { $set: { resourceId: targetResource } }
    );
    console.log(`Atualizado resourceId de ${resRes.modifiedCount} agendamentos para ${targetResource}`);
  }

  console.log('Sincronização concluída com sucesso!');
  process.exit(0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
