import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import prisma from '../plugins/prisma.js';
import { sendNotification, parseNotificationConfig, NOTIFICATION_EVENTS } from '../services/notification-service.js';

interface RouteParams {
  id: string;
}

const notificationConfigSchema = z.object({
  discordUrl: z.string().url().optional().or(z.literal('')),
  telegramToken: z.string().optional().or(z.literal('')),
  telegramChatId: z.string().optional().or(z.literal('')),
  events: z.array(z.enum(['order.paid', 'order.failed', 'order.delivered', 'withdrawal', 'subscription', 'stock.empty'])),
});

export default async function notificationRoutes(app: FastifyInstance) {
  app.addHook('preHandler', app.authenticate);

  app.get<{ Params: RouteParams }>('/api/servers/:id/notifications', {
    schema: { tags: ['notifications'] },
  }, async (req, reply) => {
    const { id } = req.params;
    const server = await prisma.server.findUnique({
      where: { id },
      select: { ownerId: true, notificationConfig: true, name: true },
    });
    if (!server) return reply.status(404).send({ error: 'Server not found' });
    if (server.ownerId !== req.user!.id) return reply.status(403).send({ error: 'Access denied' });

    const config = parseNotificationConfig(server.notificationConfig);
    return {
      discordUrl: config.discordUrl || '',
      telegramToken: config.telegramToken || '',
      telegramChatId: config.telegramChatId || '',
      events: config.events,
      availableEvents: NOTIFICATION_EVENTS,
    };
  });

  app.put<{ Params: RouteParams; Body: unknown }>('/api/servers/:id/notifications', {
    schema: { tags: ['notifications'] },
  }, async (req, reply) => {
    const { id } = req.params;
    const parsed = notificationConfigSchema.safeParse(req.body);
    if (!parsed.success) return reply.status(400).send({ error: parsed.error.flatten() });

    const server = await prisma.server.findUnique({ where: { id }, select: { ownerId: true } });
    if (!server) return reply.status(404).send({ error: 'Server not found' });
    if (server.ownerId !== req.user!.id) return reply.status(403).send({ error: 'Access denied' });

    const data = parsed.data;
    const config: Record<string, unknown> = {
      discordUrl: data.discordUrl || undefined,
      telegramToken: data.telegramToken || undefined,
      telegramChatId: data.telegramChatId || undefined,
      events: data.events,
    };

    await prisma.server.update({
      where: { id },
      data: { notificationConfig: config },
    });

    return { ok: true };
  });

  app.post<{ Params: RouteParams }>('/api/servers/:id/notifications/test', {
    config: { rateLimit: { max: 5, timeWindow: '5 minutes' } },
    schema: { tags: ['notifications'] },
  }, async (req, reply) => {
    const { id } = req.params;
    const server = await prisma.server.findUnique({
      where: { id },
      select: { ownerId: true, notificationConfig: true, name: true },
    });
    if (!server) return reply.status(404).send({ error: 'Server not found' });
    if (server.ownerId !== req.user!.id) return reply.status(403).send({ error: 'Access denied' });

    const config = parseNotificationConfig(server.notificationConfig);
    const hasAny = config.discordUrl || (config.telegramToken && config.telegramChatId);
    if (!hasAny) {
      return reply.status(400).send({ error: 'Уведомления не настроены. Укажите Discord webhook или Telegram.' });
    }

    try {
      await sendNotification(config, 'test', { message: 'Тестовое уведомление' }, server.name);
      return { ok: true };
    } catch (err) {
      return reply.status(502).send({ error: err instanceof Error ? err.message : 'Failed to send' });
    }
  });
}
