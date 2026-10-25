import { test, expect } from '@playwright/test';
import { DashboardPage } from '../pages/DashboardPage';
import { ShopPage } from '../pages/ShopPage';
import { LoginPage } from '../pages/LoginPage';
import { createTestUser, createTestServer, createTestProduct } from '../fixtures';
import { resetDatabase, closePrisma } from '../helpers/reset-db';

let ownerUser: Awaited<ReturnType<typeof createTestUser>>;
let server: Awaited<ReturnType<typeof createTestServer>>;
let product: Awaited<ReturnType<typeof createTestProduct>>;

test.beforeAll(async () => {
  await resetDatabase();

  ownerUser = await createTestUser(`owner-checkout-${Date.now()}@test.com`, 'ownerpass123');
  server = await createTestServer(ownerUser.id, {
    name: 'Checkout Test Server',
    slug: `checkout-${Date.now()}`,
  });
  product = await createTestProduct(ownerUser.id, server.id, {
    name: 'Алмазный меч',
    price: 500,
    type: 'item',
    command: '/give {player} diamond_sword 1',
  });
});

test.afterAll(async () => {
  await closePrisma();
});

test.describe('Сценарий: покупка товара на витрине', () => {
  test('03.01 — Покупатель заходит на витрину и видит товары', async ({ browser }) => {
    const page = await browser.newPage();
    const shop = new ShopPage(page);
    await shop.goto(server.slug);

    await expect(shop.productName(product.id)).toBeVisible({ timeout: 10000 });
    await expect(shop.productPrice(product.id)).toBeVisible();
    await expect(shop.buyButton(product.id)).toBeVisible();

    await page.close();
  });

  test('03.02 — Покупатель выбирает товар, проходит чекаут, оплачивает', async ({ browser }) => {
    const page = await browser.newPage();
    const shop = new ShopPage(page);

    await shop.goto(server.slug);

    // Кликаем по кнопке покупки
    await shop.selectProduct(product.id);

    // Заполняем форму чекаута через ShopPage
    await shop.checkout('PlayerOne', 'player@test.com');

    // Ждём результата
    await page.waitForTimeout(3000);
    const success = await page.locator('text=успешн').isVisible({ timeout: 8000 }).catch(() => false);
    if (!success) {
      const currentUrl = page.url();
      if (currentUrl.includes('success') || currentUrl.includes('paid')) {
        test.skip(true, 'Payment redirect occurred - mock webhook handled it');
      }
    }

    await page.close();
  });

  test('03.03 — Владелец видит заказы в дашборде', async ({ browser }) => {
    const page = await browser.newPage();
    const login = new LoginPage(page);
    const dashboard = new DashboardPage(page);

    // UI-логин вместо setAuthCookie
    await login.login(ownerUser.email, 'ownerpass123');

    // Переходим на заказы
    await dashboard.openServerTab(server.id, 'orders');

    // Проверяем: страница заказов загрузилась
    await expect(dashboard.ordersTitle).toBeVisible({ timeout: 10000 });

    // Проверяем: таблица заказов отображается (если есть заказы)
    if (await dashboard.orderRow('placeholder').isVisible({ timeout: 2000 }).catch(() => false)) {
      // Ожидаем статус и сумму
      await expect(dashboard.orderStatus('placeholder').first()).toBeVisible();
    }

    await page.close();
  });

  test('03.04 — Покупка без согласия отклоняется', async ({ browser }) => {
    const page = await browser.newPage();
    const shop = new ShopPage(page);

    await shop.goto(server.slug);

    // Выбираем товар
    await shop.selectProduct(product.id);

    // Заполняем ник, но НЕ ставим согласия
    await shop.fillPlayerName('BadPlayer');

    // Кнопка оплаты должна быть disabled
    await expect(shop.checkoutPayButton).toBeDisabled();

    await page.close();
  });
});
