import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import crypto from 'node:crypto';
import geoip from 'geoip-lite';
import prisma from '../plugins/prisma.js';

interface RouteParams {
  id: string;
  [key: string]: string;
}

const pageViewSchema = z.object({
  serverId: z.string().nullable().optional(),
});

export default async function analyticsRoutes(app: FastifyInstance) {
  app.post(
    '/api/analytics/pageview',
    { config: { rateLimit: { max: 30, timeWindow: '1 minute' } }, schema: { tags: ['analytics'] } },
    async (req, reply) => {
      const parsed = pageViewSchema.safeParse(req.body);
      if (!parsed.success) return reply.status(400).send({ error: parsed.error.flatten() });

      const ip = req.ip || 'unknown';
      const ipHash = crypto.createHash('sha256').update(ip).digest('hex');
      const serverId = parsed.data.serverId || null;

      const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
      const existing = await prisma.pageView.findFirst({
        where: {
          ipHash,
          serverId: serverId || undefined,
          createdAt: { gte: oneHourAgo },
        },
        select: { id: true },
      });
      if (existing) return reply.status(204).send();

      let country: string | null = null;
      let city: string | null = null;
      if (ip !== '127.0.0.1' && ip !== '::1' && ip !== '::ffff:127.0.0.1') {
        const geo = geoip.lookup(ip);
        if (geo) {
          country = geo.country;
          city = geo.city;
        }
      }

      const userAgent = req.headers['user-agent'] || null;

      await prisma.pageView.create({
        data: { serverId, ipHash, country, city, userAgent },
      });

      return reply.status(201).send({ ok: true });
    },
  );

  app.get(
    '/api/servers/:id/stats/views',
    { preHandler: [app.authenticate], schema: { tags: ['analytics'] } },
    async (req, reply) => {
      const { id: userId } = req.user;
      const { id: serverId } = req.params as RouteParams;
      const query = z.object({ period: z.enum(['7d', '30d']).optional().default('7d') }).parse(req.query);
      const period = query.period === '30d' ? 30 : 7;

      const server = await prisma.server.findUnique({ where: { id: serverId }, select: { ownerId: true } });
      const member = await prisma.serverMember.findUnique({
        where: { serverId_userId: { serverId, userId } },
      });
      if (server?.ownerId !== userId && !member) {
        return reply.status(403).send({ error: 'Access denied' });
      }

      const since = new Date(Date.now() - period * 24 * 60 * 60 * 1000);

      const [totalViews, uniqueVisitors, viewsByDayRaw] = await Promise.all([
        prisma.pageView.count({ where: { serverId, createdAt: { gte: since } } }),
        prisma.pageView
          .groupBy({
            by: ['ipHash'],
            where: { serverId, createdAt: { gte: since } },
            _count: true,
          })
          .then((rows) => rows.length),
        prisma.pageView.findMany({
          where: { serverId, createdAt: { gte: since } },
          select: { createdAt: true, ipHash: true },
          orderBy: { createdAt: 'asc' },
        }),
      ]);

      const now = new Date();
      const dayMap: Record<string, { total: number; ips: Set<string> }> = {};
      for (let i = 0; i < period; i++) {
        const d = new Date(now.getFullYear(), now.getMonth(), now.getDate() - i);
        const key = d.toISOString().slice(0, 10);
        dayMap[key] = { total: 0, ips: new Set() };
      }

      for (const v of viewsByDayRaw) {
        const key = v.createdAt.toISOString().slice(0, 10);
        if (dayMap[key]) {
          dayMap[key].total++;
          dayMap[key].ips.add(v.ipHash);
        }
      }

      const viewsByDay = Object.entries(dayMap)
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([date, data]) => ({ date, total: data.total, unique: data.ips.size }));

      return { totalViews, uniqueVisitors, viewsByDay };
    },
  );

  app.get(
    '/api/admin/stats/views',
    { preHandler: [app.authenticate, app.authStaff], schema: { tags: ['analytics'] } },
    async () => {
      const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

      const [totalPlatformViewsRaw, serverViewsRaw] = await Promise.all([
        prisma.pageView.groupBy({
          by: ['ipHash'],
          where: { serverId: null, createdAt: { gte: thirtyDaysAgo } },
          _count: true,
        }),
        prisma.pageView.groupBy({
          by: ['serverId'],
          where: { serverId: { not: null }, createdAt: { gte: thirtyDaysAgo } },
          _count: true,
          orderBy: { _count: { serverId: 'desc' } },
          take: 5,
        }),
      ]);

      const serverIds = serverViewsRaw.map((s) => s.serverId!);
      const serverMap: Record<string, { name: string; gameType: string }> = {};
      if (serverIds.length > 0) {
        const serversData = await prisma.server.findMany({
          where: { id: { in: serverIds } },
          select: { id: true, name: true, gameType: true },
        });
        for (const s of serversData) serverMap[s.id] = { name: s.name, gameType: s.gameType };
      }

      const uniqueVisitorsPerServer = await Promise.all(
        serverViewsRaw.map(async (s) => {
          const unique = await prisma.pageView.groupBy({
            by: ['ipHash'],
            where: { serverId: s.serverId!, createdAt: { gte: thirtyDaysAgo } },
            _count: true,
          });
          return { serverId: s.serverId!, unique: unique.length };
        }),
      );
      const uniqueMap: Record<string, number> = {};
      for (const u of uniqueVisitorsPerServer) uniqueMap[u.serverId] = u.unique;

      const topServers = serverViewsRaw.map((s) => ({
        id: s.serverId!,
        name: serverMap[s.serverId!]?.name || 'Unknown',
        game: serverMap[s.serverId!]?.gameType || 'unknown',
        totalViews: s._count,
        uniqueVisitors: uniqueMap[s.serverId!] || 0,
      }));

      const allViews = await prisma.pageView.findMany({
        where: { createdAt: { gte: thirtyDaysAgo } },
        select: { createdAt: true, ipHash: true, serverId: true },
        orderBy: { createdAt: 'asc' },
      });

      const now = new Date();
      const dayMap: Record<string, { total: number; ips: Set<string> }> = {};
      for (let i = 0; i < 30; i++) {
        const d = new Date(now.getFullYear(), now.getMonth(), now.getDate() - i);
        const key = d.toISOString().slice(0, 10);
        dayMap[key] = { total: 0, ips: new Set() };
      }

      for (const v of allViews) {
        const key = v.createdAt.toISOString().slice(0, 10);
        if (dayMap[key]) {
          dayMap[key].total++;
          dayMap[key].ips.add(v.ipHash);
        }
      }

      const viewsByDay = Object.entries(dayMap)
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([date, data]) => ({ date, total: data.total, unique: data.ips.size }));

      return {
        totalPlatformViews: totalPlatformViewsRaw.length,
        topServers,
        viewsByDay,
      };
    },
  );
}
