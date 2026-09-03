const mongoose = require('mongoose');

async function main() {
  await mongoose.connect('mongodb://mongo:27017/apicemiterio?replicaSet=rs0');
  const S = mongoose.model('AgendaService', new mongoose.Schema({
    name: String,
    panelSlug: String,
    panelPrefix: String,
    panelNovosgaUnitId: Number,
    panelNovosgaServiceId: Number,
    unitId: mongoose.Schema.Types.ObjectId,
  }));
  const U = mongoose.model('AgendaUnit', new mongoose.Schema({ name: String, slug: String }));

  const s = await S.findOne({ name: /Transporte Escolar 2026/i }).populate('unitId').lean();
  console.log('CONFIGURAÇÃO DO SERVIÇO:', {
    name: s?.name,
    unitName: s?.unitId?.name,
    unitSlug: s?.unitId?.slug,
    panelSlug: s?.panelSlug,
    panelPrefix: s?.panelPrefix,
    panelNovosgaUnitId: s?.panelNovosgaUnitId,
    panelNovosgaServiceId: s?.panelNovosgaServiceId,
  });

  process.exit(0);
}

main().catch(console.error);
