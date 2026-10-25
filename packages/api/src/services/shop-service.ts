import { z } from 'zod';
import prisma from '../plugins/prisma.js';
import { OrderStatus } from '../constants/order-status.js';
import {
  calculateCommission,
  getPurchasedPrivileges,
  computeBestUpgrade,
  type UpgradeEntry,
} from './order-service.js';
import { getGatewayForServer, getPaymentMethods } from './payment/index.js';
import { AnyPayGateway } from './payment/anypay.js';
import { YooKassaGateway } from './payment/yookassa.js';
import { EnotGateway } from './payment/enot.js';
import { YooMoneyGateway } from './payment/yoomoney.js';
import { decryptSecret } from '../lib/crypto.js';
import { getPlatformConfig, getOperatingMode } from '../lib/platform-settings.js';
import { getCachedShop, setCachedShop, invalidateShopCache } from '../plugins/cache.js';
import { getAdapter } from '../adapters/registry.js';
import { config } from '../config.js';
import { sendNotification, parseNotificationConfig } from './notification-service.js';

// ─── Zod schemas ─────────────────────────────────────────────

export const createOrderSchema = z.object({
  productId: z.string().uuid(),
  playerName: z.string().min(1).max(50),
  email: z.string().email().optional(),
  consent: z.literal(true, { errorMap: () => ({ message: 'Необходимо согласие на обработку персональных данных' }) }),
  couponCode: z.string().max(20).transform((s) => s.toUpperCase()).optional(),
  upgrade: z.boolean().optional(),
  provider: z.string().min(1).max(50).optional(),
});

export const checkUpgradeSchema = z.object({
  playerName: z.string().min(1).max(50),
});

export const validateCouponSchema = z.object({
  code: z.string().min(3).max(20).transform((s) => s.toUpperCase()),
});

export const topDonatorsQuerySchema = z.object({
  period: z.enum(['week', 'month', 'all']).optional().default('month'),
  limit: z.coerce.number().int().min(1).max(20).optional().default(10),
  metric: z.enum(['paid', 'earned']).optional().default('earned'),
});

// ─── Pure helpers ────────────────────────────────────────────

export function applyDiscount(price: number, discountType: string, discountValue: number): number {
  if (discountType === 'percentage') {
    return +(price * (1 - discountValue / 100)).toFixed(2);
  }
  return +Math.max(0, price - discountValue).toFixed(2);
}

export async function validateCoupon(code: string, serverId: string) {
  const coupon = await prisma.coupon.findUnique({
    where: { serverId_code: { serverId, code } },
  });

  if (!coupon) return { valid: false as const, error: 'Coupon not found' };
  if (!coupon.isActive) return { valid: false as const, error: 'Coupon is inactive' };
  if (coupon.expiresAt && coupon.expiresAt < new Date()) return { valid: false as const, error: 'Coupon has expired' };
  if (coupon.usageLimit !== null && coupon.usedCount >= coupon.usageLimit)
    return { valid: false as const, error: 'Coupon usage limit reached' };

  return { valid: true as const, discountType: coupon.discountType, discountValue: coupon.discountValue };
}

// ─── Resolve shop by host ────────────────────────────────────

export async function resolveShopByHost(
  host: string,
  ip: string,
): Promise<{ id: string; slug: string; paymentKeys: unknown } | null> {
  if (!host) return null;

  const settings = await prisma.platformSettings.findUnique({ where: { id: 'global' } });
  const platformDomain = settings?.platformDomain || 'example.com';

  const subdomainSuffix = `.${platformDomain}`;
  if (host.endsWith(subdomainSuffix) && host !== platformDomain) {
    const slug = host.slice(0, -subdomainSuffix.length);
    const server = await prisma.server.findUnique({
      where: { slug },
      select: { id: true, slug: true, paymentKeys: true },
    });
    if (server) return server;
  }

  const server = await prisma.server.findFirst({
    where: { customDomain: host },
    select: { id: true, slug: true, paymentKeys: true },
  });
  if (server) return server;

  return null;
}

// ─── GET /shop/resolve-host ──────────────────────────────────

export async function resolveHost(domain: string, hostHeader: string, ip: string) {
  let host = (domain || '').split(':')[0];

  if (!host) {
    const isLocalProxy = ip === '127.0.0.1' || ip === '::1' || ip === '::ffff:127.0.0.1';
    host = (isLocalProxy ? hostHeader : hostHeader).split(':')[0];
  }

  if (!host) return null;

  const settings = await prisma.platformSettings.findUnique({ where: { id: 'global' } });
  const platformDomain = settings?.platformDomain || 'example.com';

  const subdomainSuffix = `.${platformDomain}`;
  if (host.endsWith(subdomainSuffix) && host !== platformDomain) {
    const slug = host.slice(0, -subdomainSuffix.length);
    const server = await prisma.server.findUnique({
      where: { slug },
      select: { id: true, name: true, slug: true, gameType: true, ipAddress: true, blockedAt: true },
    });
    if (server && !server.blockedAt) return server;
  }

  const server = await prisma.server.findFirst({
    where: { customDomain: host, blockedAt: null },
    select: { id: true, name: true, slug: true, gameType: true, ipAddress: true },
  });
  if (server) return server;

  return null;
}

// ─── Plugin downloads per game type ────────────────────────

const PLUGIN_DOWNLOADS: Record<string, string | null> = {
  minecraft: '/uploads/plugins/minecraft.jar',
};

function getPluginDownloadUrl(gameType: string): string | null {
  return PLUGIN_DOWNLOADS[gameType] || null;
}

// ─── GET /shop/:slug ─────────────────────────────────────────

export async function getShopData(slug: string) {
  const cached = getCachedShop(slug);
  if (cached) {
    const adapter = getAdapter(cached.server.gameType || 'minecraft');
    const status = await adapter.getServerStatus(cached.server);
    return { ...cached, server: { ...cached.server, online: status.online, onlinePlayers: status.onlinePlayers, maxPlayers: status.maxPlayers } };
  }

  const serverData = await prisma.server.findUnique({
    where: { slug },
    select: {
      id: true, name: true, gameType: true, ipAddress: true, slug: true, blockedAt: true,
      logoUrl: true, coverUrl: true, primaryColor: true, template: true,
      upgradeEnabled: true, upgradeMaxDays: true, upgradeMaxDiscount: true, upgradeNoCoupon: true,
      showTopDonators: true, showRecentPurchases: true, planType: true,
      subscription: { select: { status: true } }, paymentKeys: true,
    },
  });
  if (!serverData || serverData.blockedAt) return null;

  const operatingMode = await getOperatingMode();
  if (operatingMode === 'self_employed' && serverData.planType === 'subscription' && serverData.subscription?.status !== 'active') {
    return null;
  }

  const { upgradeEnabled: serverUpgradeEnabled, planType: _planType, subscription: _subscription, ...server } = serverData;

  const settings = await prisma.platformSettings.findUnique({ where: { id: 'global' } });
  const platformDomain = settings?.platformDomain || 'example.com';

  const products = await prisma.product.findMany({
    where: { serverId: server.id, deletedAt: null },
    orderBy: { createdAt: 'asc' },
  });

  const enrichedProducts = products.map((p) => {
    const { removeCommand: _rc, command: _cmd, ...safeProduct } = p;
    return {
      ...safeProduct,
      soldOut: p.stock !== null && p.stock <= 0,
      upgradeAvailable: serverUpgradeEnabled && p.type === 'privilege',
    };
  });

  const adapter = getAdapter(serverData.gameType || 'minecraft');
  const status = await adapter.getServerStatus(serverData);

  const result = {
    server: {
      ...server,
      shopUrl: `https://${server.slug}.${platformDomain}`,
      pluginDownloadUrl: getPluginDownloadUrl(serverData.gameType || 'minecraft'),
      online: status.online, onlinePlayers: status.onlinePlayers, maxPlayers: status.maxPlayers,
    },
    products: enrichedProducts,
    upgradeEnabled: serverUpgradeEnabled,
    paymentMethods: getPaymentMethods(serverData.paymentKeys),
  };

  setCachedShop(slug, result);
  return result;
}

// ─── POST /shop/:slug/check-upgrade ─────────────────────────

export async function checkUpgrade(slug: string, playerName: string) {
  const server = await prisma.server.findUnique({
    where: { slug },
    select: { id: true, blockedAt: true, upgradeEnabled: true, upgradeMaxDays: true, upgradeMaxDiscount: true },
  });
  if (!server || server.blockedAt) return null;
  if (!server.upgradeEnabled) return { upgrades: [] as UpgradeEntry[] };

  const privileges = await prisma.product.findMany({
    where: { serverId: server.id, type: 'privilege' },
    select: { id: true, price: true },
  });

  const purchased = await getPurchasedPrivileges(prisma, playerName, server.id, server.upgradeMaxDays);

  const upgrades: UpgradeEntry[] = [];
  for (const priv of privileges) {
    const u = computeBestUpgrade(priv.id, Number(priv.price), purchased, server.upgradeMaxDiscount);
    if (u) upgrades.push(u);
  }

  return { upgrades };
}

// ─── POST /shop/:slug/validate-coupon ────────────────────────

export async function checkCoupon(slug: string, code: string) {
  const server = await prisma.server.findUnique({
    where: { slug },
    select: { id: true, blockedAt: true },
  });
  if (!server || server.blockedAt) return null;

  const result = await validateCoupon(code, server.id);
  if (!result.valid) return { valid: false, error: result.error };

  return { valid: true, discountType: result.discountType };
}

// ─── GET /shop/:slug/top-donators ────────────────────────────

export async function getTopDonators(slug: string, period: string, limit: number, metric: string) {
  const server = await prisma.server.findUnique({
    where: { slug },
    select: { id: true, blockedAt: true },
  });
  if (!server || server.blockedAt) return null;

  let dateFilter: Date | undefined;
  const now = new Date();
  if (period === 'week') dateFilter = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  else if (period === 'month') dateFilter = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

  const rawDonators = (await prisma.$queryRawUnsafe<Array<Record<string, unknown>>>(
    `SELECT playerName, COALESCE(SUM(totalAmount), 0) as totalAmount, COALESCE(SUM(ownerAmount), 0) as ownerAmount, COUNT(*) as orderCount
     FROM \`Order\`
     WHERE serverId = ? AND status IN (?, ?, ?) ${dateFilter ? `AND createdAt >= ?` : ''}
     GROUP BY playerName
     ORDER BY ${metric === 'earned' ? 'ownerAmount' : 'totalAmount'} DESC
     LIMIT ?`,
    server.id, OrderStatus.PAID, OrderStatus.DELIVERING, OrderStatus.DELIVERED,
    ...(dateFilter ? [dateFilter] : []),
    limit,
  )) as Array<{ playerName: string; totalAmount: number; ownerAmount: number; orderCount: bigint }>;

  return {
    donators: rawDonators.map((d) => ({
      playerName: d.playerName,
      totalAmount: Number(d.totalAmount),
      orderCount: Number(d.orderCount),
    })),
  };
}

// ─── POST /shop/:slug/order ──────────────────────────────────

export async function createOrder(slug: string, body: z.infer<typeof createOrderSchema>, req: { log: { error: (e: unknown, msg: string) => void } }) {
  const server = await prisma.server.findUnique({
    where: { slug },
    select: {
      id: true, name: true, blockedAt: true, planType: true,
      upgradeEnabled: true, upgradeMaxDays: true, upgradeMaxDiscount: true, upgradeNoCoupon: true,
      paymentKeys: true, notificationConfig: true,
    },
  });
  if (!server || server.blockedAt) throw new NotFoundError('Server not found');

  const product = await prisma.product.findFirst({
    where: { id: body.productId, serverId: server.id, deletedAt: null },
    select: { id: true, stock: true, type: true, price: true },
  });
  if (!product) throw new NotFoundError('Product not found');

  const isSubscription = server.planType === 'subscription';
  let stockProductId: string | undefined;

  const order = await prisma.$transaction(async (tx) => {
    const freshProduct = await tx.product.findUnique({
      where: { id: product.id },
      select: { id: true, stock: true, price: true, type: true },
    });
    if (!freshProduct) throw new Error('Товар не найден');

    if (freshProduct.stock !== null) {
      const stockResult = await tx.product.updateMany({
        where: { id: freshProduct.id, stock: { gt: 0 } },
        data: { stock: { decrement: 1 } },
      });
      if (stockResult.count === 0) throw new Error('Товар распродан');
      stockProductId = freshProduct.id;
    }

    let totalAmount = Number(freshProduct.price);
    let couponCode: string | null = null;

    if (body.upgrade) {
      if (!server.upgradeEnabled || freshProduct.type !== 'privilege') throw new Error('Доплата недоступна для этого товара');
      if (server.upgradeNoCoupon && body.couponCode) throw new Error('Промокоды запрещены при доплате');

      const purchased = await getPurchasedPrivileges(tx, body.playerName, server.id, server.upgradeMaxDays);
      const upgrade = computeBestUpgrade(freshProduct.id, Number(freshProduct.price), purchased, server.upgradeMaxDiscount);
      if (!upgrade) throw new Error('У вас нет подходящей привилегии для доплаты');
      const diff = upgrade.upgradePrice;
      if (diff <= 0) throw new Error('Ошибка расчёта доплаты');
      totalAmount = diff;
    }

    if (body.couponCode) {
      const coupon = await tx.coupon.findUnique({
        where: { serverId_code: { serverId: server.id, code: body.couponCode } },
      });
      if (!coupon) throw new Error('Промокод не найден');
      if (!coupon.isActive) throw new Error('Промокод неактивен');
      if (coupon.expiresAt && coupon.expiresAt < new Date()) throw new Error('Срок действия промокода истёк');
      if (coupon.usageLimit !== null && coupon.usedCount >= coupon.usageLimit) throw new Error('Лимит использования промокода исчерпан');

      const couponGuard: Record<string, unknown> = {};
      if (coupon.expiresAt) couponGuard.expiresAt = { gt: new Date() };
      if (coupon.usageLimit !== null) couponGuard.usedCount = { lt: coupon.usageLimit };

      const couponResult = await tx.coupon.updateMany({
        where: { serverId: server.id, code: coupon.code, isActive: true, ...couponGuard },
        data: { usedCount: { increment: 1 } },
      });
      if (couponResult.count === 0) throw new Error('Промокод больше недействителен');
      totalAmount = applyDiscount(totalAmount, coupon.discountType, Number(coupon.discountValue));
      couponCode = coupon.code;
    }

    if (totalAmount <= 0) throw new Error('Сумма заказа должна быть положительной');

    if (body.upgrade) {
      const existingUpgrade = await tx.order.findFirst({
        where: { serverId: server.id, playerName: body.playerName, upgrade: true, status: { in: [OrderStatus.PENDING, OrderStatus.PAID, OrderStatus.DELIVERING] } },
        select: { id: true },
      });
      if (existingUpgrade) throw new Error('UPGRADE_CONFLICT');
    }

    let commissionPct = 0, commissionAmt = 0, ownerAmount = 0;
    if (!isSubscription) {
      const settings = await tx.platformSettings.findUnique({ where: { id: 'global' } });
      commissionPct = settings?.defaultCommissionPct ?? 10.0;
      const result = calculateCommission(Number(totalAmount), commissionPct);
      commissionAmt = result.commissionAmt;
      ownerAmount = result.ownerAmount;
    }

    return tx.order.create({
      data: {
        playerName: body.playerName, email: body.email, consent: body.consent,
        productId: body.productId, serverId: server.id, status: OrderStatus.PENDING,
        totalAmount, commissionPct, commissionAmt, ownerAmount,
        couponCode, upgrade: body.upgrade ?? false, paymentProvider: body.provider,
        planTypeAtCreation: server.planType,
      },
    });
  });

  if (stockProductId) {
    const updatedProduct = await prisma.product.findUnique({
      where: { id: stockProductId },
      select: { stock: true, name: true },
    });
    if (updatedProduct && updatedProduct.stock !== null && updatedProduct.stock <= 0) {
      const ncfg = parseNotificationConfig(server.notificationConfig);
      sendNotification(ncfg, 'stock.empty', { 'Товар': updatedProduct.name }, server.name)
        .catch((e: unknown) => { req.log.error(e, 'Notification failed: stock empty'); });
    }
  }

  const pcfg = await getPlatformConfig();
  const gateway = getGatewayForServer({ keys: server.paymentKeys, slug, requireKeys: isSubscription, provider: body.provider });
  const paymentResult = await gateway.createPayment({
    amount: Number(order.totalAmount), currency: 'RUB',
    description: `Покупка на сервере ${server.name}`,
    metadata: { orderId: order.id, serverId: server.id, type: 'order', slug },
    returnUrl: `${pcfg.platformUrl}/shop/${slug}?order=${order.id}`,
  });

  invalidateShopCache(slug);

  return { orderId: order.id, paymentUrl: paymentResult.paymentUrl };
}

// ─── Shop payment webhook ────────────────────────────────────

export async function processShopWebhook(
  body: Record<string, unknown>,
  signature: string,
  slug: string,
  paymentKeys: unknown,
  req: { log: { warn: (o: Record<string, unknown>, msg: string) => void; error: (o: Record<string, unknown>, msg: string) => void } },
) {
  const keysList = Array.isArray(paymentKeys) ? (paymentKeys as Array<Record<string, unknown>>) : [];
  const merchantId = body.merchant_id as string | undefined;
  const basicMatch = signature.match(/^Basic\s+(.+)$/i);
  const isEnotSignature = !!(body as Record<string, unknown>)['x-api-sha256-signature'] as unknown as string;
  const isYooMoneyNotification = !!(body.notification_type && body.operation_id);

  let entry: Record<string, unknown> | null = null;
  if (merchantId) {
    entry = keysList.find((k) => k.provider === 'anypay' && k.publicKey === merchantId && k.enabled !== false) || null;
  }
  if (!entry && basicMatch) {
    try {
      const decoded = Buffer.from(basicMatch[1], 'base64').toString('utf-8');
      const shopId = decoded.split(':')[0];
      entry = keysList.find((k) => k.provider === 'yookassa' && k.publicKey === shopId && k.enabled !== false) || null;
    } catch (e) {
      req.log.warn({ error: String(e) }, 'Shop webhook: failed to decode Basic auth');
    }
  }
  if (!entry && isEnotSignature) {
    entry = keysList.find((k) => k.provider === 'enot' && k.enabled !== false) || null;
  }
  if (!entry && isYooMoneyNotification) {
    entry = keysList.find((k) => k.provider === 'yoomoney' && k.enabled !== false) || null;
  }
  if (!entry || !entry.secret) return null;

  let gateway: AnyPayGateway | YooKassaGateway | EnotGateway | YooMoneyGateway;
  if (entry.provider === 'anypay') {
    gateway = new AnyPayGateway({ merchantId: (entry.publicKey as string) || '', secretKey: decryptSecret(entry.secret as string) });
  } else if (entry.provider === 'yookassa') {
    gateway = new YooKassaGateway({ shopId: (entry.publicKey as string) || '', secretKey: decryptSecret(entry.secret as string), webhookSecret: config.paymentWebhookSecret });
  } else if (entry.provider === 'enot') {
    gateway = new EnotGateway({ shopId: (entry.publicKey as string) || '', apiKey: decryptSecret(entry.secret as string), webhookSecret: ((entry.extra as Record<string, string> | undefined)?.webhookSecret) || '' });
  } else if (entry.provider === 'yoomoney') {
    gateway = new YooMoneyGateway({ receiver: (entry.publicKey as string) || '', secretKey: decryptSecret(entry.secret as string) });
  } else {
    return null;
  }

  const result = await gateway.verifyWebhook(body, signature);
  if (!result.valid) {
    req.log.warn({ slug, gateway: gateway.getGatewayName() }, 'Shop webhook: signature verification failed');
    return null;
  }

  const webhookResultSchema = z.object({
    valid: z.literal(true), transactionId: z.string().min(1),
    status: z.enum(['completed', 'failed', 'pending']), amount: z.number().positive().optional(),
    metadata: z.object({ type: z.enum(['deposit', 'subscription', 'order']), depositId: z.string().optional(), serverId: z.string().optional(), orderId: z.string().optional(), userId: z.string().optional() }),
  });
  const resultParsed = webhookResultSchema.safeParse(result);
  if (!resultParsed.success) return null;

  const { metadata, status } = resultParsed.data;
  if (status !== 'completed' || metadata.type !== 'order') return { gatewayName: gateway.getGatewayName() };

  const orderId = metadata.orderId as string;
  let orderServerId: string | null = null;

  await prisma.$transaction(async (tx) => {
    const order = await tx.order.findUnique({
      where: { id: orderId },
      include: { server: { select: { rconHost: true, rconPassword: true } } },
    });
    if (!order || order.status !== OrderStatus.PENDING) return;

    if (result.amount !== undefined && Number(result.amount) !== Number(order.totalAmount)) {
      req.log.error({ webhookAmount: result.amount, expected: order.totalAmount }, 'Shop webhook: amount mismatch');
      throw new Error('AMOUNT_MISMATCH');
    }

    const updated = await tx.order.updateMany({
      where: { id: orderId, status: OrderStatus.PENDING },
      data: { status: OrderStatus.PAID, paymentProvider: gateway.getGatewayName() },
    });
    if (updated.count === 0) return;

    if (order.planTypeAtCreation !== 'subscription') {
      const wallet = await tx.wallet.findUnique({ where: { serverId: order.serverId } });
      if (wallet) {
        await tx.wallet.update({ where: { id: wallet.id }, data: { balance: { increment: Number(order.ownerAmount) }, totalEarned: { increment: Number(order.ownerAmount) } } });
        await tx.transaction.create({ data: { walletId: wallet.id, amount: order.ownerAmount, type: 'order_commission', orderId: order.id, note: `Заказ #${order.id.slice(0, 8)} от ${order.playerName}${order.couponCode ? ` (промокод: ${order.couponCode})` : ''}` } });
      }
    }
    orderServerId = order.serverId;
  });

  if (orderServerId) {
    const sv = await prisma.server.findUnique({
      where: { id: orderServerId },
      select: { gameType: true, rconHost: true, rconPort: true, rconPassword: true, notificationConfig: true, name: true },
    });
    const adapter = getAdapter(sv?.gameType || 'minecraft');
    if (sv && adapter.isDeliverable(sv)) {
      adapter.deliverOrder(orderId, orderServerId).then((res) => {
        if (!res.ok) req.log.warn({ orderId, error: res.error }, 'Shop webhook: delivery failed');
      }).catch((e: unknown) => { req.log.error({ orderId, err: e }, 'Shop webhook: delivery threw'); });
    }
    const ncfg = parseNotificationConfig(sv?.notificationConfig);
    const orderInfo = await prisma.order.findUnique({
      where: { id: orderId },
      select: { totalAmount: true, playerName: true, product: { select: { name: true } } },
    });
    if (orderInfo) {
      sendNotification(ncfg, 'order.paid', {
        'Заказ': `#${orderId.slice(0, 8)}`, 'Игрок': orderInfo.playerName || '—',
        'Сумма': `${Number(orderInfo.totalAmount).toFixed(2)} ₽`, 'Товар': orderInfo.product?.name || '—',
      }, sv?.name || '').catch((e: unknown) => { req.log.warn({ orderId, err: e }, 'Shop webhook: notification failed'); });
    }
  }

  return { gatewayName: gateway.getGatewayName() };
}

// ─── Error types ─────────────────────────────────────────────

export class NotFoundError extends Error {
  constructor(msg: string) { super(msg); this.name = 'NotFoundError'; }
}
