import type { Page } from '@playwright/test';

/**
 * Page Object для админ-панели платформы (/admin).
 */
export class AdminPage {
  constructor(public readonly page: Page) {}

  // ─── Навигация ─────────────────────────────────────────────────────

  get adminTitle() {
    return this.page.locator('h1').filter({ hasText: 'Обзор платформы' });
  }

  get sidebarLinks() {
    return this.page.locator('nav a, aside a');
  }

  async goto() {
    await this.page.goto('/admin');
    await this.page.waitForLoadState('networkidle');
  }

  /**
   * Открывает раздел админки.
   */
  async openSection(sectionPath: string) {
    await this.page.goto(`/admin/${sectionPath}`);
    await this.page.waitForLoadState('networkidle');
  }

  // ─── Статистика ────────────────────────────────────────────────────

  get statsCards() {
    return this.page.locator('text=Пользователи, text=Серверы, text=Заказы');
  }

  get totalUsersStat() {
    return this.page.locator('text=Пользователи').locator('..').locator('..').locator('..').locator('div').nth(1);
  }

  // ─── Серверы ───────────────────────────────────────────────────────

  get serverRows() {
    return this.page.locator('table tbody tr');
  }

  get blockServerButton() {
    return this.page.locator('button').filter({ hasText: 'Заблокировать' });
  }

  get unblockServerButton() {
    return this.page.locator('button').filter({ hasText: 'Разблокировать' });
  }

  // ─── Заказы ────────────────────────────────────────────────────────

  get orderRows() {
    return this.page.locator('table tbody tr');
  }

  get cancelOrderButton() {
    return this.page.locator('button').filter({ hasText: 'Отменить заказ' });
  }

  // ─── Пользователи ──────────────────────────────────────────────────

  get userRows() {
    return this.page.locator('table tbody tr');
  }

  get banUserButton() {
    return this.page.locator('button').filter({ hasText: 'Заблокировать' });
  }

  // ─── Подписки ──────────────────────────────────────────────────────

  get extendSubscriptionButton() {
    return this.page.locator('button').filter({ hasText: 'Продлить' });
  }

  get cancelSubscriptionButton() {
    return this.page.locator('button').filter({ hasText: 'Отменить подписку' });
  }

  // ─── Настройки ─────────────────────────────────────────────────────

  get settingsSaveButton() {
    return this.page.locator('button[type="submit"]').filter({ hasText: 'Сохранить' });
  }

  get operatingModeSelect() {
    return this.page.locator('select').filter({ has: this.page.locator('option[value="self_employed"]') });
  }
}
