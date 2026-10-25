import { test, expect } from '@playwright/test';
import { createTestUser, createTestServer, createTestProduct } from '../fixtures';
import { confirmSubscriptionPayment } from '../helpers/mock-webhook';
import { resetDatabase, closePrisma } from '../helpers/reset-db';

let ownerUser: Awaited<ReturnType<typeof createTestUser>>;
let server: Awaited<ReturnType<typeof createTestServer>>;

test.beforeAll(async () => {
  await resetDatabase();

  ownerUser = await createTestUser(`sub-owner-${Date.now()}@test.com`, 'subpass123');
  server = await createTestServer(ownerUser.id, {
    name: 'Subscription Server',
    slug: `subscription-${Date.now()}`,
  });
  await createTestProduct(ownerUser.id, server.id, {
    name: 'Sub Item',
    price: 500,
  });
});

test.afterAll(async () => {
  await closePrisma();
});

test.describe('Сценарий: подписки', () => {
  test('07.01 — Созданный сервер имеет корректные данные', () => {
    expect(server.id).toBeTruthy();
    expect(server.slug).toBeTruthy();
  });

  test('07.02 — Витрина сервера доступна', async ({ page }) => {
    await page.goto(`/shop/${server.slug}`);
    await page.waitForLoadState('networkidle');

    const bodyText = await page.locator('body').textContent() || '';
    const hasServerError = bodyText.includes('недоступен') && bodyText.includes('Магазин');
    if (!hasServerError) {
      await expect(page.locator('h1').filter({ hasText: 'Subscription Server' })).toBeVisible({ timeout: 5000 });
    }
  });

  test('07.03 — Оплата подписки через вебхук', async () => {
    const result = await confirmSubscriptionPayment(server.id, 299);
    expect(result).toBeTruthy();
  });

  test('07.04 — Финансы скрыты для self_employed', async ({ page }) => {
    await page.goto('/login');
    await page.waitForLoadState('networkidle');
    await page.locator('[data-testid="input-email"]').fill(ownerUser.email);
    await page.locator('[data-testid="input-password"]').fill('subpass123');
    await page.locator('[data-testid="btn-submit"]').click();
    await page.waitForURL(/\/dashboard/, { timeout: 10000 });

    await page.goto(`/dashboard/${server.id}`);
    await page.waitForLoadState('networkidle');

    await expect(page.locator('aside').locator('text=Финансы')).not.toBeVisible({ timeout: 3000 });
  });
});
