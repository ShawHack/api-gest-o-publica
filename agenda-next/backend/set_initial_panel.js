require('./models/AgendaService');
require('./models/AgendaUnit');
const m = require('mongoose');
const uri = process.env.MONGODB_URI || process.env.MONGO_URI || 'mongodb://mongo:27017/apicemiterio';
m.connect(uri).then(async () => {
  await m.model('AgendaService').updateMany(
    { name: /transporte/i },
    { $set: { panelSlug: 'sedetur', panelPrefix: 'AG', panelLocationType: 'Guichê', panelNovosgaUnitId: 4 } }
  );
  await m.model('AgendaUnit').updateMany(
    { slug: 'sedetur' },
    { $set: { novosgaUnitId: 4 } }
  );
  const s = await m.model('AgendaService').find().lean();
  console.log('SERVICOS ATUALIZADOS:', s.map(x => ({ name: x.name, panelSlug: x.panelSlug, panelPrefix: x.panelPrefix })));
  process.exit(0);
});
