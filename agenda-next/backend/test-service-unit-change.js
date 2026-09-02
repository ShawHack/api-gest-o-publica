const mongoose = require('./db/conn');
const AgendaService = require('./models/AgendaService');
const AgendaUnit = require('./models/AgendaUnit');

async function run() {
  const units = await AgendaUnit.find({}).lean();
  console.log('Unidades cadastradas:', units.map(u => ({ id: u._id, name: u.name, slug: u.slug })));

  const semitUnit = units.find(u => u.name.toLowerCase().includes('semit'));
  const services = await AgendaService.find({}).lean();
  console.log('Serviços cadastrados:', services.map(s => ({ id: s._id, name: s.name, unitId: s.unitId })));

  if (semitUnit && services.length > 0) {
    const service = services[0];
    await AgendaService.updateOne(
      { _id: service._id },
      { $set: { unitId: semitUnit._id, panelSlug: 'semit' } }
    );
    console.log(`🎉 Serviço "${service.name}" alterado para a unidade "${semitUnit.name}" com sucesso!`);
  }
  process.exit(0);
}

run().catch(e => { console.error(e); process.exit(1); });
