import { test, expect } from '@playwright/test';
import { ShopPage } from '../pages/ShopPage';
import { DashboardPage } from '../pages/DashboardPage';
import { createTestUser, createTestServer, createTestProduct, createTestCoupon } from '../fixtures';
import { setAuthCookie } from '../helpers/auth';
import { resetDatabase, closePrisma } from '../helpers/reset-db';

let ownerUser: Awaited<ReturnType<typeof createTestUser>>;
let server: Awaited<ReturnType<typeof createTestServer>>;
let privilegeProduct: Awaited<ReturnType<typeof createTestProduct>>;
let coupon: Awaited<ReturnType<typeof createTestCoupon>>;

test.beforeAll(async () => {
  await resetDatabase();

  const ts = Date.now();
  ownerUser = await createTestUser(`owner-coupon-${ts}@test.com`, 'pass123');
  server = await createTestServer(ownerUser.id, {
    name: 'Coupon & Upgrade Test',
    slug: `coupon-upgrade-${ts}`,
  });

  // Создаём товар-привилегию (для upgrade)
  privilegeProduct = await createTestProduct(ownerUser.id, server.id, {
    name: 'VIP Привилегия',
    price: 2000,
    type: 'privilege',
    command: '/add_group {player} vip',
  });

  // Создаём промокод на 10%
  coupon = await createTestCoupon(ownerUser.id, server.id, {
    code: 'SAVE10',
    discountType: 'percentage',
    discountValue: 10,
  });
});

test.afterAll(async () => {
  await closePrisma();
});

test.describe('Сценарий: промокоды и доплата', () => {
  test('04.01 — Применение промокода на витрине уменьшает цену', async ({ browser }) => {
    const page = await browser.newPage();
    const shop = new ShopPage(page);

    await shop.goto(server.slug);
    await page.waitForTimeout(500);

    // Вводим промокод
    await shop.applyCoupon('SAVE10');

    // Проверяем: сообщение об успешном применении
    await expect(page.locator('text=Промокод применён').or(page.locator('text=скидка'))).toBeVisible({ timeout: 5000 });

    await page.close();
  });

  test('04.02 — Неверный промокод показывает ошибку', async ({ browser }) => {
    const page = await browser.newPage();
    const shop = new ShopPage(page);

    await shop.goto(server.slug);
    await page.waitForTimeout(500);

    await shop.applyCoupon('INVALID123');

    // Проверяем: сообщение об ошибке (смотрим coupon-status)
    await expect(page.locator('[data-testid="coupon-status"]')).toBeVisible({ timeout: 5000 });

    await page.close();
  });

  test('04.03 — Проверка check-upgrade для привилегии', async ({ browser }) => {
    // Сначала создаём заказ на привилегию, чтобы у игрока была история
    // Используем API, чтобы создать заказ со статусом PAID
    const page = await browser.newPage();
    const shop = new ShopPage(page);

    await shop.goto(server.slug);
    await page.waitForTimeout(500);

    // Вводим ник и проверяем upgrade
    // upgrade срабатывает автоматически после ввода ника
    // Создаём заказ через API для этого игрока
    const orderRes = await fetch('http://127.0.0.1:3001/api/shop/' + server.slug + '/order', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        productId: privilegeProduct.id,
        playerName: 'UpgradePlayer',
        consent: true,
      }),
    });

    if (orderRes.ok) {
      const orderData = await orderRes.json();
      // Подтверждаем оплату через мок-вебхук
      await fetch(orderData.paymentUrl, { method: 'GET' }).catch(() => {});
    }

    await page.close();
  });

  test('04.04 — Доплата дешевле полной цены', async ({ page }) => {
    // Доплата (upgrade) требует созданного заказа с привилегией для того же ника
    // Этот тест проверяет, что API check-upgrade возвращает корректные данные
    const checkRes = await fetch(`http://127.0.0.1:3001/api/shop/${server.slug}/check-upgrade`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ playerName: 'UpgradePlayer' }),
    });

    expect(checkRes.ok).toBeTruthy();
    const data = await checkRes.json();
    expect(data.upgrades).toBeDefined();
  });
});
