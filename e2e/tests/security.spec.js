// @ts-check
const { test, expect } = require('@playwright/test');

const baseURL = process.env.PLAYWRIGHT_BASE_URL || 'https://api.garca.sp.gov.br';

test.describe('Segurança — HTTPS', () => {
  test('HTTP redireciona para HTTPS em /readyz', async ({ request }) => {
    const httpBase = baseURL.replace(/^https:/i, 'http:');
    const res = await request.get(`${httpBase}/readyz`, { maxRedirects: 0 });
    expect([301, 302, 307, 308]).toContain(res.status());
    const location = res.headers().location || '';
    expect(location).toMatch(/^https:\/\//i);
  });

  test('resposta HTTPS inclui Strict-Transport-Security', async ({ request }) => {
    const res = await request.get('/readyz');
    expect(res.ok()).toBeTruthy();
    const hsts = res.headers()['strict-transport-security'] || '';
    expect(hsts.length).toBeGreaterThan(0);
    expect(hsts).toMatch(/max-age=/i);
  });
});
