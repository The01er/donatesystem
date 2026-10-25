import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { z } from 'zod';
import prisma from '../plugins/prisma.js';
import { createGatewayFromConfig, getGlobalPaymentMethods } from '../services/payment/index.js';
import { MockPaymentGateway } from '../services/payment/mock.js';
import { getPlatformConfig } from '../lib/platform-settings.js';
import { OrderStatus } from '../constants/order-status.js';
import { getAdapter } from '../adapters/registry.js';
import { sendNotification, parseNotificationConfig } from '../services/notification-service.js';

function isMockConfirmAllowed(): boolean {
  return process.env.NODE_ENV !== 'production';
}

function normalizeIp(ip: string | undefined): string | null {
  if (!ip) return null;
  if (ip.startsWith('::ffff:')) return ip.slice(7);
  return ip;
}

async function webhookIpAllowlist(req: FastifyRequest, reply: FastifyReply) {
  const pcfg = await getPlatformConfig();
  const allowlist = pcfg.paymentWebhookIps;
  if (allowlist.length === 0) return;
  const ip = normalizeIp(req.ip);
  if (!ip) return reply.status(403).send({ error: 'Forbidden' });
  const allowed = allowlist.some((entry) => {
    const idx = entry.indexOf('/');
    if (idx !== -1) {
      const [rangeIp, bitsStr] = [entry.slice(0, idx), parseInt(entry.slice(idx + 1), 10)];
      if (isNaN(bitsStr) || bitsStr < 0 || bitsStr > 32) return false;
      const ipNum = ip.split('.').reduce((acc, oct) => (acc << 8) + parseInt(oct, 10), 0);
      const rangeNum = rangeIp.split('.').reduce((acc, oct) => (acc << 8) + parseInt(oct, 10), 0);
      const mask = bitsStr === 0 ? 0 : ~0 << (32 - bitsStr);
      return (ipNum & mask) === (rangeNum & mask);
    }
    return entry === ip;
  });
  if (!allowed) {
    req.log.warn({ ip, allowlist }, 'Webhook rejected: IP not in allowlist');
    return reply.status(403).send({ error: 'Forbidden' });
  }
}

async function webhookHandler(req: FastifyRequest, reply: FastifyReply) {
  const query = req.query as Record<string, string>;
  const body = (req.body as Record<string, unknown>) || {};

  const payload = (Object.keys(body).length > 0 ? body : query) as Record<string, unknown>;

  if ((query.mock_confirm || (payload as Record<string, string>)?.mock_confirm) && !isMockConfirmAllowed()) {
    req.log.warn('Webhook rejected: mock_confirm in production');
    return reply.status(400).send({ error: 'Invalid webhook' });
  }

  const signature =
    (req.headers['authorization'] as string) ||
    (req.headers['x-signature'] as string) ||
    (body.signature as string) ||
    '';

  // Detect provider from payload, fall back to global gateway
  const hasMockConfirm = !!(payload as Record<string, string>)?.mock_confirm;
  const gateway = hasMockConfirm ? new MockPaymentGateway() : createGatewayFromConfig(await getPlatformConfig());
  const result = await gateway.verifyWebhook(payload, signature);
  if (!result.valid) {
    req.log.warn({ gateway: gateway.getGatewayName() }, 'Webhook signature verification failed');
    return reply.status(400).send({ error: 'Invalid webhook' });
  }

  // Validate webhook result shape
  const webhookResultSchema = z.object({
    valid: z.literal(true),
    transactionId: z.string().min(1),
    status: z.enum(['completed', 'failed', 'pending']),
    amount: z.number().positive().optional(),
    metadata: z.object({
      type: z.enum(['deposit', 'subscription', 'order']),
      depositId: z.string().optional(),
      serverId: z.string().optional(),
      orderId: z.string().optional(),
      userId: z.string().optional(),
    }),
  });
  const resultParsed = webhookResultSchema.safeParse(result);
  if (!resultParsed.success) {
    req.log.error({ errors: resultParsed.error.issues }, 'Webhook result validation failed');
    return reply.status(400).send({ error: 'Invalid webhook payload' });
  }
  const { metadata, status } = resultParsed.data;

  if (status === 'failed') {
    if (metadata.type === 'deposit') {
      await prisma.deposit.updateMany({
        where: { id: metadata.depositId as string, status: 'pending' },
        data: { status: 'failed' as const },
      });
    }
    return sendOk(reply, gateway.getGatewayName());
  }

  if (status === 'pending') {
    return sendOk(reply, gateway.getGatewayName());
  }

  if (status === 'completed') {
    if (metadata.type === 'deposit') {
      const depositId = metadata.depositId as string;

      await prisma.$transaction(async (tx) => {
        const deposit = await tx.deposit.findUnique({ where: { id: depositId } });
        if (!deposit || deposit.status !== 'pending') return;

        if (result.amount !== undefined && Number(result.amount) !== Number(deposit.amount)) {
          req.log.error({ webhookAmount: result.amount, expected: deposit.amount }, 'Webhook deposit amount mismatch');
          throw new Error('AMOUNT_MISMATCH');
        }

        const updated = await tx.deposit.updateMany({
          where: { id: depositId, status: 'pending' },
          data: { status: 'completed' as const, transactionId: result.transactionId },
        });
        if (updated.count === 0) return;

        await tx.user.update({
          where: { id: deposit.userId },
          data: { balance: { increment: deposit.amount } },
        });
      });
    } else if (metadata.type === 'subscription') {
      const serverId = metadata.serverId as string;
      let userId = metadata.userId as string | undefined;
      if (!userId) {
        const owner = await prisma.server.findUnique({ where: { id: serverId }, select: { ownerId: true } });
        userId = owner?.ownerId;
      }
      await prisma.$transaction(async (tx) => {
        const now = new Date();
        const newExpiresAt = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

        const sub = await tx.subscription.findUnique({
          where: { serverId },
          select: { id: true, status: true, expiresAt: true, price: true },
        });

        if (!sub || (sub.status !== 'active' && sub.status !== 'expired')) {
          req.log.warn({ serverId }, 'Webhook for inactive subscription — skipping');
          return;
        }

        if (result.amount !== undefined && Number(result.amount) !== Number(sub.price)) {
          req.log.error({ webhookAmount: result.amount, expected: sub.price }, 'Webhook subscription amount mismatch');
          throw new Error('AMOUNT_MISMATCH');
        }

        await tx.subscription.updateMany({
          where: { id: sub.id },
          data: {
            status: 'active',
            expiresAt: newExpiresAt,
            chargedFrom: 'payment',
            transactionId: result.transactionId,
          },
        });

        await tx.auditLog.create({
          data: {
            action: 'subscription_renew',
            targetId: serverId,
            amount: result.amount ?? 0,
            userId,
            ipAddress: null,
            metadata: { transactionId: result.transactionId },
          },
        });
      });
      const subServer = await prisma.server.findUnique({
        where: { id: serverId },
        select: { notificationConfig: true, name: true },
      });
      if (subServer) {
        const ncfg = parseNotificationConfig(subServer.notificationConfig);
        sendNotification(ncfg, 'subscription', {
          'Действие': 'Подписка продлена на 30 дней',
          'Сумма': `${(result.amount ?? 0).toFixed(2)} ₽`,
        }, subServer.name).catch((e: unknown) => { req.log.error(e, 'Notification failed: subscription renew'); });
      }
    } else if (metadata.type === 'order') {
      const orderId = metadata.orderId as string;
      if (!orderId) {
        req.log.warn({ metadata }, 'Webhook: order type missing orderId');
        return;
      }
      let orderServerId: string | null = null;
      await prisma.$transaction(async (tx) => {
        const order = await tx.order.findUnique({
          where: { id: orderId },
          include: { server: { select: { rconHost: true, rconPassword: true } } },
        });
        if (!order || order.status !== OrderStatus.PENDING) {
          if (order) {
            req.log.warn(
              {
                orderId,
                currentStatus: order.status,
                orderCreatedAt: order.createdAt,
              },
              'Webhook for non-pending order — possible race with cleanup',
            );
          }
          return;
        }

        if (result.amount !== undefined && Number(result.amount) !== Number(order.totalAmount)) {
          req.log.error({ webhookAmount: result.amount, expected: order.totalAmount }, 'Webhook order amount mismatch');
          throw new Error('AMOUNT_MISMATCH');
        }

        const updated = await tx.order.updateMany({
          where: { id: orderId, status: OrderStatus.PENDING },
          data: { status: OrderStatus.PAID, paymentProvider: gateway.getGatewayName() },
        });
        if (updated.count === 0) {
          req.log.warn({ orderId }, 'Order already transitioned from PENDING — race with cleanup');
          return;
        }

        if (order.planTypeAtCreation !== 'subscription') {
          const wallet = await tx.wallet.findUnique({ where: { serverId: order.serverId } });
          if (wallet) {
            await tx.wallet.update({
              where: { id: wallet.id },
              data: {
                balance: { increment: Number(order.ownerAmount) },
                totalEarned: { increment: Number(order.ownerAmount) },
              },
            });
            await tx.transaction.create({
              data: {
                walletId: wallet.id,
                amount: order.ownerAmount,
                type: 'order_commission',
                orderId: order.id,
                note: `Заказ #${order.id.slice(0, 8)} от ${order.playerName}${order.couponCode ? ` (промокод: ${order.couponCode})` : ''}`,
              },
            });
          }
        }
        orderServerId = order.serverId;
      });

      if (orderServerId) {
        const server = await prisma.server.findUnique({
          where: { id: orderServerId },
          select: { gameType: true, rconHost: true, rconPort: true, rconPassword: true, notificationConfig: true, name: true },
        });

        const adapter = getAdapter(server?.gameType || 'minecraft');
        const ncfg = parseNotificationConfig(server?.notificationConfig);
        const orderInfo = await prisma.order.findUnique({
          where: { id: orderId },
          select: { totalAmount: true, playerName: true, product: { select: { name: true } } },
        });
        if (orderInfo) {
          sendNotification(ncfg, 'order.paid', {
            'Заказ': `#${orderId.slice(0, 8)}`,
            'Игрок': orderInfo.playerName || '—',
            'Сумма': `${Number(orderInfo.totalAmount).toFixed(2)} ₽`,
            'Товар': orderInfo.product?.name || '—',
          }, server?.name || '').catch((e: unknown) => {
            req.log.warn({ orderId, err: e }, 'Notification failed');
          });
        }

        if (server && adapter.isDeliverable(server)) {
          adapter.deliverOrder(orderId, orderServerId).then((res) => {
            if (!res.ok) {
              req.log.warn({ orderId, error: res.error }, 'Delivery failed for order');
            }
          }).catch((e: unknown) => {
            req.log.error({ orderId, err: e }, 'Delivery threw');
          });
        }
      }
    }
  }

  return sendOk(reply, gateway.getGatewayName());
}

function sendOk(reply: FastifyReply, gatewayName: string) {
  if (gatewayName === 'anypay') {
    return reply.type('text/plain').send('OK');
  }
  return { received: true };
}

export default async function paymentRoutes(app: FastifyInstance) {
  app.get(
    '/api/payment/methods',
    { schema: { tags: ['payment'] } },
    async () => {
      const pcfg = await getPlatformConfig();
      return { methods: getGlobalPaymentMethods(pcfg) };
    },
  );

  app.post(
    '/api/payment/webhook',
    {
      config: { rateLimit: { max: 15, timeWindow: '1 minute' } },
      preHandler: [webhookIpAllowlist],
      schema: { tags: ['payment'], hide: true },
    },
    webhookHandler,
  );

  // Dev-only: mock gateway redirects via GET (window.location.href)
  app.get(
    '/api/payment/webhook',
    {
      config: { rateLimit: { max: 15, timeWindow: '1 minute' } },
      schema: { tags: ['payment'], hide: true },
    },
    async (req, reply) => {
      const query = req.query as Record<string, string>;
      if (!query.mock_confirm) {
        return reply.status(404).send({ error: 'Not found' });
      }
      return webhookHandler(req, reply);
    },
  );
}
