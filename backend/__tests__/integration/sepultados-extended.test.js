const request = require('supertest');
const {
  setupIntegrationTest,
  teardownIntegrationTest,
  getApp,
  createVerifiedUser,
  bearerToken,
  createMinimalSepultado,
} = require('../helpers/test-harness');

describe('sepultados — rotas adicionais', () => {
  beforeAll(() => setupIntegrationTest());
  afterAll(() => teardownIntegrationTest());

  test('GET /sepultados/:id retorna sepultado público', async () => {
    const sep = await createMinimalSepultado({ nome: 'José Público' });
    const res = await request(getApp()).get(`/sepultados/${sep._id}`);
    expect(res.status).toBe(200);
    expect(res.body.nome).toMatch(/José/i);
  });

  test('GET /sepultados/:id inexistente retorna 404', async () => {
    const res = await request(getApp()).get('/sepultados/507f1f77bcf86cd799439011');
    expect(res.status).toBe(404);
  });

  test('GET /sepultados/meussepultados com token retorna 200', async () => {
    const user = await createVerifiedUser({ email: 'meus-sep@test.local' });
    await createMinimalSepultado({
      nome: 'Meu Sepultado',
      user: { _id: user._id, name: user.name },
    });
    const res = await request(getApp())
      .get('/sepultados/meussepultados')
      .set('Authorization', `Bearer ${bearerToken(user)}`);
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.sepults)).toBe(true);
  });

  test('GET /sepultados/sugestoes com termo curto retorna lista vazia', async () => {
    const res = await request(getApp()).get('/sepultados/sugestoes').query({ q: 'a' });
    expect(res.status).toBe(200);
    expect(res.body.suggestions).toEqual([]);
  });

  test('GET /sepultados/sugestoes com termo válido', async () => {
    await createMinimalSepultado({ nome: 'Francisco Souza' });
    const res = await request(getApp()).get('/sepultados/sugestoes').query({ q: 'Franc' });
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.suggestions)).toBe(true);
  });
});
