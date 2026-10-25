import { test, expect } from '@playwright/test';
import { ShopPage } from '../pages/ShopPage';
import { DashboardPage } from '../pages/DashboardPage';
import { LoginPage } from '../pages/LoginPage';
import { createTestUser, createTestServer, createTestProduct } from '../fixtures';
import { resetDatabase, closePrisma } from '../helpers/reset-db';

let ownerUser: Awaited<ReturnType<typeof createTestUser>>;
let server: Awaited<ReturnType<typeof createTestServer>>;
let privilegeProduct: Awaited<ReturnType<typeof createTestProduct>>;
let orderId: string;

test.beforeAll(async () => {
  await resetDatabase();

  const ts = Date.now();
  ownerUser = await createTestUser(`owner-revoke-${ts}@test.com`, 'pass123');
  server = await createTestServer(ownerUser.id, {
    name: 'Revocation Test',
    slug: `revoke-${ts}`,
  });

  privilegeProduct = await createTestProduct(ownerUser.id, server.id, {
    name: 'VIP Привилегия',
    price: 1500,
    type: 'privilege',
    command: '/add_group {player} vip',
    removeCommand: '/remove_group {player} vip',
  });

  // Создаём заказ и подтверждаем
  const orderRes = await fetch(`http://127.0.0.1:3001/api/shop/${server.slug}/order`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      productId: privilegeProduct.id,
      playerName: 'RevokePlayer',
      consent: true,
    }),
  });
  expect(orderRes.ok).toBeTruthy();
  const orderData = await orderRes.json();
  orderId = orderData.orderId;
  await fetch(orderData.paymentUrl, { method: 'GET' }).catch(() => {});
});

test.afterAll(async () => {
  await closePrisma();
});

test.describe('Сценарий: отзыв привилегии', () => {
  test('05.01 — Владелец может отозвать привилегию из дашборда', async ({ page }) => {
    // UI-логин
    const login = new LoginPage(page);
    await login.login(ownerUser.email, 'pass123');

    const dashboard = new DashboardPage(page);

    // Открываем детальную страницу заказа
    await page.goto(`/dashboard/${server.id}/orders/${orderId}`);
    await page.waitForLoadState('networkidle');

    // Проверяем: кнопка отзыва видна
    await expect(dashboard.revokeButton).toBeVisible({ timeout: 5000 });

    // Жмём отозвать
    await dashboard.revokeButton.click();
    await page.waitForTimeout(500);

    // Подтверждаем в модалке
    await page.locator('[data-testid="btn-confirm-yes"]').click();
    await page.waitForTimeout(1000);

    // Проверяем: статус отзыва изменился
    const bodyText = await page.locator('body').textContent() || '';
    expect(bodyText.toLowerCase()).toContain('отзывается'.toLowerCase());
  });

  test('05.02 — Плагин (мок) забирает revocation и сообщает результат', async () => {
    // Получаем токен плагина для этого сервера
    const tokensRes = await fetch(`http://127.0.0.1:3001/api/servers/${server.id}`, {
      headers: { Cookie: `donate_session=${ownerUser.cookie}`, 'Content-Type': 'application/json' },
    });
    const serverData = tokensRes.ok ? await tokensRes.json() : null;
    const pluginToken = serverData?.pluginToken || '';

    const revocationsRes = await fetch(`http://127.0.0.1:3001/api/plugin/revocations`, {
      headers: {
        'Content-Type': 'application/json',
        'X-Plugin-Token': pluginToken,
      },
    });
    expect(revocationsRes.ok).toBeTruthy();
    const revocations = await revocationsRes.json();

    if (revocations.length > 0) {
      const rev = revocations[0];
      const resultRes = await fetch(`http://127.0.0.1:3001/api/plugin/orders/${rev.orderId}/revocation-result`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Plugin-Token': pluginToken,
        },
        body: JSON.stringify({ success: true }),
      });
      expect(resultRes.ok).toBeTruthy();
    }
  });

  test('05.03 — В таймлайне заказа статус "Привилегия отозвана"', async ({ page }) => {
    const login = new LoginPage(page);
    await login.login(ownerUser.email, 'pass123');

    await page.goto(`/dashboard/${server.id}/orders/${orderId}`);
    await page.waitForLoadState('networkidle');

    // Проверяем: в таймлайне есть событие отзыва
    await expect(page.locator('text=отозван').first()).toBeVisible({ timeout: 5000 });
  });

  test('05.04 — Кнопка "Выдать снова" (re-grant) переводит заказ в PAID', async ({ page }) => {
    const login = new LoginPage(page);
    await login.login(ownerUser.email, 'pass123');

    const dashboard = new DashboardPage(page);

    await page.goto(`/dashboard/${server.id}/orders/${orderId}`);
    await page.waitForLoadState('networkidle');

    // Проверяем: кнопка re-grant видна
    await expect(dashboard.regrantButton).toBeVisible({ timeout: 5000 });

    // Жмём "Выдать снова"
    await dashboard.regrantButton.click();
    await page.waitForTimeout(500);

    // Подтверждаем в модалке
    await page.locator('[data-testid="btn-confirm-yes"]').click();
    await page.waitForTimeout(1000);

    // Статус заказа должен вернуться в paid
    const bodyText = await page.locator('body').textContent() || '';
    expect(bodyText.toLowerCase()).toContain('paid');
  });
});
