const mongoose = require('mongoose');

async function main() {
  await mongoose.connect('mongodb://mongo:27017/apicemiterio?replicaSet=rs0');
  
  const User = mongoose.model('User', new mongoose.Schema({ name: String, email: String, role: String }));
  const AgendaResource = mongoose.model('AgendaResource', new mongoose.Schema({ name: String, email: String, unitId: mongoose.Schema.Types.ObjectId, active: Boolean }));
  const AgendaAssignment = mongoose.model('AgendaAssignment', new mongoose.Schema({ userId: mongoose.Schema.Types.ObjectId, unitId: mongoose.Schema.Types.ObjectId, role: String }));
  const AgendaService = mongoose.model('AgendaService', new mongoose.Schema({ name: String, resourceIds: [mongoose.Schema.Types.ObjectId], unitId: mongoose.Schema.Types.ObjectId }));
  const AgendaAppointment = mongoose.model('AgendaAppointment', new mongoose.Schema({ serviceId: mongoose.Schema.Types.ObjectId, unitId: mongoose.Schema.Types.ObjectId, resourceId: mongoose.Schema.Types.ObjectId, startsAt: Date, status: String }));

  const emails = ['elainegiolo436@gmail.com', 'atendimentoposturas@garca.sp.gov.br', 'saulovlima36@gmail.com'];

  console.log('--- USUÁRIOS ---');
  for (const email of emails) {
    const u = await User.findOne({ email: new RegExp('^' + email + '$', 'i') }).lean();
    console.log(email, '-> User:', u ? { id: u._id, name: u.name, role: u.role } : 'NÃO EXISTE NA TABELA USERS');
    
    if (u) {
      const assignments = await AgendaAssignment.find({ userId: u._id }).lean();
      console.log('   Assignments:', assignments);
    }

    const resources = await AgendaResource.find({ email: new RegExp('^' + email + '$', 'i') }).lean();
    console.log('   Resources:', resources);
  }

  console.log('\n--- SERVIÇOS ---');
  const services = await AgendaService.find().lean();
  for (const s of services) {
    console.log(`Serviço ${s.name} (Unit: ${s.unitId}): Resources: ${s.resourceIds}`);
  }

  console.log('\n--- AGENDAMENTOS RECENTES ---');
  const apts = await AgendaAppointment.find().sort({ startsAt: -1 }).limit(5).lean();
  for (const a of apts) {
    console.log(`Apt ${a._id}: Service=${a.serviceId}, Unit=${a.unitId}, Resource=${a.resourceId}, Status=${a.status}, Date=${a.startsAt}`);
  }

  process.exit(0);
}

main().catch(console.error);
