import type { Page } from '@playwright/test';

/**
 * Page Object для личного кабинета пользователя (/profile).
 */
export class ProfilePage {
  constructor(public readonly page: Page) {}

  async goto() {
    await this.page.goto('/profile');
    await this.page.waitForLoadState('networkidle');
  }

  get profileTitle() {
    return this.page.locator('h1').filter({ hasText: /личный|профиль/i });
  }

  get emailDisplay() {
    return this.page.locator('text=@').first();
  }

  // ─── Смена пароля ──────────────────────────────────────────────────

  get currentPasswordInput() {
    return this.page.locator('input[placeholder*="текущий"]').or(this.page.locator('input[name="currentPassword"]'));
  }

  get newPasswordInput() {
    return this.page.locator('input[placeholder*="новый"]').or(this.page.locator('input[name="newPassword"]'));
  }

  get changePasswordButton() {
    return this.page.locator('button').filter({ hasText: /^(?:Сменить|Изменить) пароль/i });
  }

  get changePasswordSuccessMessage() {
    return this.page.locator('text=Пароль изменён');
  }

  // ─── Сессии ────────────────────────────────────────────────────────

  get sessionsList() {
    return this.page.locator('text=Активные сессии').locator('..');
  }

  get revokeSessionButton() {
    return this.page.locator('button').filter({ hasText: 'Отозвать' });
  }

  // ─── Пополнение баланса ────────────────────────────────────────────

  get depositButton() {
    return this.page.locator('button').filter({ hasText: /пополнить/i });
  }

  get depositAmountInput() {
    return this.page.locator('input[type="number"]');
  }

  // ─── Реквизиты продавца ────────────────────────────────────────────

  get sellerInfoSection() {
    return this.page.locator('text=Реквизиты');
  }

  get sellerLegalNameInput() {
    return this.page.locator('input[placeholder*="ФИО"]');
  }

  get sellerInnInput() {
    return this.page.locator('input[placeholder*="ИНН"]');
  }
}
