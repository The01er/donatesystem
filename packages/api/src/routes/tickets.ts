import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { EventEmitter } from 'events';
import prisma from '../plugins/prisma.js';
import { createTicketSchema, ticketMessageSchema, updateTicketSchema } from '../validators/tickets.js';

const ticketEvents = new EventEmitter();
ticketEvents.setMaxListeners(1000);

const paginationSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  status: z.enum(['open', 'answered', 'closed']).optional(),
});

export { ticketEvents };

export default async function ticketRoutes(app: FastifyInstance) {
  // ── User endpoints ─────────────────────────────────────────

  app.get('/api/tickets', { preHandler: [app.authenticate], schema: { tags: ['tickets'] } }, async (req, reply) => {
    const { id: userId } = req.user;
    const parsed = paginationSchema.safeParse(req.query);
    if (!parsed.success) return reply.status(400).send({ error: parsed.error.flatten() });

    const { page, limit, status } = parsed.data;
    const where: Record<string, unknown> = { userId };
    if (status) where.status = status;

    const [tickets, total] = await Promise.all([
      prisma.ticket.findMany({
        where,
        orderBy: { updatedAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
        select: {
          id: true,
          userId: true,
          serverId: true,
          subject: true,
          status: true,
          priority: true,
          createdAt: true,
          updatedAt: true,
          server: { select: { id: true, name: true } },
        },
      }),
      prisma.ticket.count({ where }),
    ]);

    return {
      tickets,
      pagination: { page, limit, total, pages: Math.ceil(total / limit) },
    };
  });

  app.post('/api/tickets', { preHandler: [app.authenticate], schema: { tags: ['tickets'] } }, async (req, reply) => {
    const { id: userId } = req.user;
    const parsed = createTicketSchema.safeParse(req.body);
    if (!parsed.success) return reply.status(400).send({ error: parsed.error.flatten() });

    const { subject, message, serverId, priority } = parsed.data;

    const ticket = await prisma.$transaction(async (tx) => {
      const t = await tx.ticket.create({
        data: { userId, serverId: serverId ?? null, subject, priority: priority ?? 'medium' },
      });
      const msg = await tx.ticketMessage.create({
        data: { ticketId: t.id, userId, message, isStaff: false },
        select: { id: true, ticketId: true, userId: true, message: true, isStaff: true, createdAt: true },
      });
      const user = await tx.user.findUnique({ where: { id: userId }, select: { email: true } });
      ticketEvents.emit(`ticket:${t.id}`, {
        ...msg,
        createdAt: msg.createdAt.toISOString(),
        user: { email: user?.email || '' },
      });
      return t;
    });

    return reply.status(201).send(ticket);
  });

  app.get('/api/tickets/:id', { preHandler: [app.authenticate], schema: { tags: ['tickets'] } }, async (req, reply) => {
    const { id: userId } = req.user;
    const { id } = req.params as { id: string };

    const ticket = await prisma.ticket.findUnique({
      where: { id },
      select: {
        id: true,
        userId: true,
        serverId: true,
        subject: true,
        status: true,
        priority: true,
        createdAt: true,
        updatedAt: true,
        server: { select: { id: true, name: true } },
      },
    });

    if (!ticket) return reply.status(404).send({ error: 'Ticket not found' });

    const staff = await prisma.platformStaff.findUnique({ where: { userId }, select: { isActive: true } });
    const isStaff = staff?.isActive ?? false;

    if (ticket.userId !== userId && !isStaff) {
      return reply.status(403).send({ error: 'Access denied' });
    }

    const messages = await prisma.ticketMessage.findMany({
      where: { ticketId: id },
      orderBy: { createdAt: 'asc' },
      select: {
        id: true,
        ticketId: true,
        userId: true,
        message: true,
        isStaff: true,
        createdAt: true,
        user: { select: { email: true } },
      },
    });

    return { ticket, messages };
  });

  app.post(
    '/api/tickets/:id/messages',
    { preHandler: [app.authenticate], schema: { tags: ['tickets'] } },
    async (req, reply) => {
      const { id: userId } = req.user;
      const { id } = req.params as { id: string };

      const parsed = ticketMessageSchema.safeParse(req.body);
      if (!parsed.success) return reply.status(400).send({ error: parsed.error.flatten() });

      const ticket = await prisma.ticket.findUnique({
        where: { id },
        select: { id: true, userId: true, status: true },
      });

      if (!ticket) return reply.status(404).send({ error: 'Ticket not found' });

      const staff = await prisma.platformStaff.findUnique({ where: { userId }, select: { isActive: true } });
      const isStaff = staff?.isActive ?? false;

      if (ticket.userId !== userId && !isStaff) {
        return reply.status(403).send({ error: 'Access denied' });
      }

      if (ticket.status === 'closed') {
        return reply.status(400).send({ error: 'Cannot comment on a closed ticket' });
      }

      const msg = await prisma.$transaction(async (tx) => {
        const message = await tx.ticketMessage.create({
          data: {
            ticketId: id,
            userId,
            message: parsed.data.message,
            isStaff,
          },
          select: { id: true, ticketId: true, userId: true, message: true, isStaff: true, createdAt: true },
        });

        await tx.ticket.update({
          where: { id },
          data: {
            updatedAt: new Date(),
            status: isStaff && ticket.status === 'open' ? 'answered' : ticket.status,
          },
        });

        const user = await tx.user.findUnique({ where: { id: userId }, select: { email: true } });
        return { ...message, user: { email: user?.email || '' } };
      });

      const newMsg = {
        id: msg.id,
        ticketId: msg.ticketId,
        userId: msg.userId,
        message: msg.message,
        isStaff: msg.isStaff,
        createdAt: msg.createdAt.toISOString(),
        user: msg.user,
      };

      ticketEvents.emit(`ticket:${id}`, newMsg);

      return reply.status(201).send(newMsg);
    },
  );

  app.patch(
    '/api/tickets/:id/close',
    { preHandler: [app.authenticate], schema: { tags: ['tickets'] } },
    async (req, reply) => {
      const { id: userId } = req.user;
      const { id } = req.params as { id: string };

      const ticket = await prisma.ticket.findUnique({
        where: { id },
        select: { id: true, userId: true, status: true },
      });

      if (!ticket) return reply.status(404).send({ error: 'Ticket not found' });

      const staff = await prisma.platformStaff.findUnique({ where: { userId }, select: { isActive: true } });
      const isStaff = staff?.isActive ?? false;

      if (ticket.userId !== userId && !isStaff) {
        return reply.status(403).send({ error: 'Access denied' });
      }

      if (ticket.status === 'closed') {
        return reply.status(400).send({ error: 'Ticket is already closed' });
      }

      await prisma.ticket.update({
        where: { id },
        data: { status: 'closed', updatedAt: new Date() },
      });

      return { ok: true };
    },
  );

  app.get(
    '/api/tickets/:id/poll',
    { preHandler: [app.authenticate], schema: { tags: ['tickets'] } },
    async (req, reply) => {
      const { id: userId } = req.user;
      const { id } = req.params as { id: string };
      const { since } = req.query as { since?: string };

      const ticket = await prisma.ticket.findUnique({
        where: { id },
        select: { id: true, userId: true, status: true },
      });

      if (!ticket) return reply.status(404).send({ error: 'Ticket not found' });

      const staff = await prisma.platformStaff.findUnique({ where: { userId }, select: { isActive: true } });
      const isStaff = staff?.isActive ?? false;

      if (ticket.userId !== userId && !isStaff) {
        return reply.status(403).send({ error: 'Access denied' });
      }

      const timeoutMs = 30000;
      const startTime = Date.now();

      while (Date.now() - startTime < timeoutMs) {
        const where: Record<string, unknown> = { ticketId: id };
        if (since) {
          where.id = { not: since };
          where.createdAt = { gt: new Date(startTime - timeoutMs) };
        }

        const recentMessages = await prisma.ticketMessage.findMany({
          where: { ticketId: id, ...(since ? { createdAt: { gt: new Date(0) } } : {}) },
          orderBy: { createdAt: 'asc' },
          select: {
            id: true,
            ticketId: true,
            userId: true,
            message: true,
            isStaff: true,
            createdAt: true,
            user: { select: { email: true } },
          },
        });

        const newMessages = since
          ? recentMessages.filter((m) => {
              const sinceMsg = recentMessages.find((x) => x.id === since);
              if (!sinceMsg) return true;
              return new Date(m.createdAt).getTime() > new Date(sinceMsg.createdAt).getTime();
            })
          : recentMessages;

        if (newMessages.length > 0) {
          return { messages: newMessages };
        }

        const ticketStatus = await prisma.ticket.findUnique({
          where: { id },
          select: { status: true },
        });

        if (ticketStatus?.status === 'closed') {
          return { messages: [], closed: true };
        }

        await new Promise<void>((resolve) => {
          const onMessage = () => {
            ticketEvents.removeListener(`ticket:${id}`, onMessage);
            resolve();
          };
          const timer = setTimeout(() => {
            ticketEvents.removeListener(`ticket:${id}`, onMessage);
            resolve();
          }, 2000);
          ticketEvents.once(`ticket:${id}`, () => {
            clearTimeout(timer);
            onMessage();
          });
        });
      }

      return { messages: [], timeout: true };
    },
  );

  // ── Admin endpoints ────────────────────────────────────────

  const adminPaginationSchema = z.object({
    page: z.coerce.number().int().min(1).default(1),
    limit: z.coerce.number().int().min(1).max(100).default(20),
    status: z.enum(['open', 'answered', 'closed']).optional(),
    priority: z.enum(['low', 'medium', 'high']).optional(),
    serverId: z.string().uuid().optional(),
    search: z.string().optional(),
  });

  app.get(
    '/api/admin/tickets',
    { preHandler: [app.authenticate, app.authStaff], schema: { tags: ['tickets'] } },
    async (req, reply) => {
      const parsed = adminPaginationSchema.safeParse(req.query);
      if (!parsed.success) return reply.status(400).send({ error: parsed.error.flatten() });

      const { page, limit, status, priority, serverId, search } = parsed.data;
      const where: Record<string, unknown> = {};
      if (status) where.status = status;
      if (priority) where.priority = priority;
      if (serverId) where.serverId = serverId;
      if (search) where.subject = { contains: search };

      const [tickets, total] = await Promise.all([
        prisma.ticket.findMany({
          where,
          orderBy: { updatedAt: 'desc' },
          skip: (page - 1) * limit,
          take: limit,
          select: {
            id: true,
            userId: true,
            serverId: true,
            subject: true,
            status: true,
            priority: true,
            createdAt: true,
            updatedAt: true,
            user: { select: { id: true, email: true } },
            server: { select: { id: true, name: true } },
            _count: { select: { messages: true } },
          },
        }),
        prisma.ticket.count({ where }),
      ]);

      return {
        tickets,
        pagination: { page, limit, total, pages: Math.ceil(total / limit) },
      };
    },
  );

  app.post(
    '/api/admin/tickets/:id/messages',
    { preHandler: [app.authenticate, app.authStaff], schema: { tags: ['tickets'] } },
    async (req, reply) => {
      const { id: userId } = req.user;
      const { id } = req.params as { id: string };

      const parsed = ticketMessageSchema.safeParse(req.body);
      if (!parsed.success) return reply.status(400).send({ error: parsed.error.flatten() });

      const ticket = await prisma.ticket.findUnique({
        where: { id },
        select: { id: true, status: true },
      });

      if (!ticket) return reply.status(404).send({ error: 'Ticket not found' });

      if (ticket.status === 'closed') {
        return reply.status(400).send({ error: 'Cannot comment on a closed ticket' });
      }

      const msg = await prisma.$transaction(async (tx) => {
        const message = await tx.ticketMessage.create({
          data: {
            ticketId: id,
            userId,
            message: parsed.data.message,
            isStaff: true,
          },
          select: { id: true, ticketId: true, userId: true, message: true, isStaff: true, createdAt: true },
        });

        await tx.ticket.update({
          where: { id },
          data: {
            updatedAt: new Date(),
            status: ticket.status === 'open' ? 'answered' : ticket.status,
          },
        });

        const user = await tx.user.findUnique({ where: { id: userId }, select: { email: true } });
        return { ...message, user: { email: user?.email || '' } };
      });

      const newMsg = {
        id: msg.id,
        ticketId: msg.ticketId,
        userId: msg.userId,
        message: msg.message,
        isStaff: msg.isStaff,
        createdAt: msg.createdAt.toISOString(),
        user: msg.user,
      };

      ticketEvents.emit(`ticket:${id}`, newMsg);

      return reply.status(201).send(newMsg);
    },
  );

  app.patch(
    '/api/admin/tickets/:id',
    { preHandler: [app.authenticate, app.authStaff], schema: { tags: ['tickets'] } },
    async (req, reply) => {
      const { id } = req.params as { id: string };

      const parsed = updateTicketSchema.safeParse(req.body);
      if (!parsed.success) return reply.status(400).send({ error: parsed.error.flatten() });

      const ticket = await prisma.ticket.findUnique({ where: { id }, select: { id: true } });
      if (!ticket) return reply.status(404).send({ error: 'Ticket not found' });

      if (!parsed.data.status && !parsed.data.priority) {
        return reply.status(400).send({ error: 'No fields to update' });
      }

      const updated = await prisma.ticket.update({
        where: { id },
        data: { ...parsed.data, updatedAt: new Date() },
        select: {
          id: true,
          userId: true,
          serverId: true,
          subject: true,
          status: true,
          priority: true,
          createdAt: true,
          updatedAt: true,
        },
      });

      return updated;
    },
  );
}
