const request = require('supertest');
const jwt = require('jsonwebtoken');
const {
  setupIntegrationTest,
  teardownIntegrationTest,
  getApp,
  createVerifiedUser,
} = require('../helpers/test-harness');

describe('refresh token Memorial', () => {
  beforeAll(() => setupIntegrationTest());
  afterAll(() => teardownIntegrationTest());

  async function login(email = 'refresh@test.local') {
    await createVerifiedUser({ email, password: 'Senha@123' });
    const res = await request(getApp())
      .post('/users/login')
      .send({ email, password: 'Senha@123' });
    expect(res.status).toBe(200);
    return res.body;
  }

  test('login retorna refreshToken e access de curta duração', async () => {
    const body = await login('refresh1@test.local');
    expect(body.refreshToken).toMatch(/^[a-f0-9]{96}$/);
    expect(body.token).toBeTruthy();
    expect(body.accessToken).toBe(body.token);
    expect(body.expiresIn).toBeTruthy();
    const decoded = jwt.decode(body.token);
    expect(decoded.id).toBeTruthy();
    expect(decoded.exp).toBeTruthy();
  });

  test('POST /users/refresh renova access e rotaciona refresh', async () => {
    const first = await login('refresh2@test.local');
    const res = await request(getApp())
      .post('/users/refresh')
      .send({ refreshToken: first.refreshToken });
    expect(res.status).toBe(200);
    expect(res.body.token).toBeTruthy();
    expect(res.body.refreshToken).toBeTruthy();
    expect(res.body.refreshToken).not.toBe(first.refreshToken);

    const old = await request(getApp())
      .post('/users/refresh')
      .send({ refreshToken: first.refreshToken });
    expect(old.status).toBe(401);
  });

  test('refresh inválido retorna 401', async () => {
    const res = await request(getApp())
      .post('/users/refresh')
      .send({ refreshToken: 'invalido' });
    expect(res.status).toBe(401);
  });

  test('POST /users/logout invalida refresh', async () => {
    const body = await login('refresh3@test.local');
    const logout = await request(getApp())
      .post('/users/logout')
      .send({ refreshToken: body.refreshToken });
    expect(logout.status).toBe(200);

    const res = await request(getApp())
      .post('/users/refresh')
      .send({ refreshToken: body.refreshToken });
    expect(res.status).toBe(401);
  });
});
