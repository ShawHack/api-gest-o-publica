const mongoose = require('mongoose');

async function listReal() {
  await mongoose.connect('mongodb://mongo:27017/apicemiterio?replicaSet=rs0');
  const cols = await mongoose.connection.db.listCollections().toArray();
  console.log('Colecoes:', cols.map(c => c.name));

  const AgendaAppointment = mongoose.model('AgendaAppointment', new mongoose.Schema({}, { strict: false }), 'agendaappointments');
  const all = await AgendaAppointment.find().limit(5).lean();
  console.log('Agendamentos em agendaappointments:', all.length);

  const AgendaAppointment2 = mongoose.model('AgendaAppointment2', new mongoose.Schema({}, { strict: false }), 'agenda_appointments');
  const all2 = await AgendaAppointment2.find().limit(5).lean();
  console.log('Agendamentos em agenda_appointments:', all2.length);

  await mongoose.disconnect();
}

listReal().catch(console.error);
