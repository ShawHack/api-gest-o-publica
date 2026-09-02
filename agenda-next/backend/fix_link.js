require('./models/User');
require('./models/AgendaResource');
require('./models/AgendaService');
require('./models/AgendaUnit');
const m = require('mongoose');
const uri = process.env.MONGODB_URI || process.env.MONGO_URI || 'mongodb://mongo:27017/apicemiterio';
m.connect(uri).then(async () => {
  const resource = await m.model('AgendaResource').findOne({ email: 'saulovlima36@gmail.com' });
  if (resource) {
    await m.model('AgendaService').updateMany(
      { unitId: resource.unitId },
      { $addToSet: { resourceIds: resource._id }, $set: { resourceRequired: true } }
    );
    console.log('VINCULADO Saulo Lima ao servico com sucesso!');
  }
  const s = await m.model('AgendaService').find().lean();
  console.log('SERVICES APOS VINCULO:', JSON.stringify(s.map(x => ({ id: x._id, name: x.name, unitId: x.unitId, resourceIds: x.resourceIds }))));
  process.exit(0);
});
