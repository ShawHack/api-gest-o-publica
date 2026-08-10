const request = require('supertest');
const jwt = require('jsonwebtoken');
const {
  setupIntegrationTest,
  teardownIntegrationTest,
  getApp,
} = require('../helpers/test-harness');

beforeAll(() => setupIntegrationTest());
afterAll(() => teardownIntegrationTest());

describe('health e medicamentos', () => {
  test('GET /health retorna UP', async () => {
    const res = await request(getApp()).get('/health');
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('UP');
  });

  test('GET /readyz com mongo conectado', async () => {
    const res = await request(getApp()).get('/readyz');
    expect(res.status).toBe(200);
    expect(res.body.ready).toBe(true);
  });

  test('POST /medicamentos/refresh sem token retorna 401', async () => {
    const res = await request(getApp()).post('/medicamentos/refresh');
    expect(res.status).toBe(401);
  });

  test('POST /medicamentos/refresh com usuario comum retorna 403', async () => {
    const User = require('../../models/User');
    const user = await User.create({
      name: 'Test User',
      email: 'user@test.local',
      password: 'hashed',
      phone: '16999999999',
      role: 'usuario',
    });
    const token = jwt.sign({ id: user._id.toString() }, process.env.JWT_SECRET, { expiresIn: '1h' });
    const res = await request(getApp())
      .post('/medicamentos/refresh')
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(403);
  });

  test('POST /api/medicamentos/refresh sem token retorna 401', async () => {
    const res = await request(getApp()).post('/api/medicamentos/refresh');
    expect(res.status).toBe(401);
  });
});
