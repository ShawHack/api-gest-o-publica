const request = require('supertest');
const {
  setupIntegrationTest,
  teardownIntegrationTest,
  getApp,
  createVerifiedUser,
  bearerToken,
} = require('../helpers/test-harness');

describe('rotas LGPD', () => {
  beforeAll(() => setupIntegrationTest());
  afterAll(() => teardownIntegrationTest());

  test('GET /lgpd/me/export sem token retorna 401', async () => {
    const res = await request(getApp()).get('/lgpd/me/export');
    expect(res.status).toBe(401);
  });

  test('GET /api/lgpd/me/export retorna JSON do titular', async () => {
    const user = await createVerifiedUser({ email: 'export-lgpd@test.local' });
    const res = await request(getApp())
      .get('/api/lgpd/me/export')
      .set('Authorization', `Bearer ${bearerToken(user)}`);
    expect(res.status).toBe(200);
    expect(res.headers['content-type']).toMatch(/json/);
    const body = JSON.parse(res.text);
    expect(body.profile.email).toBe('export-lgpd@test.local');
  });

  test('POST /lgpd/me/delete exige confirm e senha', async () => {
    const user = await createVerifiedUser({ email: 'del-lgpd@test.local', password: 'Senha@123' });
    const res = await request(getApp())
      .post('/lgpd/me/delete')
      .set('Authorization', `Bearer ${bearerToken(user)}`)
      .send({ confirm: 'EXCLUIR', password: 'errada' });
    expect(res.status).toBe(422);
    expect(res.body.message).toMatch(/Senha incorreta/i);
  });

  test('GET /lgpd/users/:id/export nega usuário comum', async () => {
    const alice = await createVerifiedUser({ email: 'alice-lgpd@test.local' });
    const bob = await createVerifiedUser({ email: 'bob-lgpd@test.local' });
    const res = await request(getApp())
      .get(`/lgpd/users/${bob._id}/export`)
      .set('Authorization', `Bearer ${bearerToken(alice)}`);
    expect(res.status).toBe(403);
  });

  test('admin exporta outro titular', async () => {
    const admin = await createVerifiedUser({
      email: 'admin-lgpd@test.local',
      role: 'admin',
    });
    const target = await createVerifiedUser({ email: 'target-lgpd@test.local' });
    const res = await request(getApp())
      .get(`/api/lgpd/users/${target._id}/export`)
      .set('Authorization', `Bearer ${bearerToken(admin)}`);
    expect(res.status).toBe(200);
    const body = JSON.parse(res.text);
    expect(body.userId).toBe(String(target._id));
  });
});
