const mongoose = require('mongoose');

async function main() {
  await mongoose.connect('mongodb://mongo:27017/apicemiterio?replicaSet=rs0');
  
  const User = mongoose.model('User', new mongoose.Schema({ name: String, email: String, role: String }));
  const AgendaResource = mongoose.model('AgendaResource', new mongoose.Schema({ name: String, email: String, unitId: mongoose.Schema.Types.ObjectId, userId: mongoose.Schema.Types.ObjectId, active: Boolean, type: String }));
  const AgendaUserAssignment = mongoose.model('AgendaUserAssignment', new mongoose.Schema({ userId: mongoose.Schema.Types.ObjectId, unitId: mongoose.Schema.Types.ObjectId, role: String, active: Boolean }));
  const { attachAgendaContext } = require('./helpers/agenda-auth');

  const emails = ['elainegiolo436@gmail.com', 'atendimentoposturas@garca.sp.gov.br', 'saulovlima36@gmail.com'];
  
  for (const email of emails) {
    const u = await User.findOne({ email: new RegExp('^' + email + '$', 'i') }).lean();
    const req = { user: u };
    await attachAgendaContext(req, {}, () => {});
    console.log(`✅ [${email}]:`, JSON.stringify(req.agenda));
  }

  process.exit(0);
}

main().catch(console.error);
