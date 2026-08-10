const request = require('supertest');
const {
  setupIntegrationTest,
  teardownIntegrationTest,
  getApp,
  createVerifiedUser,
  bearerToken,
} = require('../helpers/test-harness');

describe('login e IDOR em /users', () => {
  beforeAll(() => setupIntegrationTest());
  afterAll(() => teardownIntegrationTest());

  test('POST /users/login sem e-mail retorna 422', async () => {
    const res = await request(getApp())
      .post('/users/login')
      .send({ password: 'Senha@123' });
    expect(res.status).toBe(422);
    expect(res.body.ok).toBe(false);
    expect(res.body.field).toBe('email');
  });

  test('POST /users/login com senha errada retorna 422', async () => {
    await createVerifiedUser({ email: 'login@test.local' });
    const res = await request(getApp())
      .post('/users/login')
      .send({ email: 'login@test.local', password: 'errada' });
    expect(res.status).toBe(422);
    expect(res.body.message).toMatch(/inválidos/i);
  });

  test('POST /users/login sem e-mail verificado retorna 403', async () => {
    const User = require('../../models/User');
    const bcrypt = require('bcrypt');
    await User.create({
      name: 'Não verificado',
      email: 'naoverif@test.local',
      password: await bcrypt.hash('Senha@123', 10),
      phone: '16999990002',
      role: 'usuario',
      emailVerified: false,
    });
    const res = await request(getApp())
      .post('/users/login')
      .send({ email: 'naoverif@test.local', password: 'Senha@123' });
    expect(res.status).toBe(403);
    expect(res.body.message).toMatch(/verificar seu e-mail/i);
  });

  test('POST /users/login válido retorna token', async () => {
    await createVerifiedUser({ email: 'ok@test.local', password: 'Senha@123' });
    const res = await request(getApp())
      .post('/users/login')
      .send({ email: 'ok@test.local', password: 'Senha@123' });
    expect(res.status).toBe(200);
    expect(res.body.ok).toBe(true);
    expect(res.body.token).toBeTruthy();
    expect(res.body.refreshToken).toBeTruthy();
    expect(res.body.role).toBe('usuario');
  });

  test('POST /api/users/login válido (prefixo /api)', async () => {
    await createVerifiedUser({ email: 'api@test.local', password: 'Senha@123' });
    const res = await request(getApp())
      .post('/api/users/login')
      .send({ email: 'api@test.local', password: 'Senha@123' });
    expect(res.status).toBe(200);
    expect(res.body.token).toBeTruthy();
  });

  test('GET /users/:id de outro usuário retorna 403 (IDOR)', async () => {
    const alice = await createVerifiedUser({ email: 'alice@test.local' });
    const bob = await createVerifiedUser({ email: 'bob@test.local' });
    const res = await request(getApp())
      .get(`/users/${bob._id}`)
      .set('Authorization', `Bearer ${bearerToken(alice)}`);
    expect(res.status).toBe(403);
  });

  test('GET /users/:id próprio retorna 200', async () => {
    const user = await createVerifiedUser({ email: 'self@test.local' });
    const res = await request(getApp())
      .get(`/users/${user._id}`)
      .set('Authorization', `Bearer ${bearerToken(user)}`);
    expect(res.status).toBe(200);
    expect(res.body.user.email).toBe('self@test.local');
    expect(res.body.user.password).toBeUndefined();
  });

  test('GET /api/users/:id de outro usuário retorna 403', async () => {
    const alice = await createVerifiedUser({ email: 'alice2@test.local' });
    const bob = await createVerifiedUser({ email: 'bob2@test.local' });
    const res = await request(getApp())
      .get(`/api/users/${bob._id}`)
      .set('Authorization', `Bearer ${bearerToken(alice)}`);
    expect(res.status).toBe(403);
  });

  test('admin pode GET /users/:id de outro usuário', async () => {
    const admin = await createVerifiedUser({ email: 'admin@test.local', role: 'admin' });
    const user = await createVerifiedUser({ email: 'target@test.local' });
    const res = await request(getApp())
      .get(`/users/${user._id}`)
      .set('Authorization', `Bearer ${bearerToken(admin)}`);
    expect(res.status).toBe(200);
    expect(res.body.user._id).toBe(user._id.toString());
  });
});
