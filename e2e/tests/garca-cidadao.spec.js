// @ts-check
const { test, expect } = require('@playwright/test');

test.describe('Garça Cidadão', () => {
  test('portal /garca-cidadao/ carrega', async ({ page }) => {
    const res = await page.goto('/garca-cidadao/');
    expect(res?.status()).toBeLessThan(400);
    await expect(page.locator('body')).toBeVisible();
  });

  test('login Garça Cidadão carrega sem token na URL', async ({ page }) => {
    const res = await page.goto('/garca-cidadao/login');
    expect(res?.status()).toBeLessThan(400);
    const url = page.url();
    expect(url).not.toMatch(/[?&](token|access_token)=/i);
  });

  test('API Gov health via proxy /garca-cidadao-api/health', async ({ request }) => {
    const res = await request.get('/garca-cidadao-api/health');
    expect(res.ok()).toBeTruthy();
    const body = await res.json();
    expect(body.status).toBe('ok');
  });
});
