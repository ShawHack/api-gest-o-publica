const request = require('supertest');
const {
  setupIntegrationTest,
  teardownIntegrationTest,
  getApp,
  createVerifiedUser,
} = require('../helpers/test-harness');

describe('verify-token — API Key', () => {
  const prevKeys = process.env.API_KEYS;
  const prevUserId = process.env.API_KEY_USER_ID;
  let admin;

  beforeAll(async () => {
    await setupIntegrationTest();
    admin = await createVerifiedUser({ email: 'apikey-admin@test.local', role: 'admin' });
    process.env.API_KEYS = 'integration-test-key';
    process.env.API_KEY_USER_ID = String(admin._id);
  });

  afterAll(async () => {
    process.env.API_KEYS = prevKeys;
    process.env.API_KEY_USER_ID = prevUserId;
    await teardownIntegrationTest();
  });

  test('GET /users/:id com X-API-Key válida (admin vinculado)', async () => {
    const res = await request(getApp())
      .get(`/users/${admin._id}`)
      .set('X-API-Key', 'integration-test-key');
    expect(res.status).toBe(200);
    expect(res.body.user).toBeTruthy();
    expect(res.body.user.email).toBe('apikey-admin@test.local');
  });

  test('GET /users com API Key inválida retorna 401', async () => {
    const res = await request(getApp())
      .get('/users')
      .set('X-API-Key', 'invalid-key');
    expect(res.status).toBe(401);
  });
});
