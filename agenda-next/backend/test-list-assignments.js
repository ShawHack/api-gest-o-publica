const mongoose = require('mongoose');

async function main() {
  await mongoose.connect('mongodb://mongo:27017/apicemiterio?replicaSet=rs0');
  console.log('Conectado ao MongoDB!');

  const AgendaUserAssignment = mongoose.model('AgendaUserAssignment', new mongoose.Schema({
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    unitId: { type: mongoose.Schema.Types.ObjectId, ref: 'AgendaUnit' },
    role: String,
    active: Boolean,
  }, { timestamps: true }));

  const User = mongoose.model('User', new mongoose.Schema({
    name: String, email: String, role: String, isAdmin: Boolean,
  }));

  const AgendaUnit = mongoose.model('AgendaUnit', new mongoose.Schema({
    name: String, slug: String, active: Boolean,
  }));

  const AgendaService = mongoose.model('AgendaService', new mongoose.Schema({
    name: String, unitId: { type: mongoose.Schema.Types.ObjectId, ref: 'AgendaUnit' }, active: Boolean,
  }));

  const assignments = await AgendaUserAssignment.find({ active: true })
    .populate('userId', 'name email role')
    .populate('unitId', 'name slug')
    .lean();
  console.log('=== ATRIBUIÇÕES NO BANCO ===');
  console.log(JSON.stringify(assignments, null, 2));

  const units = await AgendaUnit.find().select('name slug active').lean();
  console.log('=== UNIDADES ===', units);

  const services = await AgendaService.find().populate('unitId', 'name slug').select('name unitId active').lean();
  console.log('=== SERVIÇOS ===', services);

  process.exit(0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
