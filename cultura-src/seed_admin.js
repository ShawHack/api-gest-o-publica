const mongoose = require('mongoose');
const bcrypt = require('bcrypt');
const User = require('./models/User');
require('dotenv').config();

const mongoURI = process.env.MONGO_URI || 'mongodb://localhost:27017/teatro_db';

mongoose.connect(mongoURI)
  .then(async () => {
    console.log('Conectado ao MongoDB. Criando admin...');
    
    // Check if admin already exists
    const existingAdmin = await User.findOne({ email: 'admin@gmail.com' });
    if (existingAdmin) {
      console.log('O usuário admin@gmail.com já existe. Atualizando para administrador...');
      existingAdmin.isAdmin = true;
      
      const salt = await bcrypt.genSalt(10);
      existingAdmin.senha = await bcrypt.hash('admin123', salt);
      
      await existingAdmin.save();
      console.log('Admin atualizado com sucesso!');
      process.exit(0);
    }

    // Create new admin
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash('admin123', salt);

    const adminUser = new User({
      nome: 'Administrador Geral',
      email: 'admin@gmail.com',
      senha: hashedPassword,
      receberNotificacoes: true,
      isAdmin: true
    });

    await adminUser.save();
    console.log('Usuário administrador (admin@gmail.com) criado com sucesso!');
    process.exit(0);
  })
  .catch(err => {
    console.log('Erro ao conectar ao MongoDB:', err);
    process.exit(1);
  });
