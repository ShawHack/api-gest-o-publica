const request = require('supertest');
const {
  setupIntegrationTest,
  teardownIntegrationTest,
  getApp,
} = require('../helpers/test-harness');

describe('OpenAPI', () => {
  beforeAll(() => setupIntegrationTest());
  afterAll(() => teardownIntegrationTest());

  test('GET /openapi.json retorna OpenAPI 3', async () => {
    const res = await request(getApp()).get('/openapi.json');
    expect(res.status).toBe(200);
    expect(res.body.openapi).toMatch(/^3\./);
    expect(res.body.paths['/health']).toBeDefined();
    expect(res.body.paths['/api/users/login']).toBeDefined();
  });
});
