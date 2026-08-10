const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');

let mongoServer;
let app;

async function setupIntegrationTest() {
  mongoServer = await MongoMemoryServer.create();
  process.env.MONGODB_URI = mongoServer.getUri();
  await mongoose.disconnect();
  await mongoose.connect(process.env.MONGODB_URI);
  const { createApp } = require('../../server');
  app = createApp();
  return app;
}

async function teardownIntegrationTest() {
  await mongoose.disconnect();
  if (mongoServer) await mongoServer.stop();
  app = null;
  mongoServer = null;
}

function getApp() {
  return app;
}

async function createVerifiedUser({
  email,
  password = 'Senha@123',
  role = 'usuario',
  name = 'Usuário Teste',
}) {
  const User = require('../../models/User');
  const hash = await bcrypt.hash(password, 10);
  return User.create({
    name,
    email: email.toLowerCase(),
    password: hash,
    phone: '16999990001',
    role,
    emailVerified: true,
  });
}

function bearerToken(user) {
  return jwt.sign({ id: user._id.toString() }, process.env.JWT_SECRET, { expiresIn: '1h' });
}

async function createMinimalSepultado(overrides = {}) {
  const user = overrides.user || (await createVerifiedUser({ email: `sep-${Date.now()}@test.local` }));
  const Sepultado = require('../../models/Sepultado');
  return Sepultado.create({
    nome: 'Maria Silva',
    chapa: 'A-01',
    quadra: 'Q1',
    dtNasc: '01/01/1950',
    dtFal: '01/01/2020',
    mae: 'Mae Teste',
    pai: 'Pai Teste',
    user: { _id: user._id, name: user.name },
    ...overrides,
  });
}

module.exports = {
  setupIntegrationTest,
  teardownIntegrationTest,
  getApp,
  createVerifiedUser,
  bearerToken,
  createMinimalSepultado,
};
