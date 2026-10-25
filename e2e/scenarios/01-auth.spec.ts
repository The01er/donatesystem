import { test, expect } from '@playwright/test';
import { LoginPage } from '../pages/LoginPage';
import { createTestUser } from '../fixtures';
import { resetDatabase, closePrisma } from '../helpers/reset-db';

const API_BASE = 'http://127.0.0.1:3001';

let user: Awaited<ReturnType<typeof createTestUser>>;

test.beforeAll(async () => {
  await resetDatabase();

  // Создаём пользователя через Prisma (обходит rate-limit)
  user = await createTestUser(`auth-test-${Date.now()}@test.com`, 'securepass123');
});

test.afterAll(async () => {
  await closePrisma();
});

test.describe('Сценарий: аутентификация', () => {
  test('01.01 — Регистрация нового пользователя через UI', async ({ page }) => {
    const loginPage = new LoginPage(page);
    await loginPage.gotoRegister();

    const uniqueEmail = `ui-reg-${Date.now()}@test.com`;
    await loginPage.emailInput.fill(uniqueEmail);
    await loginPage.passwordInput.fill('newuserpass123');
    await loginPage.consentCheckbox.check();
    await loginPage.submit();

    // Проверяем: сообщение об отправке email
    await expect(loginPage.successMessage).toBeVisible();
  });

  test('01.02 — Логин через UI с корректными данными', async ({ page }) => {
    const loginPage = new LoginPage(page);
    await loginPage.login(user.email, user.password);

    // Проверяем: редирект на /dashboard
    await expect(page).toHaveURL(/\/dashboard/);
  });

  test('01.03 — Логин с неверным паролем возвращает ошибку', async ({ page }) => {
    const loginPage = new LoginPage(page);
    await loginPage.goto();

    await loginPage.fillEmail(user.email);
    await loginPage.fillPassword('wrongpassword');

    await loginPage.submit();

    // Проверяем сообщение об ошибке
    await expect(page.locator('text=Invalid credentials')).toBeVisible({ timeout: 5000 });
  });

  test('01.04 — Восстановление пароля (forgot-password)', async ({ page }) => {
    await page.goto('/forgot-password');
    await page.waitForLoadState('networkidle');

    await page.locator('input[type="email"]').fill(user.email);
    await page.locator('button[type="submit"]').click();

    await expect(page.locator('text=отправлена')).toBeVisible({ timeout: 5000 });
  });

  test('01.05 — Logout инвалидирует сессию', async ({ page }) => {
    // Логинимся через UI, чтобы получить валидную сессию
    await page.goto('/login');
    await page.waitForLoadState('networkidle');
    await page.locator('[data-testid="input-email"]').fill(user.email);
    await page.locator('[data-testid="input-password"]').fill('securepass123');
    await page.locator('[data-testid="btn-submit"]').click();
    await page.waitForURL(/\/dashboard/, { timeout: 10000 });

    // Проверяем: мы залогинены
    expect(page.url()).not.toContain('/login');

    // Выходим через API
    await page.evaluate(() =>
      fetch('/api/auth/logout', { method: 'POST', credentials: 'include' }),
    );
    await page.waitForTimeout(500);

    // Пытаемся зайти на /dashboard — middleware редиректит на login
    await page.goto('/dashboard');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1000);

    const onLoginPage = page.url().includes('/login')
      || await page.locator('text=Войти').isVisible().catch(() => false);
    expect(onLoginPage).toBeTruthy();
  });
});
