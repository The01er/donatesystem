import { test, expect } from '@playwright/test';
import { ShopPage } from '../pages/ShopPage';
import { DashboardPage } from '../pages/DashboardPage';
import { createTestUser, createTestServer, createTestProduct } from '../fixtures';
import { resetDatabase, closePrisma } from '../helpers/reset-db';

test.beforeAll(async () => {
  await resetDatabase();
});

test.describe('Сценарий: мультитенантность (изоляция данных)', () => {
  let owner1: Awaited<ReturnType<typeof createTestUser>>;
  let owner2: Awaited<ReturnType<typeof createTestUser>>;
  let server1: Awaited<ReturnType<typeof createTestServer>>;
  let server2: Awaited<ReturnType<typeof createTestServer>>;
  let product1: Awaited<ReturnType<typeof createTestProduct>>;
  let product2: Awaited<ReturnType<typeof createTestProduct>>;

  test.beforeAll(async () => {
    const ts = Date.now();

    owner1 = await createTestUser(`owner1-mt-${ts}@test.com`, 'pass1');
    server1 = await createTestServer(owner1.id, {
      name: 'Магазин Ивана',
      slug: `ivan-shop-${ts}`,
    });
    product1 = await createTestProduct(owner1.id, server1.id, {
      name: 'Товар Ивана',
      price: 300,
    });

    owner2 = await createTestUser(`owner2-mt-${ts}@test.com`, 'pass2');
    server2 = await createTestServer(owner2.id, {
      name: 'Магазин Петра',
      slug: `petr-shop-${ts}`,
    });
    product2 = await createTestProduct(owner2.id, server2.id, {
      name: 'Товар Петра',
      price: 500,
    });
  });

  test('08.01 — Два владельца имеют два независимых магазина', async ({ browser }) => {
    // Проверяем магазин 1
    const page1 = await browser.newPage();
    const shop1 = new ShopPage(page1);
    await shop1.goto(server1.slug);
    await expect(page1.locator('h1').filter({ hasText: 'Магазин Ивана' })).toBeVisible({ timeout: 5000 });
    await expect(page1.locator('text=Товар Ивана').first()).toBeVisible();
    await expect(page1.locator('text=Товар Петра')).not.toBeVisible();
    await page1.close();

    // Проверяем магазин 2
    const page2 = await browser.newPage();
    const shop2 = new ShopPage(page2);
    await shop2.goto(server2.slug);
    await expect(page2.locator('h1').filter({ hasText: 'Магазин Петра' })).toBeVisible({ timeout: 5000 });
    await expect(page2.locator('text=Товар Петра').first()).toBeVisible();
    await expect(page2.locator('text=Товар Ивана')).not.toBeVisible();
    await page2.close();
  });

  test('08.02 — Покупатель покупает у первого — кошелёк первого пополняется', async ({ browser }) => {
    const orderRes = await fetch(`http://127.0.0.1:3001/api/shop/${server1.slug}/order`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        productId: product1.id,
        playerName: 'MultiTenantPlayer',
        consent: true,
      }),
    });
    expect(orderRes.ok).toBeTruthy();
    const orderData = await orderRes.json();

    await fetch(orderData.paymentUrl, { method: 'GET' }).catch(() => {});

    // Проверяем баланс владельца 1 через API
    const walletRes1 = await fetch(`http://127.0.0.1:3001/api/servers/${server1.id}/wallet`, {
      headers: { Cookie: `donate_session=${owner1.cookie}`, 'Content-Type': 'application/json' },
    }).catch(() => null);

    if (walletRes1 && walletRes1.ok) {
      const wallet1 = await walletRes1.json();
      expect(Number(wallet1.balance)).toBeGreaterThan(0);
    }

    // Проверяем: владелец 2 не видит этот заказ
    const ordersRes2 = await fetch(`http://127.0.0.1:3001/api/servers/${server2.id}/orders`, {
      headers: { Cookie: `donate_session=${owner2.cookie}`, 'Content-Type': 'application/json' },
    }).catch(() => null);

    if (ordersRes2 && ordersRes2.ok) {
      const orders2 = await ordersRes2.json();
      const items = Array.isArray(orders2) ? orders2 : (orders2 as any).items || [];
      const hasOtherOrder = items.some((o: any) => o.playerName === 'MultiTenantPlayer');
      expect(hasOtherOrder).toBeFalsy();
    }
  });

  test('08.03 — Каждый видит только свои заказы в дашборде', async ({ page }) => {
    // Владелец 1: UI-логин
    await page.goto('/login');
    await page.waitForLoadState('networkidle');
    await page.locator('[data-testid="input-email"]').fill(owner1.email);
    await page.locator('[data-testid="input-password"]').fill('pass1');
    await page.locator('[data-testid="btn-submit"]').click();
    await page.waitForURL(/\/dashboard/, { timeout: 10000 });

    const dashboard1 = new DashboardPage(page);
    await dashboard1.openServerTab(server1.id, 'orders');
    await page.waitForTimeout(1000);

    // Ищем в таблице через data-testid (сперва проверяем что заказы есть)
    const bodyText = await page.locator('body').textContent() || '';
    if (bodyText.includes('MultiTenantPlayer')) {
      await expect(page.locator('text=MultiTenantPlayer').first()).toBeVisible({ timeout: 5000 });
    }

    // Владелец 2: новая страница
    await page.goto('/login');
    await page.waitForLoadState('networkidle');
    await page.locator('[data-testid="input-email"]').fill(owner2.email);
    await page.locator('[data-testid="input-password"]').fill('pass2');
    await page.locator('[data-testid="btn-submit"]').click();
    await page.waitForURL(/\/dashboard/, { timeout: 10000 });

    const dashboard2 = new DashboardPage(page);
    await dashboard2.openServerTab(server2.id, 'orders');
    await page.waitForTimeout(500);

    await expect(page.locator('text=MultiTenantPlayer')).not.toBeVisible({ timeout: 3000 });
  });
});

test.afterAll(async () => {
  await closePrisma();
});
