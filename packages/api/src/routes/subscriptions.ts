import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import prisma from '../plugins/prisma.js';
import { getGatewayForProvider } from '../services/payment/index.js';
import { getPlatformConfig } from '../lib/platform-settings.js';

const SUBSCRIPTION_DAYS = 30;

export default async function subscriptionRoutes(app: FastifyInstance) {
  app.post(
    '/api/subscriptions/renew',
    { preHandler: [app.authenticate], config: { rateLimit: { max: 5, timeWindow: '1 minute' } }, schema: { tags: ['subscriptions'] } },
    async (req, reply) => {
      const { id: userId } = req.user;

      const schema = z.object({
        serverId: z.string().uuid(),
        provider: z.string().optional(),
      });
      const parsed = schema.safeParse(req.body);
      if (!parsed.success) return reply.status(400).send({ error: parsed.error.flatten() });

      const server = await prisma.server.findUnique({
        where: { id: parsed.data.serverId, ownerId: userId },
        select: {
          id: true,
          planType: true,
          ownerId: true,
          subscription: { select: { id: true, status: true, price: true, expiresAt: true, chargedFrom: true } },
        },
      });
      if (!server) return reply.status(404).send({ error: 'Server not found' });
      if (server.planType !== 'subscription') {
        return reply.status(400).send({ error: 'Сервер не использует подписочную модель' });
      }

      const settings = await prisma.platformSettings.findUnique({ where: { id: 'global' } });

      const isActivePaidSub = !!(server.subscription?.chargedFrom) && server.subscription?.status === 'active';
      const amount = isActivePaidSub
        ? Number(server.subscription!.price)
        : (settings ? Number(settings.subscriptionPrice) : 9.99);

      if (amount === 0) {
        const now = new Date();
        const newExpiresAt = new Date(now.getTime() + SUBSCRIPTION_DAYS * 24 * 60 * 60 * 1000);

        if (server.subscription) {
          await prisma.subscription.update({
            where: { id: server.subscription.id },
            data: { status: 'active', expiresAt: newExpiresAt, price: 0, chargedFrom: null },
          });
        } else {
          await prisma.subscription.create({
            data: {
              serverId: server.id,
              status: 'active',
              price: 0,
              expiresAt: newExpiresAt,
              chargedFrom: null,
            },
          });
        }

        await prisma.auditLog.create({
          data: {
            action: 'subscription_renew',
            targetId: server.id,
            amount: 0,
            userId,
            ipAddress: null,
            metadata: { free: true },
          },
        });

        return { free: true };
      }

      const pcfg = await getPlatformConfig();
      const gateway = parsed.data.provider
        ? getGatewayForProvider(parsed.data.provider, pcfg)
        : (await import('../services/payment/index.js')).createGatewayFromConfig(pcfg);
      const result = await gateway.createPayment({
        amount,
        currency: 'RUB',
        description: `Оплата подписки — ${amount.toFixed(2)}₽`,
        metadata: {
          serverId: server.id,
          userId,
          type: 'subscription',
        },
        returnUrl: `${pcfg.platformUrl}/dashboard/${server.id}?payment=success`,
      });

      return { paymentUrl: result.paymentUrl, transactionId: result.transactionId, provider: gateway.getGatewayName() };
    },
  );
}
