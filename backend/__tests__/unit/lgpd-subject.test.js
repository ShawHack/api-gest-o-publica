const bcrypt = require('bcrypt');
const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');
const { collectSubjectData, eraseSubjectData } = require('../../helpers/lgpd-subject');
const User = require('../../models/User');
const Pet = require('../../models/Pet');

let mongoServer;

beforeAll(async () => {
  mongoServer = await MongoMemoryServer.create();
  await mongoose.connect(mongoServer.getUri());
});

afterAll(async () => {
  await mongoose.disconnect();
  if (mongoServer) await mongoServer.stop();
});

describe('lgpd-subject', () => {
  test('collectSubjectData retorna perfil e coleções do titular', async () => {
    const user = await User.create({
      name: 'Titular LGPD',
      email: 'lgpd@test.local',
      password: await bcrypt.hash('Senha@123', 10),
      phone: '16999990099',
      role: 'usuario',
      emailVerified: true,
    });
    await Pet.create({
      name: 'Rex',
      age: '2',
      type: 'Cachorro',
      size: 'Médio',
      weight: 10,
      color: 'Marrom',
      gender: 'Macho',
      breed: 'SRD',
      images: [],
      user: user._id,
    });

    const data = await collectSubjectData(user._id);
    expect(data).toBeTruthy();
    expect(data.userId).toBe(String(user._id));
    expect(data.profile.email).toBe('lgpd@test.local');
    expect(data.pets).toHaveLength(1);
  });

  test('eraseSubjectData anonimiza usuário e remove pets', async () => {
    const user = await User.create({
      name: 'Excluir LGPD',
      email: 'erase@test.local',
      password: await bcrypt.hash('Senha@123', 10),
      phone: '16999990088',
      role: 'usuario',
      emailVerified: true,
    });
    await Pet.create({
      name: 'Miau',
      age: '1',
      type: 'Gato',
      size: 'Pequeno',
      weight: 3,
      color: 'Branco',
      gender: 'Fêmea',
      breed: 'SRD',
      images: [],
      user: user._id,
    });

    const result = await eraseSubjectData(user._id);
    expect(result.ok).toBe(true);

    const refreshed = await User.findById(user._id);
    expect(refreshed.email).toMatch(/excluido\+.*@anon\.semit\.local/);
    expect(refreshed.name).toMatch(/Titular removido/i);

    const petsLeft = await Pet.countDocuments({ user: user._id });
    expect(petsLeft).toBe(0);
  });
});
