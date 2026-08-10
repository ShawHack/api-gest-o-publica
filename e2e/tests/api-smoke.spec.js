// @ts-check
const { test, expect } = require('@playwright/test');

test.describe('API — smoke', () => {
  test('GET /readyz indica banco conectado', async ({ request }) => {
    const res = await request.get('/readyz');
    expect(res.ok()).toBeTruthy();
    const body = await res.json();
    expect(body.ready).toBe(true);
    expect(body.database).toBe('connected');
  });

  test('GET /health retorna UP', async ({ request }) => {
    const res = await request.get('/health');
    expect(res.ok()).toBeTruthy();
    const body = await res.json();
    expect(body.status).toBe('UP');
  });

  test('GET /metrics retorna Prometheus text', async ({ request }) => {
    const res = await request.get('/metrics');
    expect(res.ok()).toBeTruthy();
    const text = await res.text();
    expect(text).toContain('api_http_requests_total');
  });

  test('GET /openapi.json retorna OpenAPI 3', async ({ request }) => {
    const res = await request.get('/openapi.json');
    expect(res.ok()).toBeTruthy();
    const body = await res.json();
    expect(body.openapi).toMatch(/^3\./);
    expect(body.info?.title).toBeTruthy();
  });
});
