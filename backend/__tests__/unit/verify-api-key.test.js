const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');
const { verifyApiKey, getValidKeys } = require('../../helpers/verify-api-key');

let mongoServer;

beforeAll(async () => {
  mongoServer = await MongoMemoryServer.create();
  await mongoose.connect(mongoServer.getUri());
  process.env.API_KEYS = 'test-key-one,test-key-two';
});

afterAll(async () => {
  delete process.env.API_KEYS;
  delete process.env.API_KEY_USER_ID;
  await mongoose.disconnect();
  if (mongoServer) await mongoServer.stop();
});

describe('verify-api-key', () => {
  test('getValidKeys parseia lista do env', () => {
    expect(getValidKeys()).toEqual(['test-key-one', 'test-key-two']);
  });

  test('retorna null sem header', async () => {
    const user = await verifyApiKey({ headers: {} });
    expect(user).toBeNull();
  });

  test('retorna null com chave inválida', async () => {
    const user = await verifyApiKey({ headers: { 'x-api-key': 'wrong' } });
    expect(user).toBeNull();
  });

  test('aceita chave válida', async () => {
    const user = await verifyApiKey({ headers: { 'x-api-key': 'test-key-one' } });
    expect(user).not.toBeNull();
    expect(user.authType).toBe('api_key');
    expect(user.role).toBe('apikey');
  });
});
