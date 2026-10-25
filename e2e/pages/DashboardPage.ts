import type { Page } from '@playwright/test';

export class DashboardPage {
  constructor(public readonly page: Page) {}

  get serverListTitle() {
    return this.page.locator('[data-testid="dashboard-title"]');
  }

  get createServerButton() {
    return this.page.locator('[data-testid="btn-create-server"]');
  }

  get createFirstServerButton() {
    return this.page.locator('[data-testid="btn-create-first-server"]');
  }

  get createServerNameInput() {
    return this.page.locator('[data-testid="input-server-name"]');
  }

  get createServerSlugInput() {
    return this.page.locator('[data-testid="input-server-slug"]');
  }

  get createServerGameSelect() {
    return this.page.locator('[data-testid="select-game-type"]');
  }

  get createServerSubmitButton() {
    return this.page.locator('[data-testid="btn-submit-create-server"]');
  }

  get createError() {
    return this.page.locator('[data-testid="create-error"]');
  }

  get ordersTitle() {
    return this.page.locator('h2').filter({ hasText: 'Заказы' });
  }

  orderRow(orderId: string) {
    return this.page.locator(`[data-testid="row-order-${orderId}"]`);
  }

  orderStatus(orderId: string) {
    return this.page.locator(`[data-testid="order-status-${orderId}"]`);
  }

  orderAmount(orderId: string) {
    return this.page.locator(`[data-testid="order-amount-${orderId}"]`);
  }

  get revokeButton() {
    return this.page.locator('[data-testid="btn-revoke"]');
  }

  get regrantButton() {
    return this.page.locator('[data-testid="btn-regrant"]');
  }

  get onboardingWizard() {
    return this.page.locator('[data-testid="block-onboarding"]');
  }

  get onboardingNextButton() {
    return this.page.locator('[data-testid="btn-next-step"]');
  }

  get onboardingFinishButton() {
    return this.page.locator('[data-testid="btn-finish-onboarding"]');
  }

  async revokeOrder(orderId: string) {
    await this.page.goto(`/dashboard/${orderId.split('-')[0]}/orders/${orderId}`);
    await this.page.waitForLoadState('networkidle');
    await this.revokeButton.click();
    await this.page.locator('[data-testid="btn-confirm-yes"]').click();
  }

  async regrantOrder(orderId: string) {
    await this.page.goto(`/dashboard/${orderId.split('-')[0]}/orders/${orderId}`);
    await this.page.waitForLoadState('networkidle');
    await this.regrantButton.click();
    await this.page.locator('[data-testid="btn-confirm-yes"]').click();
  }

  async getOrderStatus(orderId: string): Promise<string | null> {
    return this.orderStatus(orderId).textContent();
  }

  async getOrderAmount(orderId: string): Promise<string | null> {
    return this.orderAmount(orderId).textContent();
  }

  async clickCreateServer() {
    if (await this.createFirstServerButton.isVisible()) {
      await this.createFirstServerButton.click();
    } else {
      await this.createServerButton.click();
    }
  }

  async fillServerName(name: string) {
    await this.createServerNameInput.fill(name);
  }

  async fillServerSlug(slug: string) {
    await this.createServerSlugInput.fill(slug);
  }

  async selectGame(gameType: string) {
    await this.createServerGameSelect.selectOption(gameType);
  }

  async submitCreateServer() {
    await this.createServerSubmitButton.click();
    await this.page.waitForURL(/\/dashboard\//);
  }

  async goto() {
    await this.page.goto('/dashboard');
    await this.page.waitForLoadState('networkidle');
  }

  async openServer(serverId: string) {
    await this.page.goto(`/dashboard/${serverId}`);
    await this.page.waitForLoadState('networkidle');
  }

  async openServerTab(serverId: string, tab: string) {
    await this.page.goto(`/dashboard/${serverId}/${tab}`);
    await this.page.waitForLoadState('networkidle');
  }

  async isOnboardingVisible(): Promise<boolean> {
    return this.onboardingWizard.isVisible();
  }

  async createServerViaUI(name: string, gameType: string, _ip: string, slug: string) {
    await this.goto();
    await this.clickCreateServer();
    await this.page.waitForTimeout(300);
    await this.fillServerName(name);
    await this.selectGame(gameType);
    await this.fillServerSlug(slug);
    await this.submitCreateServer();
  }
}
