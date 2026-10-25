import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import prisma from '../plugins/prisma.js';

const createFaqSchema = z.object({
  question: z.string().min(1).max(500),
  answer: z.string().min(1),
  sortOrder: z.number().int().optional().default(0),
});

const updateFaqSchema = z.object({
  question: z.string().min(1).max(500).optional(),
  answer: z.string().min(1).optional(),
  sortOrder: z.number().int().optional(),
});

export default async function faqRoutes(app: FastifyInstance) {
  app.get('/api/faq', { schema: { tags: ['faq'] } }, async () => {
    return prisma.faq.findMany({
      orderBy: { sortOrder: 'asc' },
      select: { id: true, question: true, answer: true, sortOrder: true, createdAt: true, updatedAt: true },
    });
  });

  // ── Admin endpoints ────────────────────────────────────────
  app.post(
    '/api/faq',
    { preHandler: [app.authenticate, app.authStaff], schema: { tags: ['faq'] } },
    async (req, reply) => {
      const parsed = createFaqSchema.safeParse(req.body);
      if (!parsed.success) return reply.status(400).send({ error: parsed.error.flatten() });
      return prisma.faq.create({ data: parsed.data });
    },
  );

  app.put(
    '/api/faq/:id',
    { preHandler: [app.authenticate, app.authStaff], schema: { tags: ['faq'] } },
    async (req, reply) => {
      const { id } = req.params as { id: string };
      const parsed = updateFaqSchema.safeParse(req.body);
      if (!parsed.success) return reply.status(400).send({ error: parsed.error.flatten() });

      const existing = await prisma.faq.findUnique({ where: { id } });
      if (!existing) return reply.status(404).send({ error: 'FAQ not found' });

      return prisma.faq.update({ where: { id }, data: parsed.data });
    },
  );

  app.delete(
    '/api/faq/:id',
    { preHandler: [app.authenticate, app.authStaff], schema: { tags: ['faq'] } },
    async (req, reply) => {
      const { id } = req.params as { id: string };
      const existing = await prisma.faq.findUnique({ where: { id } });
      if (!existing) return reply.status(404).send({ error: 'FAQ not found' });
      await prisma.faq.delete({ where: { id } });
      return { ok: true };
    },
  );
}
