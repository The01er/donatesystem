import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { z } from 'zod';
import crypto from 'node:crypto';
import prisma from '../plugins/prisma.js';
import { OrderStatus } from '../constants/order-status.js';
import { RevokeStatus } from '../constants/revoke-status.js';
import { RouteParams } from '../validators/common.js';
import { getServerMemberRole } from '../services/helpers.js';
import { sendNotification, parseNotificationConfig } from '../services/notification-service.js';

// Extend FastifyRequest to carry plugin token data
interface PluginTokenPayload {
  server: { id: string; name: string; slug: string; blockedAt: Date | null };
}

declare module 'fastify' {
  interface FastifyRequest {
    pluginToken?: PluginTokenPayload;
  }
}

const lastSeenCache = new Map<string, number>();
const LAST_SEEN_TTL_MS = 30_000;

async function authenticatePlugin(req: FastifyRequest, reply: FastifyReply) {
  const token = (req.headers['x-plugin-token'] as string) || '';
  if (!token) {
    return reply.status(401).send({ error: 'Plugin token required' });
  }

  const pluginToken = await prisma.serverPluginToken.findUnique({
    where: { token },
    include: { server: true },
  });

  if (!pluginToken) {
    return reply.status(401).send({ error: 'Invalid plugin token' });
  }

  if (!pluginToken.isActive) {
    return reply.status(401).send({ error: 'Plugin token is disabled' });
  }

  if (pluginToken.server.blockedAt) {
    return reply.status(403).send({ error: 'Server is blocked' });
  }

  const lastUpdate = lastSeenCache.get(pluginToken.id);
  if (!lastUpdate || Date.now() - lastUpdate > LAST_SEEN_TTL_MS) {
    lastSeenCache.set(pluginToken.id, Date.now());
    prisma.serverPluginToken
      .update({
        where: { id: pluginToken.id },
        data: { lastSeen: new Date() },
      })
      .catch((err) => {
        req.log.error({ err, tokenId: pluginToken.id }, 'Failed to update plugin token lastSeen');
      });
  }

  req.pluginToken = {
    server: {
      id: pluginToken.server.id,
      name: pluginToken.server.name,
      slug: pluginToken.server.slug,
      blockedAt: pluginToken.server.blockedAt,
    },
  };
}

function maskToken(token: string): string {
  if (token.length <= 8) return token;
  return token.slice(0, 4) + '...' + token.slice(-4);
}

const updateTokenSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  isActive: z.boolean().optional(),
});

export default async function pluginRoutes(app: FastifyInstance) {
  // ── Получить заказы на доставку ─────────────────────────

  app.get('/api/plugin/orders', { preHandler: [authenticatePlugin], schema: { tags: ['plugin'] } }, async (req) => {
    const { server } = req.pluginToken!;

    const orders = await prisma.order.findMany({
      where: {
        serverId: server.id,
        status: { in: [OrderStatus.PAID] },
      },
      include: {
        product: {
          select: {
            id: true,
            name: true,
            price: true,
            actionsJson: true,
            actionsSchemaVersion: true,
          },
        },
        deliveryAttempts: {
          orderBy: { createdAt: 'desc' },
          take: 20,
        },
      },
      orderBy: { createdAt: 'asc' },
      take: 50,
    });

    return orders;
  });

  // ── Начать доставку (атомарный переход) ──────────

  app.post(
    '/api/plugin/orders/:orderId/start',
    { preHandler: [authenticatePlugin], schema: { tags: ['plugin'] } },
    async (req, reply) => {
      const { server } = req.pluginToken!;
      const { orderId } = req.params as RouteParams;

      const result = await prisma.order.updateMany({
        where: { id: orderId, serverId: server.id, status: OrderStatus.PAID },
        data: { status: OrderStatus.DELIVERING },
      });

      if (result.count === 0) {
        return reply.status(409).send({ error: 'Order already taken or not found' });
      }

      const updated = await prisma.order.findUnique({
        where: { id: orderId },
        include: {
          product: { select: { id: true, name: true, price: true, actionsJson: true, actionsSchemaVersion: true } },
        },
      });

      return updated;
    },
  );

  // ── Heartbeat ────────────────────────────────────────────

  app.patch(
    '/api/plugin/orders/:orderId/heartbeat',
    { preHandler: [authenticatePlugin], schema: { tags: ['plugin'] } },
    async (req, reply) => {
      const { server } = req.pluginToken!;
      const { orderId } = req.params as RouteParams;

      const result = await prisma.order.updateMany({
        where: { id: orderId, serverId: server.id, status: OrderStatus.DELIVERING },
        data: { heartbeatAt: new Date() },
      });

      if (result.count === 0) {
        return reply.status(404).send({ error: 'Order not found or not in delivering state' });
      }

      return { ok: true };
    },
  );

  // ── Сообщить о результате выполнения действия ───────────

  app.post(
    '/api/plugin/orders/:orderId/action-result',
    { preHandler: [authenticatePlugin], schema: { tags: ['plugin'] } },
    async (req, reply) => {
      const { server } = req.pluginToken!;
      const { orderId } = req.params as RouteParams;

      const schema = z.object({
        actionIndex: z.number().int().min(0),
        actionType: z.string().min(1),
        status: z.enum(['success', 'failed']),
        error: z.string().optional(),
      });

      const parsed = schema.safeParse(req.body);
      if (!parsed.success) {
        return reply.status(400).send({ error: parsed.error.flatten() });
      }

      const order = await prisma.order.findFirst({
        where: { id: orderId, serverId: server.id, status: OrderStatus.DELIVERING },
        include: { product: true },
      });

      if (!order) {
        return reply.status(404).send({ error: 'Order not found or not in delivering state' });
      }

      const { actionIndex, actionType, status } = parsed.data;
      const error = parsed.data.error;

      const result = await prisma.$transaction(async (tx) => {
        const attempt = await tx.deliveryAttempt.create({
          data: {
            orderId,
            actionIndex,
            actionType,
            status: status === 'success' ? 'success' : 'failed',
            error,
            rollbackStatus: null,
          },
        });

        if (status === 'failed') {
          const newRetryCount = order.retryCount + 1;
          const newStatus = newRetryCount >= order.maxRetries ? OrderStatus.FAILED : OrderStatus.PAID;

          const updated = await tx.order.updateMany({
            where: { id: orderId, status: OrderStatus.DELIVERING },
            data: {
              status: newStatus,
              retryCount: newRetryCount,
              lastError: error || 'Unknown error',
              heartbeatAt: new Date(),
              committedActions: null,
            },
          });

          if (updated.count === 0) {
            return { attempt, status: OrderStatus.PAID, rollbackRequired: false, message: 'Order already processed' };
          }

          if (order.committedActions) {
            try {
              const committed = JSON.parse(order.committedActions) as number[];
              return {
                attempt,
                status: newStatus,
                rollbackRequired: true,
                committedActions: committed,
                message: `Delivery failed at action #${actionIndex}. Rollback required for committed actions: [${committed.join(', ')}]`,
              };
            } catch (e: unknown) {
              req.log.error(e, 'Failed to parse committedActions');
              return { attempt, status: newStatus, rollbackRequired: false, corruptedCommitted: true };
            }
          }

          return { attempt, status: newStatus, rollbackRequired: false };
        }

        const committed: number[] = (() => {
          try {
            return order.committedActions ? JSON.parse(order.committedActions) : [];
          } catch {
            return [];
          }
        })();
        committed.push(actionIndex);

        await tx.order.update({
          where: { id: orderId },
          data: { committedActions: JSON.stringify(committed), heartbeatAt: new Date() },
        });

        return { attempt, committedActions: committed };
      });

      if (result.status === OrderStatus.FAILED) {
        const sv = await prisma.server.findUnique({
          where: { id: server.id },
          select: { notificationConfig: true, name: true },
        });
        if (sv) {
          const ncfg = parseNotificationConfig(sv.notificationConfig);
          sendNotification(ncfg, 'order.failed', {
            'Заказ': `#${orderId.slice(0, 8)}`,
            'Игрок': order.playerName || '—',
            'Ошибка': error || 'Неизвестная ошибка',
          }, sv.name).catch((e: unknown) => { req.log.error(e, 'Notification failed: order delivered'); });
        }
      }

      return result;
    },
  );

  // ── Завершить доставку (успех) ───────────────────────────

  app.post(
    '/api/plugin/orders/:orderId/complete',
    { preHandler: [authenticatePlugin], schema: { tags: ['plugin'] } },
    async (req, reply) => {
      const { server } = req.pluginToken!;
      const { orderId } = req.params as RouteParams;

      const order = await prisma.order.findFirst({
        where: { id: orderId, serverId: server.id, status: OrderStatus.DELIVERING },
        select: { id: true, playerName: true, totalAmount: true, ownerAmount: true, commissionPct: true },
      });

      if (!order) {
        return reply.status(404).send({ error: 'Order not found or not in delivering state' });
      }

      const result = await prisma.order.updateMany({
        where: { id: orderId, status: OrderStatus.DELIVERING },
        data: { status: OrderStatus.DELIVERED },
      });

      if (result.count === 0) {
        return reply.status(409).send({ error: 'Order already completed or status changed' });
      }

      const sv = await prisma.server.findUnique({
        where: { id: server.id },
        select: { notificationConfig: true, name: true },
      });
      if (sv) {
        const ncfg = parseNotificationConfig(sv.notificationConfig);
        sendNotification(ncfg, 'order.delivered', {
          'Заказ': `#${orderId.slice(0, 8)}`,
          'Игрок': order.playerName || '—',
        }, sv.name).catch((e: unknown) => { req.log.error(e, 'Notification failed: order delivered'); });
      }

      return { status: OrderStatus.DELIVERED, orderId };
    },
  );

  // ── Сообщить об откате действия ──────────────────────────

  app.post(
    '/api/plugin/orders/:orderId/rollback-result',
    { preHandler: [authenticatePlugin], schema: { tags: ['plugin'] } },
    async (req, reply) => {
      const { server } = req.pluginToken!;
      const { orderId } = req.params as RouteParams;

      const schema = z.object({
        attemptId: z.string().uuid(),
        actionIndex: z.number().int().min(0),
        status: z.enum(['rolled_back', 'rollback_failed']),
        error: z.string().optional(),
      });

      const parsed = schema.safeParse(req.body);
      if (!parsed.success) {
        return reply.status(400).send({ error: parsed.error.flatten() });
      }

      const order = await prisma.order.findFirst({
        where: { id: orderId, serverId: server.id },
      });

      if (!order) {
        return reply.status(404).send({ error: 'Order not found' });
      }

      await prisma.deliveryAttempt.update({
        where: { id: parsed.data.attemptId },
        data: { rollbackStatus: parsed.data.status },
      });

      return { ok: true };
    },
  );

  // ── Получить отзывы привилегий ────────────────────────

  app.get(
    '/api/plugin/revocations',
    { preHandler: [authenticatePlugin], schema: { tags: ['plugin'] } },
    async (req) => {
      const { server } = req.pluginToken!;

      const orders = await prisma.order.findMany({
        where: {
          serverId: server.id,
          revokeStatus: RevokeStatus.PENDING,
        },
        select: {
          id: true,
          playerName: true,
          revokeCommand: true,
          serverId: true,
        },
      });

      return orders;
    },
  );

  // ── Сообщить о результате отзыва ─────────────────────

  app.post(
    '/api/plugin/orders/:orderId/revocation-result',
    { preHandler: [authenticatePlugin], schema: { tags: ['plugin'] } },
    async (req, reply) => {
      const { server } = req.pluginToken!;
      const { orderId } = req.params as RouteParams;

      const schema = z.object({
        status: z.enum(['revoked', 'failed']),
        error: z.string().optional(),
      });

      const parsed = schema.safeParse(req.body);
      if (!parsed.success) {
        return reply.status(400).send({ error: parsed.error.flatten() });
      }

      const result = await prisma.$transaction(async (tx) => {
        const updated = await tx.order.updateMany({
          where: { id: orderId, serverId: server.id, revokeStatus: RevokeStatus.PENDING },
          data: {
            revokeStatus: parsed.data.status,
            lastError: parsed.data.status === RevokeStatus.FAILED ? (parsed.data.error || 'Revocation failed') : undefined,
          },
        });

        if (updated.count === 0) return null;

        await tx.deliveryAttempt.create({
          data: {
            orderId,
            actionIndex: -1,
            actionType: 'revoke_command',
            status: parsed.data.status === RevokeStatus.REVOKED ? 'success' : 'failed',
            error: parsed.data.error || null,
          },
        });

        return { ok: true, revokeStatus: parsed.data.status };
      });

      if (!result) {
        return reply.status(404).send({ error: 'Revocation not found or already processed' });
      }

      return result;
    },
  );

  // ── Token management ────────────────────────────────────

  app.post(
    '/api/servers/:id/plugin-tokens',
    { preHandler: [app.authenticate], schema: { tags: ['plugin'] } },
    async (req, reply) => {
      const { id: userId } = req.user;
      const { id: serverId } = req.params as RouteParams;

      const role = await getServerMemberRole(userId, serverId);
      const server = await prisma.server.findFirst({
        where: { id: serverId },
        select: { ownerId: true },
      });
      if (!server || (server.ownerId !== userId && role !== 'admin')) {
        return reply.status(404).send({ error: 'Not found' });
      }

      const { name } = (req.body as { name?: string }) || {};
      const token = crypto.randomBytes(32).toString('hex');

      const pluginToken = await prisma.serverPluginToken.create({
        data: {
          serverId,
          token,
          name: name || 'Default',
          isActive: true,
        },
      });

      return {
        id: pluginToken.id,
        serverId: pluginToken.serverId,
        name: pluginToken.name,
        isActive: pluginToken.isActive,
        token: pluginToken.token,
        lastSeen: pluginToken.lastSeen,
        createdAt: pluginToken.createdAt,
      };
    },
  );

  app.get(
    '/api/servers/:id/plugin-tokens',
    { preHandler: [app.authenticate], schema: { tags: ['plugin'] } },
    async (req, reply) => {
      const { id: userId } = req.user;
      const { id: serverId } = req.params as RouteParams;

      const role = await getServerMemberRole(userId, serverId);
      const server = await prisma.server.findFirst({
        where: { id: serverId },
        select: { ownerId: true },
      });
      if (!server || (server.ownerId !== userId && !role)) {
        return reply.status(404).send({ error: 'Not found' });
      }

      const tokens = await prisma.serverPluginToken.findMany({
        where: { serverId },
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          serverId: true,
          name: true,
          isActive: true,
          token: true,
          lastSeen: true,
          createdAt: true,
        },
      });

      return tokens.map((t) => ({
        id: t.id,
        serverId: t.serverId,
        name: t.name,
        isActive: t.isActive,
        maskedToken: maskToken(t.token),
        lastSeen: t.lastSeen,
        createdAt: t.createdAt,
      }));
    },
  );

  app.patch(
    '/api/servers/:id/plugin-tokens/:tokenId',
    { preHandler: [app.authenticate], schema: { tags: ['plugin'] } },
    async (req, reply) => {
      const { id: userId } = req.user;
      const { id: serverId, tokenId } = req.params as RouteParams & { tokenId: string };

      const parsed = updateTokenSchema.safeParse(req.body);
      if (!parsed.success) {
        return reply.status(400).send({ error: parsed.error.flatten() });
      }

      const role = await getServerMemberRole(userId, serverId);
      const server = await prisma.server.findFirst({
        where: { id: serverId },
        select: { ownerId: true },
      });
      if (!server || (server.ownerId !== userId && role !== 'admin')) {
        return reply.status(404).send({ error: 'Not found' });
      }

      const token = await prisma.serverPluginToken.findFirst({
        where: { id: tokenId, serverId },
      });
      if (!token) return reply.status(404).send({ error: 'Token not found' });

      const updated = await prisma.serverPluginToken.update({
        where: { id: tokenId },
        data: parsed.data,
      });

      return {
        id: updated.id,
        serverId: updated.serverId,
        name: updated.name,
        isActive: updated.isActive,
        maskedToken: maskToken(updated.token),
        lastSeen: updated.lastSeen,
        createdAt: updated.createdAt,
      };
    },
  );

  app.post(
    '/api/servers/:id/plugin-tokens/:tokenId/regenerate',
    { preHandler: [app.authenticate], schema: { tags: ['plugin'] } },
    async (req, reply) => {
      const { id: userId } = req.user;
      const { id: serverId, tokenId } = req.params as RouteParams & { tokenId: string };

      const role = await getServerMemberRole(userId, serverId);
      const server = await prisma.server.findFirst({
        where: { id: serverId },
        select: { ownerId: true },
      });
      if (!server || (server.ownerId !== userId && role !== 'admin')) {
        return reply.status(404).send({ error: 'Not found' });
      }

      const token = await prisma.serverPluginToken.findFirst({
        where: { id: tokenId, serverId },
      });
      if (!token) return reply.status(404).send({ error: 'Token not found' });

      const newToken = crypto.randomBytes(32).toString('hex');

      const updated = await prisma.serverPluginToken.update({
        where: { id: tokenId },
        data: { token: newToken },
      });

      return {
        id: updated.id,
        serverId: updated.serverId,
        name: updated.name,
        isActive: updated.isActive,
        token: updated.token,
        lastSeen: updated.lastSeen,
        createdAt: updated.createdAt,
      };
    },
  );

  app.delete(
    '/api/servers/:id/plugin-tokens/:tokenId',
    { preHandler: [app.authenticate], schema: { tags: ['plugin'] } },
    async (req, reply) => {
      const { id: userId } = req.user;
      const { id: serverId, tokenId } = req.params as RouteParams & { tokenId: string };

      const role = await getServerMemberRole(userId, serverId);
      const server = await prisma.server.findFirst({
        where: { id: serverId },
        select: { ownerId: true },
      });
      if (!server || (server.ownerId !== userId && role !== 'admin')) {
        return reply.status(404).send({ error: 'Not found' });
      }

      await prisma.serverPluginToken.delete({ where: { id: tokenId } });
      return { ok: true };
    },
  );
}
