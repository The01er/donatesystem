import { describe, it, expect, beforeEach, vi } from 'vitest';

describe('payment gateway', () => {
  beforeEach(() => {
    vi.resetModules();
  });

  it('getPaymentGateway rejects mock in production', async () => {
    const originalEnv = process.env.NODE_ENV;
    const originalJwt = process.env.JWT_SECRET;
    const originalCookie = process.env.COOKIE_SECRET;
    const originalGw = process.env.PAYMENT_GATEWAY;
    process.env.NODE_ENV = 'production';
    process.env.JWT_SECRET = 'test-secret';
    process.env.COOKIE_SECRET = 'test-cookie';
    process.env.PAYMENT_GATEWAY = 'mock';

    const { getPaymentGateway } = await import('../src/services/payment/index.js');
    expect(() => getPaymentGateway()).toThrow('FORBIDDEN in production');

    process.env.NODE_ENV = originalEnv;
    process.env.JWT_SECRET = originalJwt;
    process.env.COOKIE_SECRET = originalCookie;
    process.env.PAYMENT_GATEWAY = originalGw;
  });

  it('getPaymentGateway allows non-mock in production', async () => {
    const originalEnv = process.env.NODE_ENV;
    const originalJwt = process.env.JWT_SECRET;
    const originalCookie = process.env.COOKIE_SECRET;
    const originalGw = process.env.PAYMENT_GATEWAY;
    const originalShopId = process.env.YOOKASSA_SHOP_ID;
    const originalSecretKey = process.env.YOOKASSA_SECRET_KEY;
    process.env.NODE_ENV = 'production';
    process.env.JWT_SECRET = 'test-secret';
    process.env.COOKIE_SECRET = 'test-cookie';
    process.env.PAYMENT_GATEWAY = 'yookassa';
    process.env.YOOKASSA_SHOP_ID = 'test-shop';
    process.env.YOOKASSA_SECRET_KEY = 'test-secret';

    const { getPaymentGateway } = await import('../src/services/payment/index.js');
    const gw = getPaymentGateway();
    expect(gw.getGatewayName()).toBe('yookassa');

    process.env.NODE_ENV = originalEnv;
    process.env.JWT_SECRET = originalJwt;
    process.env.COOKIE_SECRET = originalCookie;
    process.env.PAYMENT_GATEWAY = originalGw;
    process.env.YOOKASSA_SHOP_ID = originalShopId;
    process.env.YOOKASSA_SECRET_KEY = originalSecretKey;
  });

  it('returns mock gateway in development', async () => {
    const originalEnv = process.env.NODE_ENV;
    process.env.NODE_ENV = 'development';
    process.env.PAYMENT_GATEWAY = 'mock';

    const { getPaymentGateway } = await import('../src/services/payment/index.js');
    const gw = getPaymentGateway();
    expect(gw.getGatewayName()).toBe('mock');

    process.env.NODE_ENV = originalEnv;
  });

  it('creates YooKassa gateway when configured', async () => {
    const originalEnv = process.env.NODE_ENV;
    const originalGw = process.env.PAYMENT_GATEWAY;
    const originalShopId = process.env.YOOKASSA_SHOP_ID;
    const originalSecretKey = process.env.YOOKASSA_SECRET_KEY;

    process.env.NODE_ENV = 'development';
    process.env.PAYMENT_GATEWAY = 'yookassa';
    process.env.YOOKASSA_SHOP_ID = 'test-shop';
    process.env.YOOKASSA_SECRET_KEY = 'test-secret';

    const { getPaymentGateway } = await import('../src/services/payment/index.js');
    const gateway = getPaymentGateway();
    expect(gateway.getGatewayName()).toBe('yookassa');

    process.env.NODE_ENV = originalEnv;
    process.env.PAYMENT_GATEWAY = originalGw;
    process.env.YOOKASSA_SHOP_ID = originalShopId;
    process.env.YOOKASSA_SECRET_KEY = originalSecretKey;
  });

  it('throws when yookassa credentials missing', async () => {
    const originalEnv = process.env.NODE_ENV;
    const originalGw = process.env.PAYMENT_GATEWAY;
    const originalShopId = process.env.YOOKASSA_SHOP_ID;
    const originalSecretKey = process.env.YOOKASSA_SECRET_KEY;

    process.env.NODE_ENV = 'development';
    process.env.PAYMENT_GATEWAY = 'yookassa';
    process.env.YOOKASSA_SHOP_ID = '';
    process.env.YOOKASSA_SECRET_KEY = '';

    const { getPaymentGateway } = await import('../src/services/payment/index.js');
    expect(() => getPaymentGateway()).toThrow('YOOKASSA_SHOP_ID and YOOKASSA_SECRET_KEY');

    process.env.NODE_ENV = originalEnv;
    process.env.PAYMENT_GATEWAY = originalGw;
    process.env.YOOKASSA_SHOP_ID = originalShopId;
    process.env.YOOKASSA_SECRET_KEY = originalSecretKey;
  });

  it('throws for unknown gateway', async () => {
    const originalEnv = process.env.NODE_ENV;
    const originalGw = process.env.PAYMENT_GATEWAY;

    process.env.NODE_ENV = 'development';
    process.env.PAYMENT_GATEWAY = 'unknown_gateway';

    const { getPaymentGateway } = await import('../src/services/payment/index.js');
    expect(() => getPaymentGateway()).toThrow('Unknown payment gateway');

    process.env.NODE_ENV = originalEnv;
    process.env.PAYMENT_GATEWAY = originalGw;
  });

  it('returns singleton instance', async () => {
    const originalEnv = process.env.NODE_ENV;
    process.env.NODE_ENV = 'development';
    process.env.PAYMENT_GATEWAY = 'mock';

    const { getPaymentGateway } = await import('../src/services/payment/index.js');
    const a = getPaymentGateway();
    const b = getPaymentGateway();
    expect(a).toBe(b);

    process.env.NODE_ENV = originalEnv;
  });
});
