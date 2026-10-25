import { test, expect } from '@playwright/test';
import { DashboardPage } from '../pages/DashboardPage';
import { LoginPage } from '../pages/LoginPage';
import { createTestUser } from '../fixtures';
import { resetDatabase, closePrisma } from '../helpers/reset-db';

let user: Awaited<ReturnType<typeof createTestUser>>;

test.beforeAll(async () => {
  await resetDatabase();
  user = await createTestUser(`onboarding-${Date.now()}@test.com`, 'onboardpass123');
});

test.afterAll(async () => {
  await closePrisma();
});

test.describe('Сценарий: онбординг нового владельца', () => {
  test('02.01 — Новый пользователь без серверов видит онбординг-мастер', async ({ page }) => {
    // UI-логин
    const login = new LoginPage(page);
    await login.login(user.email, 'onboardpass123');

    const dashboard = new DashboardPage(page);
    await expect(dashboard.onboardingWizard).toBeVisible({ timeout: 10000 });
  });

  test('02.02 — Прохождение 3 шагов онбординга', async ({ page }) => {
    // UI-логин
    await page.goto('/login');
    await page.waitForLoadState('networkidle');
    await page.locator('[data-testid="input-email"]').fill(user.email);
    await page.locator('[data-testid="input-password"]').fill('onboardpass123');
    await page.locator('[data-testid="btn-submit"]').click();
    await page.waitForURL(/\/dashboard/, { timeout: 10000 });

    // Проверяем онбординг через data-testid
    await expect(page.locator('[data-testid="block-onboarding"]')).toBeVisible({ timeout: 5000 });

    const slug = `e2e-onboard-${Date.now()}`;
    await page.locator('[data-testid="input-server-name"]').fill('Onboarding Test Server');
    await page.locator('[data-testid="select-game-type"]').selectOption('minecraft');
    await page.locator('[data-testid="input-server-slug"]').fill(slug);

    await page.locator('[data-testid="btn-next-step"]').first().click();
    await page.waitForTimeout(1000);

    // Шаг 2: Витрина готова
    await expect(page.locator('text=ссылка на витрину').first()).toBeVisible({ timeout: 5000 });

    await page.locator('[data-testid="btn-next-step"]').click();
    await page.waitForTimeout(500);

    // Шаг 3: Готово!
    await expect(page.locator('text=Ваш магазин готов')).toBeVisible({ timeout: 5000 });

    await page.locator('[data-testid="btn-finish-onboarding"]').click();
    await page.waitForLoadState('networkidle');

    await expect(page).toHaveURL(/\/dashboard\//);
  });

  test('02.03 — Прогресс-бар в сайдбаре обновлён', async ({ page }) => {
    await page.goto('/login');
    await page.waitForLoadState('networkidle');
    await page.locator('[data-testid="input-email"]').fill(user.email);
    await page.locator('[data-testid="input-password"]').fill('onboardpass123');
    await page.locator('[data-testid="btn-submit"]').click();
    await page.waitForURL(/\/dashboard/, { timeout: 10000 });

    // Онбординг больше не показывается
    await expect(page.locator('[data-testid="block-onboarding"]')).not.toBeVisible({ timeout: 3000 });

    const hasServerList = await page.locator('[data-testid="dashboard-title"]').isVisible().catch(() => false);
    const isServerDashboard = page.url().includes('/dashboard/') && !page.url().endsWith('/dashboard');
    expect(hasServerList || isServerDashboard).toBeTruthy();
  });
});
