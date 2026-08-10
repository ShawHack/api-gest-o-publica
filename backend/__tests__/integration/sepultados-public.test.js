const request = require('supertest');
const {
  setupIntegrationTest,
  teardownIntegrationTest,
  getApp,
  createVerifiedUser,
  bearerToken,
  createMinimalSepultado,
} = require('../helpers/test-harness');

describe('sepultados — rotas públicas e protegidas', () => {
  beforeAll(() => setupIntegrationTest());
  afterAll(() => teardownIntegrationTest());

  test('GET /sepultados lista pública sem token', async () => {
    const res = await request(getApp()).get('/sepultados');
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.sepultados)).toBe(true);
    expect(res.body).toHaveProperty('total');
  });

  test('GET /api/sepultados lista pública sem token', async () => {
    const res = await request(getApp()).get('/api/sepultados');
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.sepultados)).toBe(true);
  });

  test('GET /sepultados/pesquisa sem termo retorna 400', async () => {
    const res = await request(getApp()).get('/sepultados/pesquisa');
    expect(res.status).toBe(400);
    expect(res.body.message).toMatch(/2 caracteres|obrigatório/i);
  });

  test('GET /sepultados/pesquisa com termo curto retorna 400', async () => {
    const res = await request(getApp()).get('/sepultados/pesquisa').query({ q: 'a' });
    expect(res.status).toBe(400);
  });

  test('GET /sepultados/pesquisa com termo retorna 200', async () => {
    await createMinimalSepultado({ nome: 'Maria Silva' });
    const res = await request(getApp()).get('/sepultados/pesquisa').query({ q: 'Maria' });
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.sepultado)).toBe(true);
  });

  test('GET /sepultados/meussepultados sem token retorna 401', async () => {
    const res = await request(getApp()).get('/sepultados/meussepultados');
    expect(res.status).toBe(401);
  });

  test('DELETE /sepultados/:id sem token retorna 401', async () => {
    const sep = await createMinimalSepultado({ nome: 'João Teste', chapa: 'B-02' });
    const res = await request(getApp()).delete(`/sepultados/${sep._id}`);
    expect(res.status).toBe(401);
  });

  test('DELETE /sepultados/:id com usuário comum retorna 403', async () => {
    const user = await createVerifiedUser({ email: 'user-sep@test.local' });
    const sep = await createMinimalSepultado({ nome: 'Ana Teste', chapa: 'C-03', user: { _id: user._id, name: user.name } });
    const res = await request(getApp())
      .delete(`/sepultados/${sep._id}`)
      .set('Authorization', `Bearer ${bearerToken(user)}`);
    expect(res.status).toBe(403);
  });
});
