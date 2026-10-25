import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import prisma from '../plugins/prisma.js';

const createNewsSchema = z.object({
  title: z.string().min(1).max(200),
  content: z.string().min(1),
  published: z.boolean().optional().default(false),
});

const updateNewsSchema = z.object({
  title: z.string().min(1).max(200).optional(),
  content: z.string().min(1).optional(),
  published: z.boolean().optional(),
});

export default async function newsRoutes(app: FastifyInstance) {
  app.get('/api/news', { schema: { tags: ['news'] } }, async () => {
    return prisma.news.findMany({
      where: { published: true },
      orderBy: { createdAt: 'desc' },
      select: { id: true, title: true, content: true, createdAt: true, updatedAt: true },
    });
  });

  app.get('/api/news/:id', { schema: { tags: ['news'] } }, async (req, reply) => {
    const { id } = req.params as { id: string };
    const news = await prisma.news.findUnique({
      where: { id },
      select: { id: true, title: true, content: true, createdAt: true, updatedAt: true },
    });
    if (!news) return reply.status(404).send({ error: 'News not found' });
    return news;
  });

  // ── Admin endpoints ────────────────────────────────────────
  app.post(
    '/api/news',
    { preHandler: [app.authenticate, app.authStaff], schema: { tags: ['news'] } },
    async (req, reply) => {
      const parsed = createNewsSchema.safeParse(req.body);
      if (!parsed.success) return reply.status(400).send({ error: parsed.error.flatten() });
      return prisma.news.create({ data: parsed.data });
    },
  );

  app.put(
    '/api/news/:id',
    { preHandler: [app.authenticate, app.authStaff], schema: { tags: ['news'] } },
    async (req, reply) => {
      const { id } = req.params as { id: string };
      const parsed = updateNewsSchema.safeParse(req.body);
      if (!parsed.success) return reply.status(400).send({ error: parsed.error.flatten() });

      const existing = await prisma.news.findUnique({ where: { id } });
      if (!existing) return reply.status(404).send({ error: 'News not found' });

      return prisma.news.update({ where: { id }, data: parsed.data });
    },
  );

  app.delete(
    '/api/news/:id',
    { preHandler: [app.authenticate, app.authStaff], schema: { tags: ['news'] } },
    async (req, reply) => {
      const { id } = req.params as { id: string };
      const existing = await prisma.news.findUnique({ where: { id } });
      if (!existing) return reply.status(404).send({ error: 'News not found' });
      await prisma.news.delete({ where: { id } });
      return { ok: true };
    },
  );
}
