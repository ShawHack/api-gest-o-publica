const mongoose = require('mongoose');
const PnabYear = require('./models/PnabYear');
const PnabProgram = require('./models/PnabProgram');
require('dotenv').config();

const mongoURI = process.env.MONGO_URI || 'mongodb://localhost:27017/teatro_db';

async function seed() {
  try {
    await mongoose.connect(mongoURI);
    console.log('Conectado ao MongoDB para seeding...');

    // 1. Seed Years
    const yearsToSeed = [
      { nome: '2024', descricao: 'Exercício fiscal e editais de fomento PNAB referente ao ano de 2024.', status: 'ativo', ordem: 2 },
      { nome: '2025', descricao: 'Exercício fiscal e editais de fomento PNAB referente ao ano de 2025.', status: 'ativo', ordem: 1 },
      { nome: '2026', descricao: 'Exercício fiscal planejado para 2026.', status: 'inativo', ordem: 3 }
    ];

    for (const year of yearsToSeed) {
      const exists = await PnabYear.findOne({ nome: year.nome });
      if (!exists) {
        await new PnabYear(year).save();
        console.log(`Ano ${year.nome} inserido.`);
      } else {
        console.log(`Ano ${year.nome} já existe.`);
      }
    }

    // 2. Seed Programs
    const programsToSeed = [
      { nome: 'PNAB', descricao: 'Política Nacional Aldir Blanc de Fomento à Cultura.' },
      { nome: 'Lei Aldir Blanc', descricao: 'Ações e editais referentes à Lei de Emergência Cultural Aldir Blanc.' },
      { nome: 'Cultura Viva', descricao: 'Fomento a Pontos e Pontões de Cultura.' }
    ];

    for (const prog of programsToSeed) {
      const exists = await PnabProgram.findOne({ nome: prog.nome });
      if (!exists) {
        await new PnabProgram(prog).save();
        console.log(`Programa ${prog.nome} inserido.`);
      } else {
        console.log(`Programa ${prog.nome} já existe.`);
      }
    }

    console.log('Seeding do módulo PNAB concluído com sucesso!');
  } catch (error) {
    console.error('Erro no seeding:', error);
  } finally {
    mongoose.connection.close();
  }
}

seed();
