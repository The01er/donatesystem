import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import type { Prisma } from '@prisma/client';
import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import prisma from '../plugins/prisma.js';
import { OrderStatus } from '../constants/order-status.js';
import { RevokeStatus } from '../constants/revoke-status.js';
import { refundSubscriptionTx } from '../services/subscription-service.js';
import { sendNotification, parseNotificationConfig } from '../services/notification-service.js';
import { RouteParams, paginationSchema } from '../validators/common.js';
import { getOperatingMode } from '../lib/platform-settings.js';
import { getAdapter } from '../adapters/registry.js';
import { revokeOrderTx, reGrantOrderTx, cancelOrderTx } from '../services/order-service.js';

const LEGAL_TEMPLATES_DIR = join(dirname(fileURLToPath(import.meta.url)), '..', 'legal-templates');

export default async function adminRoutes(app: FastifyInstance) {
  // ── Who am I ──────────────────────────────────────────────

  app.get(
    '/api/admin/me',
    { preHandler: [app.authenticate, app.authStaff], schema: { tags: ['admin'] } },
    async (req) => {
      return { userId: req.staffMember!.userId, role: req.staffMember!.role };
    },
  );

  // ═══════════════════════════════════════════════════════════
  // Stats

  app.get(
    '/api/admin/stats',
    { preHandler: [app.authenticate, app.authStaff], schema: { tags: ['admin'] } },
    async (_req) => {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const yesterday = new Date(today.getTime() - 24 * 60 * 60 * 1000);
      const thirtyDaysAgo = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000);

      const [
        users,
        servers,
        orders,
        totalCommissionSum,
        ordersToday,
        commissionToday,
        usersToday,
        serversToday,
        ordersYesterday,
        commissionYesterday,
        usersYesterday,
        serversYesterday,
        users30d,
        revenue30d,
        statusGroup,
        topServersRaw,
        activeSubs,
        subRevenueAgg,
        subRevenue30dAgg,
        subsByStatus,
      ] = await Promise.all([
        prisma.user.count(),
        prisma.server.count(),
        prisma.order.count(),
        prisma.transaction.aggregate({ where: { type: 'order_commission' }, _sum: { amount: true } }),
        prisma.order.count({
          where: { createdAt: { gte: today }, status: { in: [OrderStatus.PAID, OrderStatus.DELIVERED] } },
        }),
        prisma.order.aggregate({
          where: { createdAt: { gte: today }, status: { in: [OrderStatus.PAID, OrderStatus.DELIVERED] } },
          _sum: { commissionAmt: true },
        }),
        prisma.user.count({ where: { createdAt: { gte: today } } }),
        prisma.server.count({ where: { createdAt: { gte: today } } }),
        prisma.order.count({
          where: {
            createdAt: { gte: yesterday, lt: today },
            status: { in: [OrderStatus.PAID, OrderStatus.DELIVERED] },
          },
        }),
        prisma.order.aggregate({
          where: {
            createdAt: { gte: yesterday, lt: today },
            status: { in: [OrderStatus.PAID, OrderStatus.DELIVERED] },
          },
          _sum: { commissionAmt: true },
        }),
        prisma.user.count({ where: { createdAt: { gte: yesterday, lt: today } } }),
        prisma.server.count({ where: { createdAt: { gte: yesterday, lt: today } } }),
        prisma.$queryRaw<{ date: string; count: bigint }[]>`
          SELECT DATE(createdAt) as date, COUNT(*) as count
          FROM User
          WHERE createdAt >= ${thirtyDaysAgo}
          GROUP BY DATE(createdAt)
          ORDER BY date ASC
        `,
        prisma.$queryRaw<{ date: string; amount: number }[]>`
          SELECT DATE(o.createdAt) as date, COALESCE(SUM(o.ownerAmount), 0) as amount
          FROM \`Order\` o
          WHERE o.createdAt >= ${thirtyDaysAgo}
            AND o.status IN (${OrderStatus.PAID}, ${OrderStatus.DELIVERED})
          GROUP BY DATE(o.createdAt)
          ORDER BY date ASC
        `,
        prisma.order.groupBy({
          by: 'status',
          _count: { id: true },
        }),
        prisma.order.groupBy({
          by: ['serverId'],
          where: { status: { in: [OrderStatus.PAID, OrderStatus.DELIVERED] } },
          _sum: { ownerAmount: true },
          orderBy: { _sum: { ownerAmount: 'desc' } },
          take: 10,
        }),
        prisma.subscription.count({ where: { status: 'active' } }),
        prisma.auditLog.aggregate({
          where: { action: 'subscription_renew' },
          _sum: { amount: true },
        }),
        prisma.auditLog.aggregate({
          where: { action: 'subscription_renew', createdAt: { gte: thirtyDaysAgo } },
          _sum: { amount: true },
        }),
        prisma.subscription.groupBy({
          by: 'status',
          _count: { id: true },
        }),
      ]);

      const serverIds = topServersRaw.map((s) => s.serverId);
      const serverMap: Record<string, { name: string; gameType: string }> = {};
      if (serverIds.length > 0) {
        const serversData = await prisma.server.findMany({
          where: { id: { in: serverIds } },
          select: { id: true, name: true, gameType: true },
        });
        for (const s of serversData) serverMap[s.id] = { name: s.name, gameType: s.gameType };
      }

      const topServers = topServersRaw.map((s) => ({
        id: s.serverId,
        name: serverMap[s.serverId]?.name || 'Unknown',
        game: serverMap[s.serverId]?.gameType || 'unknown',
        revenue: s._sum.ownerAmount || 0,
      }));

      const registrationsByDay = (users30d as Array<{ date: string; count: bigint }>).map((r) => ({
        date: r.date,
        count: Number(r.count),
      }));

      const revenueByDay = (revenue30d as Array<{ date: string; amount: number }>).map((r) => ({
        date: r.date,
        amount: Number(r.amount),
      }));

      const ordersByStatus = statusGroup.map((s) => ({ status: s.status, count: s._count.id }));

      function pct(current: number, previous: number): number {
        if (previous === 0) return current > 0 ? 100 : 0;
        return Math.round(((current - previous) / previous) * 100);
      }

      return {
        totalUsers: users,
        totalServers: servers,
        totalOrders: orders,
        ordersToday,
        revenueToday: commissionToday._sum.commissionAmt || 0,
        totalVolume: totalCommissionSum._sum.amount || 0,
        changes: {
          usersPct: pct(usersToday, usersYesterday),
          serversPct: pct(serversToday, serversYesterday),
          ordersPct: pct(ordersToday, ordersYesterday),
          revenuePct: pct(
            Number(commissionToday._sum.commissionAmt || 0),
            Number(commissionYesterday._sum.commissionAmt || 0),
          ),
        },
        registrationsByDay,
        revenueByDay,
        topServers,
        ordersByStatus,
        activeSubscriptions: activeSubs,
        subscriptionRevenue: Number(subRevenueAgg._sum.amount || 0),
        subscriptionRevenue30d: Number(subRevenue30dAgg._sum.amount || 0),
        subscriptionsByStatus: subsByStatus.map((s) => ({ status: s.status, count: s._count.id })),
      };
    },
  );

  // ── Users ─────────────────────────────────────────────────

  app.get(
    '/api/admin/users',
    { preHandler: [app.authenticate, app.authStaff], schema: { tags: ['admin'] } },
    async (req) => {
      const q = paginationSchema.parse(req.query);
      const where: Record<string, unknown> = {};
      if (q.email) where.email = { contains: q.email };
      if (q.status === 'banned') where.bannedAt = { not: null };
      if (q.status === 'active') where.bannedAt = null;

      const [users, total] = await Promise.all([
        prisma.user.findMany({
          where,
          select: {
            id: true,
            email: true,
            bannedAt: true,
            banReason: true,
            createdAt: true,
            _count: { select: { servers: true } },
          },
          orderBy: { createdAt: 'desc' },
          skip: (q.page - 1) * q.limit,
          take: q.limit,
        }),
        prisma.user.count({ where }),
      ]);

      return { users, pagination: { page: q.page, limit: q.limit, total, pages: Math.ceil(total / q.limit) } };
    },
  );

  app.get(
    '/api/admin/users/:id',
    { preHandler: [app.authenticate, app.authStaff], schema: { tags: ['admin'] } },
    async (req, reply) => {
      const { id } = req.params as RouteParams;
      const user = await prisma.user.findUnique({
        where: { id },
        select: {
          id: true,
          email: true,
          bannedAt: true,
          banReason: true,
          balance: true,
          createdAt: true,
          servers: { select: { id: true, name: true, slug: true, createdAt: true } },
          platformStaff: true,
        },
      });
      if (!user) return reply.status(404).send({ error: 'Not found' });

      const recentOrders = await prisma.order.findMany({
        where: { server: { ownerId: user.id } },
        orderBy: { createdAt: 'desc' },
        take: 10,
        include: { product: { select: { name: true } }, server: { select: { name: true } } },
      });

      return { ...user, recentOrders };
    },
  );

  app.post(
    '/api/admin/users/:id/ban',
    { preHandler: [app.authenticate, app.authStaff], config: { rateLimit: { max: 10, timeWindow: '1 minute' } }, schema: { tags: ['admin'] } },
    async (req, reply) => {
      const { role } = req.staffMember!;
      if (role !== 'SUPER_ADMIN' && role !== 'ADMIN') {
        return reply.status(403).send({ error: 'ADMIN role required' });
      }

      const { id } = req.params as RouteParams;
      const parsed = z.object({ banReason: z.string().min(1).max(500).optional() }).safeParse(req.body);
      const banReason = parsed.success ? parsed.data.banReason : 'Banned by admin';

      const user = await prisma.user.update({
        where: { id },
        data: { bannedAt: new Date(), banReason },
      });
      await prisma.auditLog.create({
        data: {
          userId: req.user.id,
          action: 'admin_ban_user',
          targetId: id,
          reason: banReason,
          ipAddress: req.ip,
        },
      });
      return user;
    },
  );

  app.post(
    '/api/admin/users/:id/unban',
    { preHandler: [app.authenticate, app.authStaff], config: { rateLimit: { max: 10, timeWindow: '1 minute' } }, schema: { tags: ['admin'] } },
    async (req, reply) => {
      const { role } = req.staffMember!;
      if (role !== 'SUPER_ADMIN' && role !== 'ADMIN') {
        return reply.status(403).send({ error: 'ADMIN role required' });
      }

      const { id } = req.params as RouteParams;

      const user = await prisma.user.update({
        where: { id },
        data: { bannedAt: null, banReason: null },
        select: { id: true, email: true, bannedAt: true },
      });

      return user;
    },
  );

  app.post(
    '/api/admin/users/:id/staff',
    { preHandler: [app.authenticate, app.authStaff], schema: { tags: ['admin'] } },
    async (req, reply) => {
      if (req.staffMember!.role !== 'SUPER_ADMIN') {
        return reply.status(403).send({ error: 'SUPER_ADMIN only' });
      }

      const schema = z.object({ role: z.enum(['SUPER_ADMIN', 'ADMIN', 'SUPPORT', 'FINANCE']) });
      const parsed = schema.safeParse(req.body);
      if (!parsed.success) return reply.status(400).send({ error: parsed.error.flatten() });

      const { id: userId } = req.params as RouteParams;

      const existing = await prisma.platformStaff.findUnique({ where: { userId } });
      let staff;
      if (existing) {
        staff = await prisma.platformStaff.update({
          where: { id: existing.id },
          data: { role: parsed.data.role, isActive: true },
        });
      } else {
        staff = await prisma.platformStaff.create({
          data: { userId, role: parsed.data.role },
        });
      }

      return staff;
    },
  );

  app.delete(
    '/api/admin/users/:id/staff',
    { preHandler: [app.authenticate, app.authStaff], schema: { tags: ['admin'] } },
    async (req, reply) => {
      if (req.staffMember!.role !== 'SUPER_ADMIN') {
        return reply.status(403).send({ error: 'SUPER_ADMIN only' });
      }

      const { id: userId } = req.params as RouteParams;
      await prisma.platformStaff.updateMany({
        where: { userId },
        data: { isActive: false },
      });

      return { ok: true };
    },
  );

  // ═══════════════════════════════════════════════════════════
  // Servers
  // ═══════════════════════════════════════════════════════════

  app.get(
    '/api/admin/servers',
    { preHandler: [app.authenticate, app.authStaff], schema: { tags: ['admin'] } },
    async (req) => {
      const q = paginationSchema.parse(req.query);
      const where: Record<string, unknown> = {};
      if (q.gameType) where.gameType = q.gameType;
      if (q.search) where.OR = [{ name: { contains: q.search } }, { slug: { contains: q.search } }];
      if (q.status === 'blocked') where.blockedAt = { not: null };
      if (q.status === 'active') where.blockedAt = null;

      const [servers, total] = await Promise.all([
        prisma.server.findMany({
          where,
          select: {
            id: true,
            name: true,
            gameType: true,
            slug: true,
            blockedAt: true,
            blockReason: true,
            planType: true,
            createdAt: true,
            owner: { select: { id: true, email: true } },
            _count: { select: { orders: true, products: true } },
            subscription: { select: { id: true, status: true, expiresAt: true } },
          },
          orderBy: { createdAt: 'desc' },
          skip: (q.page - 1) * q.limit,
          take: q.limit,
        }),
        prisma.server.count({ where }),
      ]);

      return { servers, pagination: { page: q.page, limit: q.limit, total, pages: Math.ceil(total / q.limit) } };
    },
  );

  app.get(
    '/api/admin/servers/:id',
    { preHandler: [app.authenticate, app.authStaff], schema: { tags: ['admin'] } },
    async (req, reply) => {
      const { id } = req.params as RouteParams;
      const server = await prisma.server.findUnique({
        where: { id },
        include: {
          owner: { select: { id: true, email: true } },
          wallet: true,
          _count: { select: { orders: true, products: true, members: true } },
        },
      });
      if (!server) return reply.status(404).send({ error: 'Not found' });

      const recentOrders = await prisma.order.findMany({
        where: { serverId: server.id },
        orderBy: { createdAt: 'desc' },
        take: 10,
        include: { product: { select: { name: true } } },
      });

      const monthlyRevenue = await prisma.order.aggregate({
        where: {
          serverId: server.id,
          createdAt: { gte: new Date(new Date().getFullYear(), new Date().getMonth(), 1) },
          status: { in: [OrderStatus.PAID, OrderStatus.DELIVERED] },
        },
        _sum: { totalAmount: true },
      });

      return { ...server, recentOrders, monthlyRevenue: monthlyRevenue._sum.totalAmount || 0 };
    },
  );

  app.post(
    '/api/admin/servers/:id/block',
    { preHandler: [app.authenticate, app.authStaff], config: { rateLimit: { max: 10, timeWindow: '1 minute' } }, schema: { tags: ['admin'] } },
    async (req, reply) => {
      const { role } = req.staffMember!;
      if (role !== 'SUPER_ADMIN' && role !== 'ADMIN') {
        return reply.status(403).send({ error: 'ADMIN role required' });
      }
      const { id } = req.params as RouteParams;
      const { blockReason } = (req.body as { blockReason?: string }) || {};
      return prisma.server.update({
        where: { id },
        data: { blockedAt: new Date(), blockReason: blockReason || 'Blocked by admin' },
      });
    },
  );

  app.post(
    '/api/admin/servers/:id/unblock',
    { preHandler: [app.authenticate, app.authStaff], config: { rateLimit: { max: 10, timeWindow: '1 minute' } }, schema: { tags: ['admin'] } },
    async (req, reply) => {
      const { role } = req.staffMember!;
      if (role !== 'SUPER_ADMIN' && role !== 'ADMIN') {
        return reply.status(403).send({ error: 'ADMIN role required' });
      }
      const { id } = req.params as RouteParams;
      return prisma.server.update({
        where: { id },
        data: { blockedAt: null, blockReason: null },
      });
    },
  );

  // ═══════════════════════════════════════════════════════════
  // Withdrawals
  // ═══════════════════════════════════════════════════════════

  app.get(
    '/api/admin/withdrawals',
    { preHandler: [app.authenticate, app.authStaff], schema: { tags: ['admin'] } },
    async (req, reply) => {
      if (!['SUPER_ADMIN', 'ADMIN', 'FINANCE'].includes(req.staffMember!.role)) {
        return reply.status(403).send({ error: 'Forbidden' });
      }

      const q = paginationSchema.parse(req.query);
      const where: Record<string, unknown> = {};
      if (q.status) where.status = q.status;

      const [withdrawals, total] = await Promise.all([
        prisma.withdrawalRequest.findMany({
          where,
          include: {
            wallet: {
              select: { server: { select: { id: true, name: true, slug: true, owner: { select: { email: true } } } } },
            },
          },
          orderBy: { createdAt: 'desc' },
          skip: (q.page - 1) * q.limit,
          take: q.limit,
        }),
        prisma.withdrawalRequest.count({ where }),
      ]);

      return { withdrawals, pagination: { page: q.page, limit: q.limit, total, pages: Math.ceil(total / q.limit) } };
    },
  );

  app.post(
    '/api/admin/withdrawals/:id/approve',
    { preHandler: [app.authenticate, app.authStaff], config: { rateLimit: { max: 10, timeWindow: '1 minute' } }, schema: { tags: ['admin'] } },
    async (req, reply) => {
      const { role } = req.staffMember!;
      if (role !== 'SUPER_ADMIN' && role !== 'ADMIN') {
        return reply.status(403).send({ error: 'ADMIN role required' });
      }

      const { id } = req.params as RouteParams;
      const parsed = z.object({ reason: z.string().min(1).max(500).optional() }).safeParse(req.body);

      let withdrawalServerId: string | null = null;
      let withdrawalAmount = 0;
      let withdrawalMethod = '';
      try {
        const updated = await prisma.$transaction(async (tx) => {
          const withdrawal = await tx.withdrawalRequest.findUnique({
            where: { id },
            include: { wallet: true },
          });
          if (!withdrawal) throw new Error('NOT_FOUND');
          if (withdrawal.status !== 'pending') throw new Error('NOT_PENDING');

          // Атомарный guard: только первый успешно переключает статус
          const statusGuard = await tx.withdrawalRequest.updateMany({
            where: { id, status: 'pending' },
            data: { status: 'approved' },
          });
          if (statusGuard.count === 0) throw new Error('NOT_PENDING');

          const wallet = await tx.wallet.findUnique({ where: { id: withdrawal.walletId } });
          if (!wallet || Number(wallet.balance) < Number(withdrawal.amount)) {
            throw new Error('INSUFFICIENT_BALANCE');
          }

          await tx.wallet.update({
            where: { id: withdrawal.walletId },
            data: { balance: { decrement: Number(withdrawal.amount) } },
          });

          await tx.transaction.create({
            data: {
              walletId: withdrawal.walletId,
              amount: -withdrawal.amount,
              type: 'payout',
              note: `Withdrawal ${withdrawal.id} via ${withdrawal.method}`,
            },
          });

          await tx.auditLog.create({
            data: {
              userId: req.user.id,
              action: 'admin_approve_withdrawal',
              targetId: id,
              amount: withdrawal.amount,
              reason: parsed.success ? parsed.data.reason || null : null,
              ipAddress: req.ip,
            },
          });

          withdrawalServerId = withdrawal.serverId;
          withdrawalAmount = Number(withdrawal.amount);
          withdrawalMethod = withdrawal.method;

          return { ok: true };
        });

        if (withdrawalServerId) {
          const sv = await prisma.server.findUnique({
            where: { id: withdrawalServerId },
            select: { notificationConfig: true, name: true },
          });
          if (sv) {
            const ncfg = parseNotificationConfig(sv.notificationConfig);
            sendNotification(ncfg, 'withdrawal', {
              'Статус': 'Одобрена',
              'Сумма': `${withdrawalAmount.toFixed(2)} ₽`,
              'Метод': withdrawalMethod,
              'ID': `#${id.slice(0, 8)}`,
            }, sv.name).catch((e: unknown) => { req.log.error(e, 'Notification failed: approve withdrawal'); });
          }
        }

        return updated;
      } catch (err) {
        if (err instanceof Error) {
          if (err.message === 'NOT_FOUND') return reply.status(404).send({ error: 'Not found' });
          if (err.message === 'NOT_PENDING')
            return reply.status(400).send({ error: 'Cannot approve — request is not pending' });
          if (err.message === 'INSUFFICIENT_BALANCE') return reply.status(400).send({ error: 'Insufficient balance' });
        }
        throw err;
      }
    },
  );

  app.post(
    '/api/admin/withdrawals/:id/reject',
    { preHandler: [app.authenticate, app.authStaff], config: { rateLimit: { max: 10, timeWindow: '1 minute' } }, schema: { tags: ['admin'] } },
    async (req, reply) => {
      const { role } = req.staffMember!;
      if (role !== 'SUPER_ADMIN' && role !== 'ADMIN') {
        return reply.status(403).send({ error: 'ADMIN role required' });
      }

      const { id } = req.params as RouteParams;

      let withdrawalServerId: string | null = null;
      let withdrawalAmount = 0;
      try {
        const updated = await prisma.$transaction(async (tx) => {
          const withdrawal = await tx.withdrawalRequest.findUnique({
            where: { id },
            include: { wallet: true },
          });
          if (!withdrawal) throw new Error('NOT_FOUND');
          if (withdrawal.status !== 'pending') throw new Error('NOT_PENDING');

          const statusGuard = await tx.withdrawalRequest.updateMany({
            where: { id, status: 'pending' },
            data: { status: 'rejected', note: (req.body as { note?: string })?.note || null },
          });
          if (statusGuard.count === 0) throw new Error('NOT_PENDING');

          await tx.withdrawalEvent.create({
            data: {
              withdrawalId: withdrawal.id,
              type: 'rejected',
              adminId: req.user.id,
              note: `Заявка #${withdrawal.id.slice(0, 8)} отклонена`,
            },
          });

          withdrawalServerId = withdrawal.serverId;
          withdrawalAmount = Number(withdrawal.amount);

          return { ok: true };
        });

        if (withdrawalServerId) {
          const sv = await prisma.server.findUnique({
            where: { id: withdrawalServerId },
            select: { notificationConfig: true, name: true },
          });
          if (sv) {
            const ncfg = parseNotificationConfig(sv.notificationConfig);
            sendNotification(ncfg, 'withdrawal', {
              'Статус': 'Отклонена',
              'Сумма': `${withdrawalAmount.toFixed(2)} ₽`,
              'ID': `#${id.slice(0, 8)}`,
            }, sv.name).catch((e: unknown) => { req.log.error(e, 'Notification failed: reject withdrawal'); });
          }
        }

        return updated;
      } catch (err) {
        if (err instanceof Error) {
          if (err.message === 'NOT_FOUND') return reply.status(404).send({ error: 'Not found' });
          if (err.message === 'NOT_PENDING')
            return reply.status(400).send({ error: 'Cannot reject — request is not pending' });
        }
        throw err;
      }
    },
  );

  app.post(
    '/api/admin/withdrawals/:id/pay',
    { preHandler: [app.authenticate, app.authStaff], config: { rateLimit: { max: 10, timeWindow: '1 minute' } }, schema: { tags: ['admin'] } },
    async (req, reply) => {
      const { role } = req.staffMember!;
      if (role !== 'SUPER_ADMIN' && role !== 'ADMIN' && role !== 'FINANCE') {
        return reply.status(403).send({ error: 'FINANCE role required' });
      }

      const { id } = req.params as RouteParams;

      let withdrawalServerId: string | null = null;
      let withdrawalAmount = 0;
      try {
        const updated = await prisma.$transaction(async (tx) => {
          const withdrawal = await tx.withdrawalRequest.findUnique({
            where: { id },
            include: { wallet: true },
          });
          if (!withdrawal) throw new Error('NOT_FOUND');
          if (withdrawal.status !== 'approved') throw new Error('NOT_APPROVED');

          const statusGuard = await tx.withdrawalRequest.updateMany({
            where: { id, status: 'approved' },
            data: { status: 'paid' },
          });
          if (statusGuard.count === 0) throw new Error('NOT_APPROVED');

          await tx.auditLog.create({
            data: {
              userId: req.user.id,
              action: 'admin_pay_withdrawal',
              targetId: id,
              amount: withdrawal.amount,
              ipAddress: req.ip,
            },
          });

          withdrawalServerId = withdrawal.serverId;
          withdrawalAmount = Number(withdrawal.amount);

          return { ok: true };
        });

        if (withdrawalServerId) {
          const sv = await prisma.server.findUnique({
            where: { id: withdrawalServerId },
            select: { notificationConfig: true, name: true },
          });
          if (sv) {
            const ncfg = parseNotificationConfig(sv.notificationConfig);
            sendNotification(ncfg, 'withdrawal', {
              'Статус': 'Выплачена',
              'Сумма': `${withdrawalAmount.toFixed(2)} ₽`,
              'ID': `#${id.slice(0, 8)}`,
            }, sv.name).catch((e: unknown) => { req.log.error(e, 'Notification failed: pay withdrawal'); });
          }
        }

        return updated;
      } catch (err) {
        if (err instanceof Error) {
          if (err.message === 'NOT_FOUND') return reply.status(404).send({ error: 'Not found' });
          if (err.message === 'NOT_APPROVED')
            return reply.status(400).send({ error: 'Must be approved first' });
        }
        throw err;
      }
    },
  );

  // ═══════════════════════════════════════════════════════════
  // Transactions
  // ═══════════════════════════════════════════════════════════

  app.get(
    '/api/admin/transactions',
    { preHandler: [app.authenticate, app.authStaff], schema: { tags: ['admin'] } },
    async (req) => {
      const q = paginationSchema.parse(req.query);
      const where: Prisma.TransactionWhereInput = {};
      if (q.type) where.type = q.type;
      if (q.serverId) where.wallet = { serverId: q.serverId };
      if (q.from || q.to) {
        where.createdAt = {};
        if (q.from) where.createdAt.gte = new Date(q.from);
        if (q.to) where.createdAt.lte = new Date(q.to);
      }

      const [transactions, total] = await Promise.all([
        prisma.transaction.findMany({
          where,
          include: { wallet: { select: { server: { select: { id: true, name: true, slug: true } } } } },
          orderBy: { createdAt: 'desc' },
          skip: (q.page - 1) * q.limit,
          take: q.limit,
        }),
        prisma.transaction.count({ where }),
      ]);

      return { transactions, pagination: { page: q.page, limit: q.limit, total, pages: Math.ceil(total / q.limit) } };
    },
  );

  // ═══════════════════════════════════════════════════════════
  // Finance transactions (subscriptions + deposits)
  // ═══════════════════════════════════════════════════════════

  const financeTransactionSchema = z.object({
    page: z.coerce.number().min(1).default(1),
    limit: z.coerce.number().min(1).max(100).default(20),
    type: z.enum(['subscription', 'deposit', '']).optional().default(''),
    from: z.string().optional(),
    to: z.string().optional(),
  });

  app.get(
    '/api/admin/finance/transactions',
    { preHandler: [app.authenticate, app.authStaff], schema: { tags: ['admin'] } },
    async (req) => {
      const q = financeTransactionSchema.parse(req.query);

      const dateFilter: { gte?: Date; lte?: Date } = {};
      if (q.from) dateFilter.gte = new Date(q.from);
      if (q.to) dateFilter.lte = new Date(q.to);

      const auditWhere: Prisma.AuditLogWhereInput = {
        action: { in: ['subscription_renew', 'admin_extend_subscription', 'admin_deposit'] },
      };
      if (q.type === 'subscription') auditWhere.action = { in: ['subscription_renew', 'admin_extend_subscription'] };
      if (q.type === 'deposit') auditWhere.action = 'admin_deposit';
      if (Object.keys(dateFilter).length) auditWhere.createdAt = dateFilter;

      const depositWhere: Prisma.DepositWhereInput = { status: 'completed' };
      if (q.type === 'deposit') {
        // only deposits
      } else if (q.type === 'subscription') {
        depositWhere.id = 'none';
      }
      if (Object.keys(dateFilter).length) depositWhere.createdAt = dateFilter;

      const [auditLogs, deposits, auditTotal, depositTotal] = await Promise.all([
        prisma.auditLog.findMany({
          where: auditWhere,
          include: { actor: { select: { email: true } } },
          orderBy: { createdAt: 'desc' },
          skip: (q.page - 1) * q.limit,
          take: q.limit,
        }),
        prisma.deposit.findMany({
          where: depositWhere,
          include: { user: { select: { email: true } } },
          orderBy: { createdAt: 'desc' },
          skip: (q.page - 1) * q.limit,
          take: q.limit,
        }),
        prisma.auditLog.count({ where: auditWhere }),
        prisma.deposit.count({ where: depositWhere }),
      ]);

      const items: Array<{
        id: string;
        createdAt: string;
        type: string;
        amount: number;
        userEmail: string;
        description: string;
        transactionId?: string | null;
      }> = [];

      for (const log of auditLogs) {
        const meta = log.metadata as Record<string, string> | null;
        items.push({
          id: log.id,
          createdAt: log.createdAt.toISOString(),
          type: log.action,
          amount: Number(log.amount ?? 0),
          userEmail: log.actor?.email || '—',
          description: log.reason || '',
          transactionId: meta?.transactionId || null,
        });
      }

      for (const dep of deposits) {
        items.push({
          id: dep.id,
          createdAt: dep.createdAt.toISOString(),
          type: 'user_deposit',
          amount: Number(dep.amount),
          userEmail: dep.user.email,
          description: 'Пополнение баланса через платёжную систему',
          transactionId: dep.transactionId,
        });
      }

      items.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

      const total = auditTotal + depositTotal;
      const start = (q.page - 1) * q.limit;
      const paged = items.slice(start, start + q.limit);

      return {
        items: paged,
        pagination: { page: q.page, limit: q.limit, total, pages: Math.ceil(total / q.limit) },
      };
    },
  );


  // ═══════════════════════════════════════════════════════════
  // Server orders (admin view)
  // ═══════════════════════════════════════════════════════════

  app.get(
    '/api/admin/servers/:id/orders',
    { preHandler: [app.authenticate, app.authStaff], schema: { tags: ['admin'] } },
    async (req, reply) => {
      const { id: serverId } = req.params as RouteParams;
      const q = paginationSchema.parse(req.query);

      const [items, total] = await Promise.all([
        prisma.order.findMany({
          where: { serverId },
          include: { product: { select: { name: true, price: true } } },
          orderBy: { createdAt: 'desc' },
          skip: (q.page - 1) * q.limit,
          take: q.limit,
        }),
        prisma.order.count({ where: { serverId } }),
      ]);

      return { items, pagination: { page: q.page, limit: q.limit, total, pages: Math.ceil(total / q.limit) } };
    },
  );

  app.get(
    '/api/admin/servers/:id/orders/:orderId',
    { preHandler: [app.authenticate, app.authStaff], schema: { tags: ['admin'] } },
    async (req, reply) => {
      const { id: serverId } = req.params as RouteParams;
      const { orderId } = req.params as { orderId: string };

      const order = await prisma.order.findUnique({
        where: { id: orderId },
        include: {
          product: { select: { id: true, name: true, type: true, price: true, removeCommand: true, actionsJson: true } },
          server: { select: { id: true, name: true } },
          deliveryAttempts: {
            orderBy: { createdAt: 'asc' },
            select: { id: true, actionIndex: true, actionType: true, status: true, error: true, rollbackStatus: true, createdAt: true },
          },
        },
      });

      if (!order || order.serverId !== serverId) {
        return reply.status(404).send({ error: 'Not found' });
      }

      return { order };
    },
  );

  app.post(
    '/api/admin/orders/:id/cancel',
    { preHandler: [app.authenticate, app.authStaff], config: { rateLimit: { max: 20, timeWindow: '1 minute' } }, schema: { tags: ['admin'] } },
    async (req, reply) => {
      const { role } = req.staffMember!;
      if (role !== 'SUPER_ADMIN' && role !== 'ADMIN') {
        return reply.status(403).send({ error: 'ADMIN role required' });
      }

      const { id } = req.params as RouteParams;
      const parsed = z.object({ reason: z.string().min(3).max(500) }).safeParse(req.body);
      if (!parsed.success) {
        return reply.status(400).send({ error: 'reason is required (min 3 chars)' });
      }

      const result = await prisma.$transaction(async (tx) => {
        const r = await cancelOrderTx(tx, {
          orderId: id,
          allowedStatuses: [OrderStatus.PAID, OrderStatus.PENDING],
          refundSubscription: true,
        });
        if (r.kind === 'ok') {
          await tx.auditLog.create({
            data: {
              userId: req.user.id,
              action: 'admin_cancel_order',
              targetId: id,
              amount: 0,
              reason: parsed.data.reason,
              ipAddress: req.ip,
            },
          });
        }
        return r;
      });

      if (result.kind === 'not_found') {
        return reply.status(404).send({ error: 'Not found' });
      }
      if (result.kind === 'invalid_status') {
        return reply.status(409).send({ error: `Cannot cancel order in status ${result.status}` });
      }
      if (result.kind === 'concurrent') {
        return reply.status(409).send({ error: 'Order was modified concurrently' });
      }

      return { ok: true };
    },
  );

  app.post(
    '/api/admin/orders/:id/retry',
    { preHandler: [app.authenticate, app.authStaff], config: { rateLimit: { max: 20, timeWindow: '1 minute' } }, schema: { tags: ['admin'] } },
    async (req, reply) => {
      const { role } = req.staffMember!;
      if (role !== 'SUPER_ADMIN' && role !== 'ADMIN') {
        return reply.status(403).send({ error: 'ADMIN role required' });
      }

      const { id } = req.params as RouteParams;

      try {
        await prisma.$transaction(async (tx) => {
          const order = await tx.order.findUnique({ where: { id }, select: { id: true, status: true } });
          if (!order) throw new Error('NOT_FOUND');
          if (order.status !== OrderStatus.FAILED) throw new Error('INVALID_STATUS');

          const updated = await tx.order.updateMany({
            where: { id, status: OrderStatus.FAILED },
            data: { status: OrderStatus.PAID, retryCount: 0, lastError: null },
          });
          if (updated.count === 0) throw new Error('CONCURRENT');
        });

        return { ok: true };
      } catch (err) {
        if (err instanceof Error) {
          if (err.message === 'NOT_FOUND') return reply.status(404).send({ error: 'Not found' });
          if (err.message === 'INVALID_STATUS') return reply.status(400).send({ error: 'Only failed orders can be retried' });
          if (err.message === 'CONCURRENT') return reply.status(409).send({ error: 'Order was modified concurrently' });
        }
        throw err;
      }
    },
  );

  app.post(
    '/api/admin/orders/:id/revoke',
    { preHandler: [app.authenticate, app.authStaff], config: { rateLimit: { max: 20, timeWindow: '1 minute' } }, schema: { tags: ['admin'] } },
    async (req, reply) => {
      const { role } = req.staffMember!;
      if (role !== 'SUPER_ADMIN' && role !== 'ADMIN') {
        return reply.status(403).send({ error: 'ADMIN role required' });
      }

      const { id } = req.params as RouteParams;

      const order = await prisma.order.findUnique({
        where: { id },
        include: { product: { select: { type: true, removeCommand: true } } },
      });
      if (!order) return reply.status(404).send({ error: 'Not found' });
      if (order.status !== OrderStatus.DELIVERED && order.status !== OrderStatus.PAID) {
        return reply.status(400).send({ error: 'Only paid or delivered orders can be revoked' });
      }
      if (order.revokeStatus === RevokeStatus.REVOKED) {
        return reply.status(400).send({ error: 'Privilege already revoked' });
      }
      if (order.product.type !== 'privilege') {
        return reply.status(400).send({ error: 'Only privilege products can be revoked' });
      }
      if (!order.product.removeCommand) {
        return reply.status(400).send({ error: 'No remove command configured for this product' });
      }

      await prisma.$transaction((tx) =>
        revokeOrderTx(tx, {
          orderId: id,
          removeCommand: order.product.removeCommand!,
          userId: req.user.id,
          ipAddress: req.ip,
          auditAction: 'admin_revoke_privilege',
          amount: Number(order.totalAmount),
        }),
      );

      return { ok: true };
    },
  );

  app.post(
    '/api/admin/orders/:id/re-grant',
    { preHandler: [app.authenticate, app.authStaff], config: { rateLimit: { max: 20, timeWindow: '1 minute' } }, schema: { tags: ['admin'] } },
    async (req, reply) => {
      const { role } = req.staffMember!;
      if (role !== 'SUPER_ADMIN' && role !== 'ADMIN') {
        return reply.status(403).send({ error: 'ADMIN role required' });
      }

      const { id } = req.params as RouteParams;

      const order = await prisma.order.findUnique({
        where: { id },
        select: { id: true, revokeStatus: true, serverId: true },
      });
      if (!order) return reply.status(404).send({ error: 'Not found' });
      if (order.revokeStatus !== RevokeStatus.REVOKED) {
        return reply.status(400).send({ error: 'Only revoked orders can be re-granted' });
      }

      await prisma.$transaction((tx) =>
        reGrantOrderTx(tx, {
          orderId: id,
          userId: req.user.id,
          ipAddress: req.ip,
          auditAction: 'admin_regrant_privilege',
        }),
      );

      const server = await prisma.server.findUnique({ where: { id: order.serverId }, select: { gameType: true, rconHost: true, rconPort: true, rconPassword: true } });
      const adapter = getAdapter(server?.gameType || 'minecraft');
      if (server && adapter.isDeliverable(server)) {
        adapter.deliverOrder(id, order.serverId).then((res) => {
          req.log.info({ orderId: id, ok: res.ok, error: res.error }, 'Admin re-grant delivery');
        }).catch((e: unknown) => {
          req.log.error({ orderId: id, err: e }, 'Admin re-grant delivery threw');
        });
      }

      return { ok: true };
    },
  );

  app.get(
    '/api/admin/orders/:id',
    { preHandler: [app.authenticate, app.authStaff], schema: { tags: ['admin'] } },
    async (req, reply) => {
      const { id } = req.params as RouteParams;

      const order = await prisma.order.findUnique({
        where: { id },
        include: {
          product: { select: { id: true, name: true, type: true, price: true, removeCommand: true, actionsJson: true } },
          server: { select: { id: true, name: true } },
          deliveryAttempts: {
            orderBy: { createdAt: 'asc' },
            select: { id: true, actionIndex: true, actionType: true, status: true, error: true, rollbackStatus: true, createdAt: true },
          },
        },
      });

      if (!order) return reply.status(404).send({ error: 'Not found' });

      return { order };
    },
  );

  // ═══════════════════════════════════════════════════════════
  // Staff
  // ═══════════════════════════════════════════════════════════

  app.get(
    '/api/admin/staff',
    { preHandler: [app.authenticate, app.authStaff], schema: { tags: ['admin'] } },
    async (req, reply) => {
      if (req.staffMember!.role !== 'SUPER_ADMIN') {
        return reply.status(403).send({ error: 'SUPER_ADMIN only' });
      }

      return prisma.platformStaff.findMany({
        include: { user: { select: { id: true, email: true } } },
        orderBy: { createdAt: 'asc' },
      });
    },
  );

  app.post(
    '/api/admin/staff',
    { preHandler: [app.authenticate, app.authStaff], schema: { tags: ['admin'] } },
    async (req, reply) => {
      if (req.staffMember!.role !== 'SUPER_ADMIN') {
        return reply.status(403).send({ error: 'SUPER_ADMIN only' });
      }

      const schema = z.object({
        userId: z.string().uuid(),
        role: z.enum(['SUPER_ADMIN', 'ADMIN', 'SUPPORT', 'FINANCE']),
      });
      const parsed = schema.safeParse(req.body);
      if (!parsed.success) return reply.status(400).send({ error: parsed.error.flatten() });

      const existing = await prisma.platformStaff.findUnique({ where: { userId: parsed.data.userId } });
      if (existing) {
        return prisma.platformStaff.update({
          where: { id: existing.id },
          data: { role: parsed.data.role, isActive: true },
          include: { user: { select: { id: true, email: true } } },
        });
      }

      return prisma.platformStaff.create({
        data: { userId: parsed.data.userId, role: parsed.data.role },
        include: { user: { select: { id: true, email: true } } },
      });
    },
  );

  app.put(
    '/api/admin/staff/:id',
    { preHandler: [app.authenticate, app.authStaff], schema: { tags: ['admin'] } },
    async (req, reply) => {
      if (req.staffMember!.role !== 'SUPER_ADMIN') {
        return reply.status(403).send({ error: 'SUPER_ADMIN only' });
      }

      const schema = z.object({ role: z.enum(['SUPER_ADMIN', 'ADMIN', 'SUPPORT', 'FINANCE']) });
      const parsed = schema.safeParse(req.body);
      if (!parsed.success) return reply.status(400).send({ error: parsed.error.flatten() });

      const { id } = req.params as RouteParams;

      return prisma.platformStaff.update({
        where: { id },
        data: { role: parsed.data.role },
        include: { user: { select: { id: true, email: true } } },
      });
    },
  );

  app.delete(
    '/api/admin/staff/:id',
    { preHandler: [app.authenticate, app.authStaff], schema: { tags: ['admin'] } },
    async (req, reply) => {
      if (req.staffMember!.role !== 'SUPER_ADMIN') {
        return reply.status(403).send({ error: 'SUPER_ADMIN only' });
      }

      const { id } = req.params as RouteParams;

      await prisma.platformStaff.update({
        where: { id },
        data: { isActive: false },
      });

      return { ok: true };
    },
  );

  // ═══════════════════════════════════════════════════════════
  // Sessions
  // ═══════════════════════════════════════════════════════════

  app.get(
    '/api/admin/users/:id/sessions',
    { preHandler: [app.authenticate, app.authStaff], schema: { tags: ['admin'] } },
    async (req, reply) => {
      const { role } = req.staffMember!;
      if (role !== 'SUPER_ADMIN' && role !== 'ADMIN') {
        return reply.status(403).send({ error: 'ADMIN role required' });
      }
      const { id } = req.params as RouteParams;
      return prisma.userSession.findMany({
        where: { userId: id },
        orderBy: { lastUsedAt: 'desc' },
        select: {
          id: true,
          userAgent: true,
          ipAddress: true,
          createdAt: true,
          lastUsedAt: true,
          expiresAt: true,
          user: { select: { email: true } },
        },
      });
    },
  );

  app.delete(
    '/api/admin/sessions/:id',
    { preHandler: [app.authenticate, app.authStaff], schema: { tags: ['admin'] } },
    async (req, reply) => {
      const { role, userId: staffUserId } = req.staffMember!;
      if (role !== 'SUPER_ADMIN' && role !== 'ADMIN') {
        return reply.status(403).send({ error: 'ADMIN role required' });
      }
      const { id } = req.params as RouteParams;
      const session = await prisma.userSession.findUnique({
        where: { id },
        include: { user: { select: { platformStaff: { select: { role: true } } } } },
      });
      if (!session) return reply.status(404).send({ error: 'Not found' });

      // ADMIN cannot revoke SUPER_ADMIN sessions
      if (role === 'ADMIN' && session.user.platformStaff?.role === 'SUPER_ADMIN') {
        return reply.status(403).send({ error: 'Cannot revoke SUPER_ADMIN session' });
      }

      // ADMIN cannot revoke their own session
      if (session.userId === staffUserId) {
        return reply.status(400).send({ error: 'Cannot revoke your own session' });
      }

      await prisma.$transaction(async (tx) => {
        await tx.userSession.delete({ where: { id: session.id } });
        await tx.auditLog.create({
          data: {
            userId: req.user.id,
            action: 'admin_revoke_session',
            targetId: id,
            metadata: { userId: session.userId },
            ipAddress: req.ip,
          },
        });
      });

      return { ok: true };
    },
  );

  // ═══════════════════════════════════════════════════════════
  // Settings
  // ═══════════════════════════════════════════════════════════

  app.get(
    '/api/admin/settings',
    { preHandler: [app.authenticate, app.authStaff], schema: { tags: ['admin'] } },
    async () => {
      return prisma.platformSettings.upsert({
        where: { id: 'global' },
        create: { id: 'global' },
        update: {},
      });
    },
  );

  app.put(
    '/api/admin/settings',
    {
      preHandler: [app.authenticate, app.authStaff],
      config: { rateLimit: { max: 5, timeWindow: '1 hour' } },
      schema: { tags: ['admin'] },
    },
    async (req, reply) => {
      const { role } = req.staffMember!;
      if (role !== 'SUPER_ADMIN' && role !== 'ADMIN') {
        return reply.status(403).send({ error: 'ADMIN role required' });
      }

      const emptyToUndefined = (v: unknown) => (v === '' ? undefined : v);

      const schema = z.object({
        defaultCommissionPct: z.number().min(0).max(100).optional(),
        subscriptionPrice: z.number().min(0).max(100000).optional(),
        platformDomain: z
          .string()
          .regex(/^[a-z0-9.-]+\.[a-z]{2,}$/i)
          .max(255)
          .optional(),
        cnameTarget: z
          .string()
          .regex(/^[a-z0-9.-]+\.[a-z]{2,}$/i)
          .max(255)
          .optional(),
        operatingMode: z.enum(['self_employed', 'individual']).optional(),
        platformName: z.preprocess(emptyToUndefined, z.string().min(1).max(200).optional()),
        brandName: z.preprocess(emptyToUndefined, z.string().min(1).max(200).optional()),
        platformInn: z.preprocess(
          emptyToUndefined,
          z
            .string()
            .regex(/^\d{10,12}$/, 'ИНН должен содержать 10 или 12 цифр')
            .optional(),
        ),
        platformOgrn: z.preprocess(emptyToUndefined, z.string().max(15).optional()),
        platformAddress: z.preprocess(emptyToUndefined, z.string().min(1).max(500).optional()),
        platformEmail: z.preprocess(emptyToUndefined, z.string().email().optional()),
        platformPhone: z.preprocess(emptyToUndefined, z.string().max(20).optional()),

        // Из .env — настраивается через админку
        platformUrl: z.preprocess(emptyToUndefined, z.string().url().optional()),
        corsOrigins: z.preprocess(emptyToUndefined, z.string().max(500).optional()),
        paymentGateway: z.preprocess(emptyToUndefined, z.string().max(100).optional()),
        paymentWebhookUrl: z.preprocess(emptyToUndefined, z.string().url().optional()),
        paymentWebhookIps: z.preprocess(emptyToUndefined, z.string().max(500).optional()),
        yookassaShopId: z.preprocess(emptyToUndefined, z.string().max(100).optional()),
        yookassaSecretKey: z.preprocess(emptyToUndefined, z.string().max(500).optional()),
        anypayMerchantId: z.preprocess(emptyToUndefined, z.string().max(100).optional()),
        anypaySecretKey: z.preprocess(emptyToUndefined, z.string().max(500).optional()),
        enotShopId: z.preprocess(emptyToUndefined, z.string().max(100).optional()),
        enotApiKey: z.preprocess(emptyToUndefined, z.string().max(500).optional()),
        yoomoneyReceiver: z.preprocess(emptyToUndefined, z.string().max(50).optional()),
        yoomoneySecret: z.preprocess(emptyToUndefined, z.string().max(500).optional()),
        notificationProxy: z.preprocess(emptyToUndefined, z.string().max(500).optional()),
        notificationRelayUrl: z.preprocess(emptyToUndefined, z.string().url().optional()),
        notificationRelayToken: z.preprocess(emptyToUndefined, z.string().max(500).optional()),
        turnstileSiteKey: z.preprocess(emptyToUndefined, z.string().max(200).optional()),
        turnstileSecretKey: z.preprocess(emptyToUndefined, z.string().max(500).optional()),
        aiApiUrl: z.preprocess(emptyToUndefined, z.string().max(500).optional()),
        aiApiKey: z.preprocess(emptyToUndefined, z.string().max(500).optional()),
        aiModel: z.preprocess(emptyToUndefined, z.string().max(100).optional()),
      });
      const parsed = schema.safeParse(req.body);
      if (!parsed.success) return reply.status(400).send({ error: parsed.error.flatten() });

      const previous = await prisma.platformSettings.findUnique({ where: { id: 'global' } });
      const result = await prisma.platformSettings.update({
        where: { id: 'global' },
        data: parsed.data,
      });

      // If operatingMode changed, re-seed legal documents from correct templates
      if (parsed.data.operatingMode && parsed.data.operatingMode !== previous?.operatingMode) {
        const suffix = parsed.data.operatingMode === 'individual' ? 'individual' : 'self_employed';
        const legalDocs = [
          { slug: 'offer', title: 'Оферта об оказании услуг' },
          { slug: 'privacy', title: 'Политика конфиденциальности' },
          { slug: 'terms', title: 'Пользовательское соглашение' },
        ];
        for (const doc of legalDocs) {
          try {
            const content = readFileSync(join(LEGAL_TEMPLATES_DIR, `${doc.slug}_${suffix}.html`), 'utf-8');
            await prisma.legalDocument.upsert({
              where: { slug: doc.slug },
              create: { slug: doc.slug, title: doc.title, content },
              update: { content, title: doc.title },
            });
          } catch (err) {
            req.log.error({ slug: doc.slug, err }, '[settings] failed to re-seed legal document');
          }
        }
        req.log.info({ mode: parsed.data.operatingMode }, '[settings] legal documents re-seeded');
      }

      return result;
    },
  );

  // ═══════════════════════════════════════════════════════════
  // News (admin — all including unpublished)
  // ═══════════════════════════════════════════════════════════

  app.get(
    '/api/admin/news',
    { preHandler: [app.authenticate, app.authStaff], schema: { tags: ['admin'] } },
    async (req) => {
      const q = paginationSchema.parse(req.query);
      const [news, total] = await Promise.all([
        prisma.news.findMany({
          orderBy: { createdAt: 'desc' },
          skip: (q.page - 1) * q.limit,
          take: q.limit,
        }),
        prisma.news.count(),
      ]);
      return { news, pagination: { page: q.page, limit: q.limit, total, pages: Math.ceil(total / q.limit) } };
    },
  );

  // ═══════════════════════════════════════════════════════════
  // FAQ (admin — all)
  // ═══════════════════════════════════════════════════════════

  app.get(
    '/api/admin/faq',
    { preHandler: [app.authenticate, app.authStaff], schema: { tags: ['admin'] } },
    async (req) => {
      const q = paginationSchema.parse(req.query);
      const [faq, total] = await Promise.all([
        prisma.faq.findMany({
          orderBy: { sortOrder: 'asc' },
          skip: (q.page - 1) * q.limit,
          take: q.limit,
        }),
        prisma.faq.count(),
      ]);
      return { faq, pagination: { page: q.page, limit: q.limit, total, pages: Math.ceil(total / q.limit) } };
    },
  );

  // ═══════════════════════════════════════════════════════════
  // User balance deposit (admin)
  // ═══════════════════════════════════════════════════════════

  app.post(
    '/api/admin/user/balance/deposit',
    {
      preHandler: [app.authenticate, app.authStaff],
      config: { rateLimit: { max: 10, timeWindow: '1 minute' } },
      schema: { tags: ['admin'] },
    },
    async (req, reply) => {
      const { role } = req.staffMember!;
      if (role !== 'SUPER_ADMIN' && role !== 'ADMIN' && role !== 'FINANCE') {
        return reply.status(403).send({ error: 'Forbidden' });
      }

      const schema = z.object({
        userId: z.string().uuid(),
        amount: z.number().min(1).max(10000),
        reason: z.string().min(3).max(500),
      });
      const parsed = schema.safeParse(req.body);
      if (!parsed.success) return reply.status(400).send({ error: parsed.error.flatten() });

      const result = await prisma.$transaction(async (tx) => {
        const user = await tx.user.update({
          where: { id: parsed.data.userId },
          data: { balance: { increment: parsed.data.amount } },
        });
        await tx.auditLog.create({
          data: {
            userId: req.user.id,
            action: 'admin_deposit',
            targetId: parsed.data.userId,
            amount: parsed.data.amount,
            reason: parsed.data.reason,
            ipAddress: req.ip,
          },
        });
        return user;
      });

      return { balance: result.balance };
    },
  );

  // ═══════════════════════════════════════════════════════════
  // Subscriptions (admin)
  // ═══════════════════════════════════════════════════════════

  app.post(
    '/api/admin/subscriptions/:id/extend',
    {
      preHandler: [app.authenticate, app.authStaff],
      config: { rateLimit: { max: 10, timeWindow: '1 minute' } },
      schema: { tags: ['admin'] },
    },
    async (req, reply) => {
      const { role } = req.staffMember!;
      if (role !== 'SUPER_ADMIN' && role !== 'ADMIN') {
        return reply.status(403).send({ error: 'ADMIN role required' });
      }

      const { id } = req.params as RouteParams;
      const schema = z.object({ days: z.number().int().positive() });
      const parsed = schema.safeParse(req.body);
      if (!parsed.success) return reply.status(400).send({ error: parsed.error.flatten() });

      const sub = await prisma.subscription.findUnique({ where: { id } });
      if (!sub) return reply.status(404).send({ error: 'Subscription not found' });

      const newExpiresAt = new Date(
        Math.max(sub.expiresAt.getTime(), Date.now()) + parsed.data.days * 24 * 60 * 60 * 1000,
      );

      const result = await prisma.$transaction(async (tx) => {
        const updated = await tx.subscription.updateMany({
          where: { id, expiresAt: sub.expiresAt },
          data: { status: 'active', expiresAt: newExpiresAt },
        });
        if (updated.count === 0) throw new Error('Subscription was modified concurrently');
        await tx.auditLog.create({
          data: {
            userId: req.user.id,
            action: 'admin_extend_subscription',
            targetId: id,
            amount: sub.price,
            reason: `Продлена на ${parsed.data.days} дней`,
            ipAddress: req.ip,
          },
        });
        return { ...sub, expiresAt: newExpiresAt, status: 'active' };
      });

      return result;
    },
  );

  app.post(
    '/api/admin/subscriptions/:id/cancel',
    { preHandler: [app.authenticate, app.authStaff], config: { rateLimit: { max: 10, timeWindow: '1 minute' } }, schema: { tags: ['admin'] } },
    async (req, reply) => {
      const { role } = req.staffMember!;
      if (role !== 'SUPER_ADMIN' && role !== 'ADMIN') {
        return reply.status(403).send({ error: 'ADMIN role required' });
      }

      const operatingMode = await getOperatingMode();
      if (operatingMode === 'self_employed') {
        return reply.status(403).send({ error: 'Отмена подписки недоступна в режиме самозанятого' });
      }

      const { id } = req.params as RouteParams;
      const parsed = z.object({ reason: z.string().min(3).max(500) }).safeParse(req.body);
      if (!parsed.success) {
        return reply.status(400).send({ error: 'reason is required (min 3 chars)' });
      }

      const result = await prisma.$transaction(async (tx) => {
        const r = await refundSubscriptionTx(tx, id);
        await tx.auditLog.create({
          data: {
            userId: req.user.id,
            action: 'admin_cancel_subscription',
            targetId: id,
            amount: r.refund,
            reason: parsed.data.reason,
            ipAddress: req.ip,
          },
        });
        return r;
      });

      return { ok: true, refund: result.refund, daysLeft: result.daysLeft };
    },
  );
}
