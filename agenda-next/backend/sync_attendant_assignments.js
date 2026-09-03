const mongoose = require('mongoose');

async function main() {
  await mongoose.connect('mongodb://mongo:27017/apicemiterio?replicaSet=rs0');
  
  const User = mongoose.model('User', new mongoose.Schema({ name: String, email: String, role: String }));
  const AgendaResource = mongoose.model('AgendaResource', new mongoose.Schema({
    name: String, email: String, unitId: mongoose.Schema.Types.ObjectId, userId: mongoose.Schema.Types.ObjectId, active: Boolean, type: String
  }));
  const AgendaUserAssignment = mongoose.model('AgendaUserAssignment', new mongoose.Schema({
    userId: mongoose.Schema.Types.ObjectId, unitId: mongoose.Schema.Types.ObjectId, role: String, active: Boolean
  }, { timestamps: true }));

  const resources = await AgendaResource.find({ active: true, type: 'attendant' }).lean();
  console.log(`Encontrados ${resources.length} recursos ativos de atendente.`);

  for (const r of resources) {
    let uid = r.userId;
    if (!uid && r.email) {
      const user = await User.findOne({ email: new RegExp('^' + r.email.trim() + '$', 'i') });
      if (user) {
        uid = user._id;
        await AgendaResource.updateOne({ _id: r._id }, { $set: { userId: uid } });
      }
    }

    if (uid && r.unitId) {
      const existing = await AgendaUserAssignment.findOne({ userId: uid, unitId: r.unitId, active: true });
      if (!existing) {
        await AgendaUserAssignment.create({
          userId: uid,
          unitId: r.unitId,
          role: 'agenda_attendant',
          active: true,
        });
        console.log(`+ Vinculado atendente (${r.name} / ${r.email}) à unidade ${r.unitId}`);
      } else {
        console.log(`= Atendente (${r.name} / ${r.email}) já possui vínculo com unidade ${r.unitId}`);
      }
    }
  }

  // Listar assignments finais
  const allAssignments = await AgendaUserAssignment.find({ active: true }).populate('userId', 'name email').populate('unitId', 'name').lean();
  console.log('\n--- VÍNCULOS ATIVOS NA AGENDA ---');
  for (const a of allAssignments) {
    console.log(`Usuário: ${a.userId?.email || a.userId} | Unidade: ${a.unitId?.name || a.unitId} | Papel: ${a.role}`);
  }

  process.exit(0);
}

main().catch(console.error);
