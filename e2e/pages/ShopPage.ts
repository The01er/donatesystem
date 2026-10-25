import type { Page } from '@playwright/test';

export class ShopPage {
  constructor(public readonly page: Page) {}

  buyButton(productId: string) {
    return this.page.locator(`[data-testid="btn-buy-${productId}"]`);
  }

  productName(productId: string) {
    return this.page.locator(`[data-testid="product-name-${productId}"]`);
  }

  productPrice(productId: string) {
    return this.page.locator(`[data-testid="product-price-${productId}"]`);
  }

  get soldOutBadge() {
    return this.page.locator('[data-testid="product-soldout"]');
  }

  get couponInput() {
    return this.page.locator('[data-testid="input-coupon"]');
  }

  get couponApplyButton() {
    return this.page.locator('[data-testid="btn-apply-coupon"]');
  }

  get couponStatus() {
    return this.page.locator('[data-testid="coupon-status"]');
  }

  get topDonatorsBlock() {
    return this.page.locator('[data-testid="block-top-donators"]');
  }

  donatorItem(index: number) {
    return this.page.locator(`[data-testid="donator-${index}"]`);
  }

  get checkoutModal() {
    return this.page.locator('[data-testid="block-checkout"]');
  }

  get checkoutPlayerNameInput() {
    return this.page.locator('[data-testid="input-player-name"]');
  }

  get checkoutEmailInput() {
    return this.page.locator('[data-testid="input-email"]');
  }

  get checkoutConsentCheckbox() {
    return this.page.locator('[data-testid="input-consent"]');
  }

  get checkoutCardConsentCheckbox() {
    return this.page.locator('[data-testid="input-card-consent"]');
  }

  get checkoutConsentLabel() {
    return this.page.locator('[data-testid="label-consent"]');
  }

  get checkoutCardConsentLabel() {
    return this.page.locator('[data-testid="label-card-consent"]');
  }

  get checkoutTotal() {
    return this.page.locator('[data-testid="checkout-total"]');
  }

  get checkoutPayButton() {
    return this.page.locator('[data-testid="btn-submit-order"]');
  }

  get checkoutCloseButton() {
    return this.page.locator('[data-testid="btn-close-checkout"]');
  }

  get couponSuccessMessage() {
    return this.page.locator('[data-testid="coupon-status"]').filter({ hasText: /применён|✓/ });
  }

  get couponErrorMessage() {
    return this.page.locator('[data-testid="coupon-status"]').filter({ hasText: /недействителен|не найден|неактивен/ });
  }

  async goto(slug: string) {
    await this.page.goto(`/shop/${slug}`);
    await this.page.waitForLoadState('networkidle');
    await this.page.waitForTimeout(1000);
  }

  async selectProduct(productId: string) {
    await this.buyButton(productId).click();
    await this.page.waitForTimeout(300);
    await this.checkoutPlayerNameInput.waitFor({ state: 'visible', timeout: 5000 });
  }

  async checkout(playerName: string, email?: string) {
    await this.checkoutPlayerNameInput.fill(playerName);
    if (email) {
      await this.checkoutEmailInput.fill(email);
    }
    await this.checkoutConsentCheckbox.check();
    await this.checkoutCardConsentCheckbox.check();
    await this.checkoutPayButton.click();
  }

  async applyCoupon(code: string) {
    await this.couponInput.fill(code);
    await this.couponApplyButton.click();
    await this.page.waitForTimeout(500);
  }

  async fillPlayerName(name: string) {
    await this.checkoutPlayerNameInput.fill(name);
  }

  async fillEmail(email: string) {
    await this.checkoutEmailInput.fill(email);
  }

  async checkConsent() {
    await this.checkoutConsentCheckbox.check();
  }

  async submitOrder() {
    await this.checkoutPayButton.click();
  }

  async getCouponStatus(): Promise<string | null> {
    return this.couponStatus.textContent();
  }

  async getCheckoutTotal(): Promise<string | null> {
    return this.checkoutTotal.textContent();
  }

  async expectPaymentRedirect() {
    await this.page.waitForTimeout(3000);
    const url = this.page.url();
    return url.includes('success') || url.includes('paid');
  }
}
