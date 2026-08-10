// @ts-check
const { test, expect } = require('@playwright/test');

test.describe('Memorial Santa Faustina', () => {
  test('página inicial carrega (HTML + bundle)', async ({ page }) => {
    const res = await page.goto('/');
    expect(res?.status()).toBeLessThan(400);
    await expect(page.locator('#root')).toBeAttached();
    await expect(page).toHaveTitle(/SEMIT|Memorial|Santa Faustina/i);
  });

  test('tela de login carrega', async ({ page }) => {
    const res = await page.goto('/login');
    expect(res?.status()).toBeLessThan(400);
    await expect(page.locator('#root')).toBeAttached();
  });

  test('auth-refresh.js disponível', async ({ request }) => {
    const res = await request.get('/auth-refresh.js');
    expect(res.ok()).toBeTruthy();
    const text = await res.text();
    expect(text).toContain('memorial_refresh');
  });
});

test.describe('Sepultados — consulta pública', () => {
  test('GET /api/sepultados retorna JSON público', async ({ request }) => {
    const res = await request.get('/api/sepultados');
    expect(res.ok()).toBeTruthy();
    const body = await res.json();
    expect(Array.isArray(body.sepultados)).toBe(true);
    expect(body).toHaveProperty('total');
  });

  test('GET /api/sepultados/pesquisa sem termo retorna 400', async ({ request }) => {
    const res = await request.get('/api/sepultados/pesquisa');
    expect(res.status()).toBe(400);
  });
});
