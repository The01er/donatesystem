import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import prisma from '../plugins/prisma.js';
import { getGatewayForProvider } from '../services/payment/index.js';
import { RouteParams } from '../validators/common.js';
import { getServerMemberRole } from '../services/helpers.js';
import { getPlatformConfig } from '../lib/platform-settings.js';
import { getOperatingMode } from '../lib/platform-settings.js';
import { OrderStatus } from '../constants/order-status.js';

const withdrawSchema = z.object({
  amount: z.number().positive(),
  method: z.enum(['card', 'sbp', 'crypto']),
  destination: z.string().min(1).max(200),
});

const depositSchema = z.object({
  amount: z.number().min(100).max(50000),
  method: z.enum(['card', 'yoomoney']),
  provider: z.string().optional(),
});

const depositQuerySchema = z.object({
  page: z.coerce.number().int().min(1).optional().default(1),
  limit: z.coerce.number().int().min(1).max(50).optional().default(20),
});

const transactionsQuerySchema = depositQuerySchema;

export default async function walletRoutes(app: FastifyInstance) {
  // ─── Wallet ───────────────────────────────────────────────

  app.get(
    '/api/servers/:id/wallet',
    { preHandler: [app.authenticate], schema: { tags: ['wallet'] } },
    async (req, reply) => {
      const { id: userId } = req.user;
      const { id: serverId } = req.params as RouteParams;

      const wallet = await prisma.wallet.findUnique({
        where: { serverId },
        include: { server: { select: { ownerId: true, name: true } } },
      });

      if (!wallet) return reply.status(404).send({ error: 'Wallet not found' });

      const role = await getServerMemberRole(userId, serverId);
      if (wallet.server.ownerId !== userId && !role) {
        return reply.status(403).send({ error: 'Access denied' });
      }

      const [pendingWithdrawals, earnedSum] = await Promise.all([
        prisma.withdrawalRequest.aggregate({
          where: { walletId: wallet.id, status: 'pending' },
          _sum: { amount: true },
        }),
        prisma.order.aggregate({
          where: { serverId, status: { in: [OrderStatus.PAID, OrderStatus.DELIVERED] } },
          _sum: { ownerAmount: true },
        }),
      ]);

      const pendingAmount = pendingWithdrawals._sum?.amount ?? 0;
      const balance = Number(wallet.balance);

      return {
        id: wallet.id,
        balance: wallet.balance,
        totalEarned: earnedSum._sum?.ownerAmount ?? 0,
        pendingAmount,
        availableBalance: balance - Number(pendingAmount),
        serverId: wallet.serverId,
      };
    },
  );

  // ─── Transactions ─────────────────────────────────────────

  app.get(
    '/api/servers/:id/transactions',
    { preHandler: [app.authenticate], schema: { tags: ['wallet'] } },
    async (req, reply) => {
      const { id: userId } = req.user;
      const { id: serverId } = req.params as RouteParams;

      const query = transactionsQuerySchema.parse(req.query);
      const page = query.page;
      const limit = query.limit;
      const skip = (page - 1) * limit;

      const wallet = await prisma.wallet.findUnique({ where: { serverId } });
      if (!wallet) return reply.status(404).send({ error: 'Wallet not found' });

      const role = await getServerMemberRole(userId, serverId);
      if (!role) {
        const server = await prisma.server.findUnique({ where: { id: serverId }, select: { ownerId: true } });
        if (server?.ownerId !== userId) return reply.status(403).send({ error: 'Access denied' });
      }

      const [transactions, total] = await Promise.all([
        prisma.transaction.findMany({
          where: { walletId: wallet.id },
          orderBy: { createdAt: 'desc' },
          skip,
          take: limit,
        }),
        prisma.transaction.count({ where: { walletId: wallet.id } }),
      ]);

      return {
        transactions,
        pagination: { page, limit, total, pages: Math.ceil(total / limit) },
      };
    },
  );

  // ─── Withdraw ─────────────────────────────────────────────

  app.post(
    '/api/servers/:id/withdraw',
    { preHandler: [app.authenticate], config: { rateLimit: { max: 5, timeWindow: '1 minute' } }, schema: { tags: ['wallet'] } },
    async (req, reply) => {
      const { id: userId } = req.user;
      const { id: serverId } = req.params as RouteParams;

      const parsed = withdrawSchema.safeParse(req.body);
      if (!parsed.success) {
        return reply.status(400).send({ error: parsed.error.flatten() });
      }

      const role = await getServerMemberRole(userId, serverId);
      const server = await prisma.server.findUnique({
        where: { id: serverId },
        select: { ownerId: true, planType: true },
      });
      if (server?.ownerId !== userId && role !== 'admin') {
        return reply.status(403).send({ error: 'Access denied' });
      }

      if (server?.planType === 'subscription') {
        return reply
          .status(403)
          .send({ error: 'Вывод средств недоступен при подписочной модели. Переключитесь на комиссионную.' });
      }

      const wallet = await prisma.wallet.findUnique({ where: { serverId } });
      if (!wallet) return reply.status(404).send({ error: 'Wallet not found' });

      const pendingSum = await prisma.withdrawalRequest.aggregate({
        where: { walletId: wallet.id, status: 'pending' },
        _sum: { amount: true },
      });
      const pendingAmount = Number(pendingSum._sum?.amount ?? 0);
      const availableBalance = Number(wallet.balance) - pendingAmount;

      if (availableBalance < parsed.data.amount) {
        return reply.status(400).send({
          error: `Недостаточно доступных средств. В обработке: ${pendingAmount}₽. Доступно: ${availableBalance}₽`,
        });
      }

      const withdrawal = await prisma.$transaction(async (tx) => {
        const w = await tx.wallet.findUnique({ where: { serverId } });
        if (!w) throw new Error('Wallet not found');

        const ps = await tx.withdrawalRequest.aggregate({
          where: { walletId: w.id, status: 'pending' },
          _sum: { amount: true },
        });
        if (Number(w.balance) - Number(ps._sum?.amount ?? 0) < parsed.data.amount) {
          throw new Error('Insufficient balance');
        }

        return tx.withdrawalRequest.create({
          data: {
            walletId: w.id,
            serverId,
            amount: parsed.data.amount,
            method: parsed.data.method,
            destination: parsed.data.destination,
          },
        });
      });

      return {
        ...withdrawal,
        availableBalance: null,
      };
    },
  );

  // ─── Withdrawal history ───────────────────────────────────

  app.get(
    '/api/servers/:id/withdrawals',
    { preHandler: [app.authenticate], schema: { tags: ['wallet'] } },
    async (req, reply) => {
      const { id: userId } = req.user;
      const { id: serverId } = req.params as RouteParams;

      const wallet = await prisma.wallet.findUnique({ where: { serverId } });
      if (!wallet) return reply.status(404).send({ error: 'Wallet not found' });

      const role = await getServerMemberRole(userId, serverId);
      if (!role) {
        const server = await prisma.server.findUnique({ where: { id: serverId }, select: { ownerId: true } });
        if (server?.ownerId !== userId) return reply.status(403).send({ error: 'Access denied' });
      }

      return prisma.withdrawalRequest.findMany({
        where: { walletId: wallet.id },
        orderBy: { createdAt: 'desc' },
        take: 50,
      });
    },
  );

  // ─── User personal balance ────────────────────────────────

  app.get('/api/user/balance', { preHandler: [app.authenticate], schema: { tags: ['wallet'] } }, async (req) => {
    const { id: userId } = req.user;

    const [user, wallets] = await Promise.all([
      prisma.user.findUnique({ where: { id: userId }, select: { balance: true } }),
      prisma.wallet.findMany({
        where: { server: { ownerId: userId } },
        select: { balance: true, totalEarned: true, server: { select: { id: true, name: true, slug: true } } },
      }),
    ]);

    const serverBalance = wallets.reduce((sum: number, w) => sum + Number(w.balance), 0);
    const totalEarned = wallets.reduce((sum: number, w) => sum + Number(w.totalEarned), 0);

    return {
      personalBalance: Number(user?.balance || 0),
      serverBalance,
      totalEarned,
      wallets,
    };
  });

  app.get(
    '/api/user/balance/deposit/:depositId',
    { preHandler: [app.authenticate], schema: { tags: ['wallet'] } },
    async (req, reply) => {
      const { id: userId } = req.user;
      const { depositId } = req.params as { depositId: string };

      const deposit = await prisma.deposit.findFirst({
        where: { id: depositId, userId },
        select: { id: true, status: true, amount: true },
      });
      if (!deposit) return reply.status(404).send({ error: 'Deposit not found' });

      return deposit;
    },
  );

  app.post(
    '/api/user/balance/deposit',
    { preHandler: [app.authenticate], config: { rateLimit: { max: 5, timeWindow: '1 minute' } }, schema: { tags: ['wallet'] } },
    async (req, reply) => {
      const operatingMode = await getOperatingMode();
      if (operatingMode === 'self_employed') {
        return reply.status(403).send({ error: 'Пополнение баланса недоступно в режиме самозанятого' });
      }

      const settings = await prisma.platformSettings.findUnique({ where: { id: 'global' }, select: { brandName: true } });
      const platformName = settings?.brandName || 'DonatePlatform';

      const { id: userId } = req.user;
      const parsed = depositSchema.safeParse(req.body);
      if (!parsed.success) return reply.status(400).send({ error: parsed.error.flatten() });

      const deposit = await prisma.deposit.create({
        data: { userId, amount: parsed.data.amount, method: parsed.data.method, status: 'pending' },
      });

      const pcfg = await getPlatformConfig();
      const gateway = parsed.data.provider
        ? getGatewayForProvider(parsed.data.provider, pcfg)
        : (await import('../services/payment/index.js')).createGatewayFromConfig(pcfg);
      const result = await gateway.createPayment({
        amount: Number(deposit.amount),
        currency: 'RUB',
        description: `Пополнение баланса ${platformName}`,
        metadata: { depositId: deposit.id, userId, type: 'deposit' },
        returnUrl: `${pcfg.platformUrl}/profile/balance?deposit=${deposit.id}`,
      });

      await prisma.deposit.update({
        where: { id: deposit.id },
        data: { transactionId: result.transactionId, paymentUrl: result.paymentUrl, paymentProvider: gateway.getGatewayName() },
      });

      return { paymentUrl: result.paymentUrl, depositId: deposit.id };
    },
  );

  app.get(
    '/api/user/balance/transactions',
    { preHandler: [app.authenticate], schema: { tags: ['wallet'] } },
    async (req, reply) => {
      const { id: userId } = req.user;
      const q = depositQuerySchema.parse(req.query);
      const skip = (q.page - 1) * q.limit;

      const [deposits, total] = await Promise.all([
        prisma.deposit.findMany({
          where: { userId },
          orderBy: { createdAt: 'desc' },
          skip,
          take: q.limit,
        }),
        prisma.deposit.count({ where: { userId } }),
      ]);

      return {
        items: deposits,
        pagination: { page: q.page, limit: q.limit, total, pages: Math.ceil(total / q.limit) },
      };
    },
  );
}
