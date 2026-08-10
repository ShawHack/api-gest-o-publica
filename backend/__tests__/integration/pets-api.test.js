const request = require('supertest');
const {
  setupIntegrationTest,
  teardownIntegrationTest,
  getApp,
  createVerifiedUser,
  bearerToken,
} = require('../helpers/test-harness');

async function createCatalogPet(user, suffix) {
  const Pet = require('../../models/Pet');
  return Pet.create({
    name: `Pet API ${suffix}`,
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

describe('pets API', () => {
  beforeAll(() => setupIntegrationTest());
  afterAll(() => teardownIntegrationTest());

  test('GET /pets/:id retorna pet público', async () => {
    const owner = await createVerifiedUser({ email: 'pet-id@test.local' });
    const pet = await createCatalogPet(owner, 'X');
    const res = await request(getApp()).get(`/pets/${pet._id}`);
    expect(res.status).toBe(200);
    expect(res.body.pet || res.body.name).toBeTruthy();
  });

  test('GET /pets/:id inválido retorna 422', async () => {
    const res = await request(getApp()).get('/pets/nao-valido');
    expect(res.status).toBe(422);
  });

  test('GET /pets/:id inexistente retorna 404', async () => {
    const fakeId = '507f1f77bcf86cd799439011';
    const res = await request(getApp()).get(`/pets/${fakeId}`);
    expect(res.status).toBe(404);
  });

  test('GET /pets/mypets sem token retorna 401', async () => {
    const res = await request(getApp()).get('/pets/mypets');
    expect(res.status).toBe(401);
  });

  test('GET /pets/mypets com token retorna lista do usuário', async () => {
    const owner = await createVerifiedUser({ email: 'pet-mine@test.local' });
    await createCatalogPet(owner, 'Mine');
    const res = await request(getApp())
      .get('/pets/mypets')
      .set('Authorization', `Bearer ${bearerToken(owner)}`);
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.pets)).toBe(true);
    expect(res.body.pets.length).toBeGreaterThanOrEqual(1);
  });
});
