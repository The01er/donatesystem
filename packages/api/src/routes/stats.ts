import type { FastifyInstance } from 'fastify';
import prisma from '../plugins/prisma.js';
import { OrderStatus } from '../constants/order-status.js';

interface RouteParams {
  id: string;
  [key: string]: string;
}

function parsePeriod(query: { period?: string }): { days: number; since: Date } {
  const period = query.period || '7d';
  if (period === 'all') {
    return { days: 365, since: new Date('2020-01-01') };
  }
  const match = period.match(/^(\d+)d$/);
  const days = match ? parseInt(match[1], 10) : 7;
  const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
  return { days, since };
}

export default async function statsRoutes(app: FastifyInstance) {
  const serverAccess = async (req: { user: { id: string } }, reply: { status: (code: number) => { send: (body: { error: string }) => void } }, serverId: string) => {
    const { id: userId } = req.user;
    const server = await prisma.server.findUnique({ where: { id: serverId }, select: { ownerId: true } });
    const member = await prisma.serverMember.findUnique({
      where: { serverId_userId: { serverId, userId } },
    });
    if (server?.ownerId !== userId && !member) {
      reply.status(403).send({ error: 'Access denied' });
      return false;
    }
    return true;
  };

  // ─── Main stats ────────────────────────────────────────────
  app.get(
    '/api/servers/:id/stats',
    { preHandler: [app.authenticate], schema: { tags: ['servers'] } },
    async (req, reply) => {
      try {
        const { id: serverId } = req.params as RouteParams;
        if (!(await serverAccess(req as never, reply as never, serverId))) return;

        const { days, since } = parsePeriod(req.query as { period?: string });
        const now = new Date();
        const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
        const previousSince = new Date(since.getTime() - days * 24 * 60 * 60 * 1000);

        const paidStatuses = [OrderStatus.PAID, OrderStatus.DELIVERED];

        const wallet = await prisma.wallet.findUnique({ where: { serverId }, select: { balance: true } });

        const [
          ordersToday,
          revenueToday,
          recentOrders,
          dailyRevenue,
          monthlyCommission,
          earnedSum,
          undeliveredOrders,
          outOfStockCount,
          monthlyRevenue,
          currentOrders,
          previousRevenue,
        ] = await Promise.all([
          prisma.order.count({
            where: { serverId, createdAt: { gte: todayStart }, status: { in: paidStatuses } },
          }),
          prisma.order.aggregate({
            where: { serverId, createdAt: { gte: todayStart }, status: { in: paidStatuses } },
            _sum: { totalAmount: true },
          }),
          prisma.order.findMany({
            where: { serverId },
            orderBy: { createdAt: 'desc' },
            take: 5,
            include: { product: { select: { name: true, price: true } } },
          }),
          prisma.order.findMany({
            where: { serverId, createdAt: { gte: since }, status: { in: paidStatuses } },
            select: { createdAt: true, totalAmount: true },
            orderBy: { createdAt: 'asc' },
          }),
          prisma.order.aggregate({
            where: { serverId, createdAt: { gte: monthStart }, status: { in: paidStatuses } },
            _sum: { commissionAmt: true },
          }),
          prisma.order.aggregate({
            where: { serverId, status: { in: paidStatuses } },
            _sum: { ownerAmount: true },
          }),
          prisma.order.count({ where: { serverId, status: OrderStatus.PAID } }),
          prisma.product.count({ where: { serverId, stock: 0 } }),
          prisma.order.aggregate({
            where: { serverId, createdAt: { gte: monthStart }, status: { in: paidStatuses } },
            _sum: { totalAmount: true },
          }),
          prisma.order.count({
            where: { serverId, createdAt: { gte: since }, status: { in: paidStatuses } },
          }),
          prisma.order.aggregate({
            where: { serverId, createdAt: { gte: previousSince, lt: since }, status: { in: paidStatuses } },
            _sum: { totalAmount: true },
          }),
        ]);

        const daysMap: Record<string, number> = {};
        for (let i = 0; i < days; i++) {
          const d = new Date(todayStart.getTime() - i * 24 * 60 * 60 * 1000);
          daysMap[d.toISOString().slice(0, 10)] = 0;
        }
        for (const o of dailyRevenue) {
          const key = o.createdAt.toISOString().slice(0, 10);
          if (daysMap[key] !== undefined) daysMap[key] += Number(o.totalAmount);
        }

        const currentPeriodRevenue = dailyRevenue.reduce((s, o) => s + Number(o.totalAmount), 0);
        const previousPeriodRevenue = Number(previousRevenue._sum.totalAmount) || 0;
        const momsTrend = previousPeriodRevenue > 0
          ? ((currentPeriodRevenue - previousPeriodRevenue) / previousPeriodRevenue) * 100
          : currentPeriodRevenue > 0 ? 100 : 0;

        return {
          ordersToday,
          revenueToday: revenueToday._sum.totalAmount || 0,
          balance: wallet?.balance || 0,
          totalEarned: earnedSum._sum.ownerAmount || 0,
          undeliveredOrders,
          outOfStockProducts: outOfStockCount,
          monthlyCommission: monthlyCommission._sum.commissionAmt || 0,
          monthlyRevenue: monthlyRevenue._sum.totalAmount || 0,
          currentOrders,
          previousPeriodRevenue,
          momsTrend,
          recentOrders,
          dailyRevenue: Object.entries(daysMap)
            .sort(([a], [b]) => a.localeCompare(b))
            .map(([date, amount]) => ({ date, amount })),
        };
      } catch (err) {
        req.log.error(err, 'Stats error');
        throw err;
      }
    },
  );

  // ─── Conversion ────────────────────────────────────────────
  app.get(
    '/api/servers/:id/stats/conversion',
    { preHandler: [app.authenticate], schema: { tags: ['servers'] } },
    async (req, reply) => {
      try {
        const { id: serverId } = req.params as RouteParams;
        if (!(await serverAccess(req as never, reply as never, serverId))) return;

        const { since } = parsePeriod(req.query as { period?: string });
        const paidStatuses = [OrderStatus.PAID, OrderStatus.DELIVERED];

        const [pageViews, totalOrders] = await Promise.all([
          prisma.pageView.count({
            where: { serverId, createdAt: { gte: since } },
          }),
          prisma.order.count({
            where: { serverId, createdAt: { gte: since }, status: { in: paidStatuses } },
          }),
        ]);

        return {
          totalViews: pageViews,
          totalOrders,
          conversionRate: pageViews > 0 ? Number(((totalOrders / pageViews) * 100).toFixed(2)) : 0,
        };
      } catch (err) {
        req.log.error(err, 'Conversion error');
        throw err;
      }
    },
  );

  // ─── Top products ──────────────────────────────────────────
  app.get(
    '/api/servers/:id/stats/top-products',
    { preHandler: [app.authenticate], schema: { tags: ['servers'] } },
    async (req, reply) => {
      try {
        const { id: serverId } = req.params as RouteParams;
        if (!(await serverAccess(req as never, reply as never, serverId))) return;

        const { since } = parsePeriod(req.query as { period?: string });
        const paidStatuses = [OrderStatus.PAID, OrderStatus.DELIVERED];

        const products = await prisma.order.groupBy({
          by: ['productId'],
          where: { serverId, createdAt: { gte: since }, status: { in: paidStatuses } },
          _count: { id: true },
          _sum: { totalAmount: true },
          orderBy: { _sum: { totalAmount: 'desc' } },
          take: 10,
        });

        const productIds = products.map((p) => p.productId);
        const productNames = productIds.length > 0
          ? await prisma.product.findMany({
              where: { id: { in: productIds } },
              select: { id: true, name: true, type: true },
            })
          : [];
        const nameMap = new Map(productNames.map((p) => [p.id, p]));

        return products.map((p) => ({
          productId: p.productId,
          productName: nameMap.get(p.productId)?.name || 'Unknown',
          productType: nameMap.get(p.productId)?.type || null,
          orders: p._count.id,
          revenue: p._sum.totalAmount || 0,
        }));
      } catch (err) {
        req.log.error(err, 'Top products error');
        throw err;
      }
    },
  );
}
