import type { Page } from '@playwright/test';

export class LoginPage {
  constructor(public readonly page: Page) {}

  get emailInput() {
    return this.page.locator('[data-testid="input-email"]');
  }

  get passwordInput() {
    return this.page.locator('[data-testid="input-password"]');
  }

  get submitButton() {
    return this.page.locator('[data-testid="btn-submit"]');
  }

  get registerLink() {
    return this.page.locator('[data-testid="link-register"]');
  }

  get forgotPasswordLink() {
    return this.page.locator('[data-testid="link-forgot-password"]');
  }

  get consentCheckbox() {
    return this.page.locator('[data-testid="input-consent"]');
  }

  get successMessage() {
    return this.page.locator('[data-testid="register-success"]');
  }

  async goto() {
    await this.page.goto('/login');
    await this.page.waitForLoadState('networkidle');
  }

  async gotoRegister() {
    await this.page.goto('/register');
    await this.page.waitForLoadState('networkidle');
  }

  async gotoForgotPassword() {
    await this.page.goto('/forgot-password');
    await this.page.waitForLoadState('networkidle');
  }

  async fillEmail(email: string) {
    await this.emailInput.fill(email);
  }

  async fillPassword(password: string) {
    await this.passwordInput.fill(password);
  }

  async submit() {
    await this.submitButton.click();
  }

  async login(email: string, password: string) {
    await this.goto();
    await this.fillEmail(email);
    await this.fillPassword(password);
    await this.submit();
    await this.page.waitForURL(/\/dashboard/);
  }

  async register(email: string, password: string) {
    await this.gotoRegister();
    await this.fillEmail(email);
    await this.fillPassword(password);
    await this.consentCheckbox.check();
    await this.submit();
  }

  async forgotPassword(email: string) {
    await this.gotoForgotPassword();
    await this.fillEmail(email);
    await this.submit();
  }

  async resetPassword(newPassword: string) {
    await this.passwordInput.fill(newPassword);
    await this.submit();
  }

  async logout() {
    // Ищем кнопку выхода в сайдбаре
    const logoutBtn = this.page.locator('button').filter({ hasText: 'Выйти' });
    if (await logoutBtn.isVisible()) {
      await logoutBtn.click();
    }
  }
}
