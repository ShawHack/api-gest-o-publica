const mongoose = require('./db/conn');
const User = require('./models/User');
const jwt = require('jsonwebtoken');

async function testCall() {
  await mongoose.connect(process.env.MONGODB_URI || 'mongodb://mongo:27017/apicemiterio?replicaSet=rs0');
  
  const admin = await User.findOne({ email: /saulo/i }).lean();
  const token = jwt.sign(
    { id: admin._id, email: admin.email, role: 'agenda_admin' },
    process.env.JWT_SECRET || 'secret',
    { expiresIn: '1h' }
  );

  const aptId = '6abbb1f9cad7f8e9bd400fd3';
  console.log('Disparando chamada oficial para AG03 (Guichê 20)...');

  const callRes = await fetch('http://127.0.0.1:5000/api/agenda/admin/appointments/' + aptId + '/call', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': 'Bearer ' + token,
    },
    body: JSON.stringify({ localName: 'Guichê', localNumber: 20 }),
  });

  console.log('Status da chamada:', callRes.status);
  const data = await callRes.json();
  console.log('Resultado da chamada:', JSON.stringify(data.call, null, 2));

  process.exit(0);
}

testCall().catch((e) => {
  console.error(e);
  process.exit(1);
});
