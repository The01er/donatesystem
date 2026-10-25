import prisma from '../plugins/prisma.js';
import type { OperatingMode } from '@prisma/client';

export interface PlatformConfig {
  operatingMode: OperatingMode;
  platformDomain: string;
  cnameTarget: string;
  defaultCommissionPct: number;
  subscriptionPrice: number;

  // Из .env, но с возможностью переопределения через БД
  platformUrl: string;
  corsOrigins: string;
  paymentGateway: string;
  paymentWebhookUrl: string;
  paymentWebhookIps: string[];
  yookassaShopId: string;
  yookassaSecretKey: string;
  anypayMerchantId: string;
  anypaySecretKey: string;
  enotShopId: string;
  enotApiKey: string;
  yoomoneyReceiver: string;
  yoomoneySecret: string;
  notificationProxy: string;
  notificationRelayUrl: string;
  notificationRelayToken: string;

  // Cloudflare Turnstile
  turnstileSiteKey: string;
  turnstileSecretKey: string;
}

let cached: PlatformConfig | null = null;
let cacheExpires = 0;
const CACHE_TTL = 5000;

export async function getPlatformConfig(): Promise<PlatformConfig> {
  if (cached && Date.now() < cacheExpires) return cached;

  const s = await prisma.platformSettings.findUnique({ where: { id: 'global' } });
  const cfg: PlatformConfig = {
    operatingMode: s?.operatingMode || 'self_employed',
    platformDomain: s?.platformDomain || process.env.BASE_DOMAIN || 'example.com',
    cnameTarget: s?.cnameTarget || process.env.BASE_DOMAIN || 'example.com',
    defaultCommissionPct: s?.defaultCommissionPct ?? 10,
    subscriptionPrice: s ? Number(s.subscriptionPrice) : 9.99,

    platformUrl: s?.platformUrl || process.env.BASE_URL || 'http://localhost:3000',
    corsOrigins: s?.corsOrigins || process.env.CORS_ORIGIN || 'http://localhost:3000',
    paymentGateway: s?.paymentGateway || process.env.PAYMENT_GATEWAY || 'mock',
    paymentWebhookUrl: s?.paymentWebhookUrl || process.env.PAYMENT_WEBHOOK_URL || 'http://localhost:3001/api/payment/webhook',
    paymentWebhookIps: parseCsv(s?.paymentWebhookIps || process.env.PAYMENT_WEBHOOK_IPS || ''),
    yookassaShopId: s?.yookassaShopId || process.env.YOOKASSA_SHOP_ID || '',
    yookassaSecretKey: s?.yookassaSecretKey || process.env.YOOKASSA_SECRET_KEY || '',
    anypayMerchantId: s?.anypayMerchantId || process.env.ANYPAY_MERCHANT_ID || '',
    anypaySecretKey: s?.anypaySecretKey || process.env.ANYPAY_SECRET_KEY || '',
    enotShopId: s?.enotShopId || process.env.ENOT_SHOP_ID || '',
    enotApiKey: s?.enotApiKey || process.env.ENOT_API_KEY || '',
    yoomoneyReceiver: s?.yoomoneyReceiver || process.env.YOOMONEY_RECEIVER || '',
    yoomoneySecret: s?.yoomoneySecret || process.env.YOOMONEY_SECRET || '',
    notificationProxy: s?.notificationProxy || process.env.NOTIFICATION_PROXY || '',
    notificationRelayUrl: s?.notificationRelayUrl || process.env.NOTIFICATION_RELAY_URL || '',
    notificationRelayToken: s?.notificationRelayToken || process.env.NOTIFICATION_RELAY_TOKEN || '',

    turnstileSiteKey: s?.turnstileSiteKey || '',
    turnstileSecretKey: s?.turnstileSecretKey || '',
  };

  cached = cfg;
  cacheExpires = Date.now() + CACHE_TTL;
  return cfg;
}

export async function getOperatingMode(): Promise<'self_employed' | 'individual'> {
  const cfg = await getPlatformConfig();
  return cfg.operatingMode;
}

function parseCsv(val: string): string[] {
  if (!val) return [];
  return val.split(',').map((s) => s.trim()).filter(Boolean);
}
