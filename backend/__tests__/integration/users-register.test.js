const request = require('supertest');
const {
  setupIntegrationTest,
  teardownIntegrationTest,
  getApp,
  createVerifiedUser,
  bearerToken,
} = require('../helpers/test-harness');

describe('users — registro e sessão', () => {
  beforeAll(() => setupIntegrationTest());
  afterAll(() => teardownIntegrationTest());

  test('POST /users/register sem campos retorna 422', async () => {
    const res = await request(getApp()).post('/users/register').send({});
    expect(res.status).toBe(422);
    expect(res.body.ok).toBe(false);
    expect(res.body.field).toBeTruthy();
  });

  test('POST /users/register com e-mail duplicado retorna 422', async () => {
    await createVerifiedUser({ email: 'dup@test.local' });
    const res = await request(getApp())
      .post('/users/register')
      .send({
        name: 'Outro',
        email: 'dup@test.local',
        phone: '16999990011',
        cpf: '39053344705',
        password: 'Senha@123',
        confirmpassword: 'Senha@123',
        acceptedTermsAt: new Date().toISOString(),
      });
    expect(res.status).toBe(422);
    expect(res.body.message).toMatch(/e-mail|cadastrado/i);
  });

  test('GET /users/checkuser com token válido retorna usuário', async () => {
    const user = await createVerifiedUser({ email: 'check@test.local' });
    const res = await request(getApp())
      .get('/users/checkuser')
      .set('Authorization', `Bearer ${bearerToken(user)}`);
    expect(res.status).toBe(200);
    expect(res.body.email).toBe('check@test.local');
  });

  test('GET /users/checkuser sem token retorna null', async () => {
    const res = await request(getApp()).get('/users/checkuser');
    expect(res.status).toBe(200);
    expect(res.body).toBeNull();
  });
});
