import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import prisma from '../plugins/prisma.js';
import {
  createOrderSchema,
  checkUpgradeSchema,
  validateCouponSchema,
  topDonatorsQuerySchema,
  getShopData,
  resolveHost,
  checkUpgrade,
  checkCoupon,
  getTopDonators,
  createOrder,
  processShopWebhook,
  resolveShopByHost,
  NotFoundError,
} from '../services/shop-service.js';
import { getPlatformConfig } from '../lib/platform-settings.js';
import { getCachedShop } from '../plugins/cache.js';

export default async function shopRoutes(app: FastifyInstance) {
  app.get('/api/shop/resolve-host', { schema: { tags: ['shop'] } }, async (req, reply) => {
    const domain = (req.query as { domain?: string }).domain;
    const hostHeader = (req.headers['x-forwarded-host'] as string) || (req.headers.host as string) || '';
    const result = await resolveHost(domain || '', hostHeader, req.ip);
    if (!result) return reply.status(400).send({ error: 'Host header missing' });
    return result;
  });

  app.get('/api/shop/:slug', { schema: { tags: ['shop'] } }, async (req, reply) => {
    const { slug } = req.params as { slug: string };
    const result = await getShopData(slug);
    if (!result) return reply.status(404).send({ error: 'Server not found' });
    return result;
  });

  app.post('/api/shop/:slug/check-upgrade', { config: { rateLimit: { max: 10, timeWindow: '1 minute' } }, schema: { tags: ['shop'] } }, async (req, reply) => {
    const { slug } = req.params as { slug: string };
    const parsed = checkUpgradeSchema.safeParse(req.body);
    if (!parsed.success) return reply.status(400).send({ error: parsed.error.flatten() });

    const result = await checkUpgrade(slug, parsed.data.playerName);
    if (result === null) return reply.status(404).send({ error: 'Server not found' });
    return result;
  });

  app.post('/api/shop/:slug/validate-coupon', { config: { rateLimit: { max: 5, timeWindow: '1 minute' } }, schema: { tags: ['shop'] } }, async (req, reply) => {
    const { slug } = req.params as { slug: string };
    const parsed = validateCouponSchema.safeParse(req.body);
    if (!parsed.success) return reply.status(400).send({ error: parsed.error.flatten() });

    const result = await checkCoupon(slug, parsed.data.code);
    if (result === null) return reply.status(404).send({ error: 'Server not found' });
    return result;
  });

  app.get('/api/shop/:slug/top-donators', { schema: { tags: ['shop'] } }, async (req, reply) => {
    const { slug } = req.params as { slug: string };
    const query = topDonatorsQuerySchema.parse(req.query);
    const result = await getTopDonators(slug, query.period, query.limit, query.metric);
    if (result === null) return reply.status(404).send({ error: 'Server not found' });
    return result;
  });

  app.get('/api/shop/:slug/order/:orderId', { schema: { tags: ['shop'] } }, async (req, reply) => {
    const { slug, orderId } = req.params as { slug: string; orderId: string };
    const shop = getCachedShop(slug) || await getShopData(slug);
    if (!shop) return reply.status(404).send({ error: 'Shop not found' });

    const order = await prisma.order.findFirst({
      where: { id: orderId, serverId: shop.server.id },
      select: { id: true, status: true, totalAmount: true, product: { select: { name: true } } },
    });
    if (!order) return reply.status(404).send({ error: 'Order not found' });
    return order;
  });

  app.post('/api/shop/:slug/order', { config: { rateLimit: { max: 10, timeWindow: '1 minute' } }, schema: { tags: ['shop'] } }, async (req, reply) => {
    const { slug } = req.params as { slug: string };
    const parsed = createOrderSchema.safeParse(req.body);
    if (!parsed.success) return reply.status(400).send({ error: parsed.error.flatten() });

    try {
      return await createOrder(slug, parsed.data, req);
    } catch (err) {
      if (err instanceof NotFoundError) return reply.status(404).send({ error: err.message });
      if (err instanceof Error && err.message === 'UPGRADE_CONFLICT') return reply.status(409).send({ error: 'У вас уже есть ожидающий доставки заказ на доплату' });
      if (err instanceof Error && err.message.includes('не настроил платёжные ключи')) return reply.status(400).send({ error: err.message });
      throw err;
    }
  });

  // ─── Shop payment webhook ──────────────────────────

  app.post('/api/shop/payment-webhook', { config: { rateLimit: { max: 15, timeWindow: '1 minute' } }, schema: { tags: ['shop'], hide: true } }, async (req: FastifyRequest, reply: FastifyReply) => {
    const pcfg = await getPlatformConfig();
    const webhookIps = pcfg.paymentWebhookIps;
    if (webhookIps.length > 0) {
      const ip = req.ip?.startsWith('::ffff:') ? req.ip.slice(7) : req.ip;
      if (ip && !webhookIps.includes(ip)) {
        req.log.warn({ ip, webhookIps }, 'Shop webhook: IP not in allowlist');
        return reply.status(403).send({ error: 'Forbidden' });
      }
    }

    const body = (req.body as Record<string, unknown>) || {};
    const signature = (req.headers['authorization'] as string) || (req.headers['x-signature'] as string) ||
      (req.headers['x-api-sha256-signature'] as string) || (body.signature as string) || '';

    const shop = await resolveShopByHost(
      ((req.headers['x-forwarded-host'] as string) || (req.headers.host as string) || '').split(':')[0],
      req.ip,
    );
    if (!shop) {
      req.log.warn({ host: req.headers.host }, 'Shop webhook: shop not found by host');
      return reply.status(404).send({ error: 'Shop not found' });
    }

    const result = await processShopWebhook(body, signature, shop.slug, shop.paymentKeys, req);
    if (result === null) return reply.status(400).send({ error: 'Invalid webhook' });

    if (result.gatewayName === 'anypay') return reply.type('text/plain').send('OK');
    return { received: true };
  });
}
