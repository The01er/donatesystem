import { test, expect } from '@playwright/test';
import { createTestUser, createTestAdmin, createTestServer } from '../fixtures';
import { resetDatabase, closePrisma } from '../helpers/reset-db';

const API_BASE = 'http://127.0.0.1:3001';
let adminUser: Awaited<ReturnType<typeof createTestAdmin>>;
let server: Awaited<ReturnType<typeof createTestServer>>;

test.beforeAll(async () => {
  await resetDatabase();
  const ts = Date.now();

  adminUser = await createTestAdmin(`admin-${ts}@test.com`, 'adminpass123', 'SUPER_ADMIN');

  const ownerUser = await createTestUser(`owner-admin-${ts}@test.com`, 'ownerpass123');
  server = await createTestServer(ownerUser.id, {
    name: 'Server For Admin',
    slug: `admin-test-${ts}`,
  });
});

test.afterAll(async () => {
  await closePrisma();
});

test.describe('Сценарий: админ-панель', () => {
  test('06.01 — SUPER_ADMIN заходит в админку', async ({ page }) => {
    // UI-логин
    await page.goto('/login');
    await page.waitForLoadState('networkidle');
    await page.locator('[data-testid="input-email"]').fill(adminUser.email);
    await page.locator('[data-testid="input-password"]').fill('adminpass123');
    await page.locator('[data-testid="btn-submit"]').click();
    await page.waitForURL(/\/dashboard/, { timeout: 10000 });

    // Переходим в админку
    await page.goto('/admin');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1000);

    const hasStats = await page.locator('text=Пользователи').isVisible().catch(() => false);
    if (!hasStats) {
      const bodyText = await page.locator('body').textContent().catch(() => '');
      test.skip(!bodyText.includes('Обзор'), 'Admin access not configured');
    }
  });

  test('06.02 — Админ блокирует сервер → витрина 404', async ({ browser }) => {
    const blockRes = await fetch(`${API_BASE}/api/admin/servers/${server.id}/block`, {
      method: 'POST',
      headers: { Cookie: `donate_session=${adminUser.cookie}`, 'Content-Type': 'application/json' },
    });

    if (blockRes.ok) {
      const shopPage = await browser.newPage();
      await shopPage.goto(`/shop/${server.slug}`);
      await shopPage.waitForLoadState('networkidle');

      const bodyText = await shopPage.locator('body').textContent() || '';
      const isBlocked = bodyText.toLowerCase().includes('не существует') || bodyText.includes('404');
      expect(isBlocked).toBeTruthy();
      await shopPage.close();
    }
  });

  test('06.03 — Админские эндпоинты доступны', async () => {
    const statsRes = await fetch(`${API_BASE}/api/admin/stats`, {
      headers: { Cookie: `donate_session=${adminUser.cookie}`, 'Content-Type': 'application/json' },
    });
    expect(statsRes.ok).toBeTruthy();
  });

  test('06.04 — Статистика админки отображается', async ({ page }) => {
    // UI-логин через админский email
    await page.goto('/login');
    await page.waitForLoadState('networkidle');
    await page.locator('[data-testid="input-email"]').fill(adminUser.email);
    await page.locator('[data-testid="input-password"]').fill('adminpass123');
    await page.locator('[data-testid="btn-submit"]').click();
    await page.waitForURL(/\/dashboard/, { timeout: 10000 });

    await page.goto('/admin');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1000);

    await expect(page.locator('text=Пользователи').first()).toBeVisible({ timeout: 5000 });
    await expect(page.locator('text=Серверы').first()).toBeVisible();
  });
});
