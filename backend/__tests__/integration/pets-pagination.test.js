const request = require('supertest');
const {
  setupIntegrationTest,
  teardownIntegrationTest,
  getApp,
  createVerifiedUser,
} = require('../helpers/test-harness');

async function createCatalogPet(user, suffix) {
  const Pet = require('../../models/Pet');
  return Pet.create({
    name: `Pet ${suffix}`,
    age: '2',
    type: 'Cachorro',
    size: 'Médio',
    weight: 10,
    color: 'Marrom',
    gender: 'Macho',
    breed: 'SRD',
    images: [],
    available: true,
    adopterStatus: 'Pendente',
    user: user._id,
  });
}

describe('GET /pets paginação', () => {
  beforeAll(() => setupIntegrationTest());
  afterAll(() => teardownIntegrationTest());

  test('sem page/limit retorna lista legada (sem metadados de página)', async () => {
    const owner = await createVerifiedUser({ email: 'pets-owner@test.local' });
    await createCatalogPet(owner, 'A');
    const res = await request(getApp()).get('/pets');
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.pets)).toBe(true);
    expect(res.body.page).toBeUndefined();
    expect(res.body.total).toBeUndefined();
  });

  test('com page e limit retorna metadados e no máximo limit itens', async () => {
    const owner = await createVerifiedUser({ email: 'pets-pag@test.local' });
    await createCatalogPet(owner, '1');
    await createCatalogPet(owner, '2');
    await createCatalogPet(owner, '3');
    const res = await request(getApp())
      .get('/pets')
      .query({ page: 1, limit: 2 });
    expect(res.status).toBe(200);
    expect(res.body.pets.length).toBeLessThanOrEqual(2);
    expect(res.body.page).toBe(1);
    expect(res.body.limit).toBe(2);
    expect(res.body.total).toBeGreaterThanOrEqual(3);
    expect(res.body.pages).toBeGreaterThanOrEqual(2);
  });

  test('GET /api/pets com paginação (prefixo /api)', async () => {
    const res = await request(getApp()).get('/api/pets').query({ page: 1, limit: 5 });
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('total');
    expect(res.body).toHaveProperty('pages');
  });
});
