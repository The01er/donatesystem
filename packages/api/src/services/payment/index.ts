import type { PaymentGateway } from './types.js';
import { MockPaymentGateway } from './mock.js';
import { YooKassaGateway } from './yookassa.js';
import { AnyPayGateway } from './anypay.js';
import { EnotGateway } from './enot.js';
import { YooMoneyGateway } from './yoomoney.js';
import { config } from '../../config.js';
import { decryptSecret } from '../../lib/crypto.js';
import type { PlatformConfig } from '../../lib/platform-settings.js';

export interface PaymentKeyEntry {
  provider: string;
  secret: string;
  publicKey?: string;
  enabled: boolean;
  extra?: Record<string, string>;
}

const PROVIDER_LABELS: Record<string, string> = {
  anypay: 'AnyPay',
  yookassa: 'ЮKassa',
  enot: 'Enot.io',
  yoomoney: 'ЮMoney',
  mock: 'Тестовый платёж',
};

let instance: PaymentGateway | null = null;

function buildGateway(entry: PaymentKeyEntry): PaymentGateway {
  switch (entry.provider) {
    case 'anypay':
      return new AnyPayGateway({
        merchantId: entry.publicKey || '',
        secretKey: decryptSecret(entry.secret),
      });
    case 'yookassa':
      return new YooKassaGateway({
        shopId: entry.publicKey || '',
        secretKey: decryptSecret(entry.secret),
        webhookSecret: config.paymentWebhookSecret,
      });
    case 'enot':
      return new EnotGateway({
        shopId: entry.publicKey || '',
        apiKey: decryptSecret(entry.secret),
        webhookSecret: entry.extra?.webhookSecret || '',
      });
    case 'yoomoney':
      return new YooMoneyGateway({
        receiver: entry.publicKey || '',
        secretKey: decryptSecret(entry.secret),
      });
    case 'mock':
      if (process.env.NODE_ENV === 'production') {
        throw new Error('Mock payment gateway is FORBIDDEN in production via payment keys');
      }
      return new MockPaymentGateway();
    default:
      throw new Error(`Неизвестный платёжный провайдер: ${entry.provider}`);
  }
}

export function getPaymentMethods(keys: unknown): Array<{ provider: string; label: string }> {
  const list = Array.isArray(keys) ? (keys as PaymentKeyEntry[]) : [];
  return list
    .filter((k) => k.enabled !== false && PROVIDER_LABELS[k.provider])
    .map((k) => ({ provider: k.provider, label: PROVIDER_LABELS[k.provider] }));
}

export function getGlobalPaymentMethods(pcfg: PlatformConfig): Array<{ provider: string; label: string }> {
  const enabled = (pcfg.paymentGateway || 'mock').split(',').map((s) => s.trim()).filter(Boolean);
  return enabled
    .filter((p) => PROVIDER_LABELS[p])
    .map((p) => ({ provider: p, label: PROVIDER_LABELS[p] }));
}

export function getGatewayForProvider(provider: string, pcfg: PlatformConfig): PaymentGateway {
  return buildGatewayFromName(provider, pcfg);
}

export function getGatewayForServer(opts: {
  keys: unknown;
  slug?: string;
  requireKeys?: boolean;
  provider?: string;
}): PaymentGateway {
  const list = Array.isArray(opts.keys) ? (opts.keys as PaymentKeyEntry[]) : [];

  if (opts.provider) {
    const entry = list.find((k) => k.provider === opts.provider && k.enabled !== false);
    if (entry) return buildGateway(entry);
    if (opts.requireKeys) {
      throw new Error(
        `Платёжная система "${PROVIDER_LABELS[opts.provider] || opts.provider}" не настроена. Обратитесь к администрации магазина.`,
      );
    }
    return getPaymentGateway();
  }

  const firstEnabled = list.find((k) => k.enabled !== false);
  if (firstEnabled) return buildGateway(firstEnabled);

  if (opts.requireKeys) {
    throw new Error(`Владелец магазина ${opts.slug || ''} не настроил платёжные ключи. Обратитесь к администрации.`);
  }
  return getPaymentGateway();
}

export function getPaymentGateway(): PaymentGateway {
  if (instance) return instance;
  instance = createFallbackGateway();
  return instance;
}

export function createFallbackGateway(): PaymentGateway {
  const gw = process.env.PAYMENT_GATEWAY || 'mock';
  if (gw === 'mock' && process.env.NODE_ENV === 'production') {
      throw new Error(
        'Mock payment gateway is FORBIDDEN in production. ' +
          'Set PAYMENT_GATEWAY=anypay|yookassa or configure via admin panel.',
      );
  }
  if (gw === 'mock') {
    console.warn('[payment] Using MOCK payment gateway — never use in production!');
    return new MockPaymentGateway();
  }
  switch (gw) {
    case 'yookassa':
      if (!process.env.YOOKASSA_SHOP_ID || !process.env.YOOKASSA_SECRET_KEY) {
        throw new Error('YooKassa gateway requires YOOKASSA_SHOP_ID and YOOKASSA_SECRET_KEY env vars');
      }
      return new YooKassaGateway({
        shopId: process.env.YOOKASSA_SHOP_ID,
        secretKey: process.env.YOOKASSA_SECRET_KEY,
        webhookSecret: config.paymentWebhookSecret,
      });
    case 'anypay':
      if (!process.env.ANYPAY_MERCHANT_ID || !process.env.ANYPAY_SECRET_KEY) {
        throw new Error('AnyPay gateway requires ANYPAY_MERCHANT_ID and ANYPAY_SECRET_KEY env vars');
      }
      return new AnyPayGateway({
        merchantId: process.env.ANYPAY_MERCHANT_ID,
        secretKey: process.env.ANYPAY_SECRET_KEY,
      });
    case 'enot':
      if (!process.env.ENOT_SHOP_ID || !process.env.ENOT_API_KEY) {
        throw new Error('Enot.io gateway requires ENOT_SHOP_ID and ENOT_API_KEY env vars');
      }
      return new EnotGateway({
        shopId: process.env.ENOT_SHOP_ID,
        apiKey: process.env.ENOT_API_KEY,
        webhookSecret: config.paymentWebhookSecret,
      });
    case 'yoomoney':
      if (!process.env.YOOMONEY_RECEIVER || !process.env.YOOMONEY_SECRET) {
        throw new Error('YooMoney gateway requires YOOMONEY_RECEIVER and YOOMONEY_SECRET env vars');
      }
      return new YooMoneyGateway({
        receiver: process.env.YOOMONEY_RECEIVER,
        secretKey: process.env.YOOMONEY_SECRET,
      });
    default:
      throw new Error('Unknown payment gateway: ' + gw);
  }
}

export function createGatewayFromConfig(pcfg: PlatformConfig): PaymentGateway {
  const gwList = (pcfg.paymentGateway || 'mock').split(',').map((s) => s.trim()).filter(Boolean);
  for (const gw of gwList) {
    try {
      return buildGatewayFromName(gw, pcfg);
    } catch {
      continue;
    }
  }
  throw new Error('No enabled payment gateway with valid configuration');
}

function buildGatewayFromName(gw: string, pcfg: PlatformConfig): PaymentGateway {
  switch (gw) {
    case 'mock':
      if (process.env.NODE_ENV === 'production') throw new Error('Mock is forbidden in production');
      return new MockPaymentGateway();
    case 'yookassa':
      if (!pcfg.yookassaShopId || !pcfg.yookassaSecretKey) throw new Error('YooKassa not configured');
      return new YooKassaGateway({
        shopId: pcfg.yookassaShopId,
        secretKey: pcfg.yookassaSecretKey,
        webhookSecret: config.paymentWebhookSecret,
      });
    case 'anypay':
      if (!pcfg.anypayMerchantId || !pcfg.anypaySecretKey) throw new Error('AnyPay not configured');
      return new AnyPayGateway({
        merchantId: pcfg.anypayMerchantId,
        secretKey: pcfg.anypaySecretKey,
      });
    case 'enot':
      if (!pcfg.enotShopId || !pcfg.enotApiKey) throw new Error('Enot.io not configured');
      return new EnotGateway({
        shopId: pcfg.enotShopId,
        apiKey: pcfg.enotApiKey,
        webhookSecret: config.paymentWebhookSecret,
      });
    case 'yoomoney':
      if (!pcfg.yoomoneyReceiver || !pcfg.yoomoneySecret) throw new Error('YooMoney not configured');
      return new YooMoneyGateway({
        receiver: pcfg.yoomoneyReceiver,
        secretKey: pcfg.yoomoneySecret,
      });
    default:
      throw new Error('Unknown payment gateway: ' + gw);
  }
}
