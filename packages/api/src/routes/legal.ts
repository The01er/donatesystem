import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { z } from 'zod';
import prisma from '../plugins/prisma.js';
import { RouteParams } from '../validators/common.js';
const PLATFORM_STATUS_LABELS: Record<string, string> = {
  self_employed: 'Самозанятый',
  individual: 'Индивидуальный предприниматель',
};

function fillPlatformPlaceholders(content: string, settings: Record<string, unknown>): string {
  const domain = (settings.platformDomain as string) || 'example.com';
  const mode = (settings.operatingMode as string) || 'self_employed';
  const platformName = (settings.platformName as string) || '';
  const platformInn = (settings.platformInn as string) || '';
  const platformEmail = (settings.platformEmail as string) || '';

  // Replace old hardcoded values from previously seeded documents
  let result = content
    .replace(/\[Ваше ФИО\]/g, platformName || '[Ваше ФИО]')
    .replace(/\[Ваш ИНН\]/g, platformInn || '[Ваш ИНН]')
    .replace(/support@example\.com/g, platformEmail || 'support@example.com')
    .replace(/\(самозанятый\)/g, `(${PLATFORM_STATUS_LABELS[mode]})`);

  // Replace {{...}} placeholders
  return result
    .replace(/\{\{platformName\}\}/g, platformName)
    .replace(/\{\{platformInn\}\}/g, platformInn)
    .replace(/\{\{platformOgrn\}\}/g, (settings.platformOgrn as string) || '')
    .replace(/\{\{platformAddress\}\}/g, (settings.platformAddress as string) || '')
    .replace(/\{\{platformEmail\}\}/g, platformEmail)
    .replace(/\{\{platformPhone\}\}/g, (settings.platformPhone as string) || '')
    .replace(/\{\{platformDomain\}\}/g, domain)
    .replace(/\{\{platformStatus\}\}/g, PLATFORM_STATUS_LABELS[mode] || 'Самозанятый');
}

export default async function legalRoutes(app: FastifyInstance) {
  app.get('/api/legal/:slug', { schema: { tags: ['legal'] } }, async (req: FastifyRequest, reply: FastifyReply) => {
    const { slug } = req.params as RouteParams;
    const doc = await prisma.legalDocument.findUnique({ where: { slug } });
    if (!doc) return reply.status(404).send({ error: 'Document not found' });
    const settings = await prisma.platformSettings.findUnique({ where: { id: 'global' } });
    const content = settings
      ? fillPlatformPlaceholders(doc.content, settings as unknown as Record<string, unknown>)
      : doc.content;
    return { ...doc, content };
  });

  app.get(
    '/api/admin/legal',
    { preHandler: [app.authenticate, app.authStaff], schema: { tags: ['admin'] } },
    async () => {
      const docs = await prisma.legalDocument.findMany({ orderBy: { createdAt: 'asc' } });
      return { items: docs };
    },
  );

  const upsertSchema = z.object({
    title: z.string().min(1).max(200),
    content: z.string().min(1),
  });

  app.put(
    '/api/admin/legal/:slug',
    { preHandler: [app.authenticate, app.authStaff], schema: { tags: ['admin'] } },
    async (req: FastifyRequest, reply: FastifyReply) => {
      const { role } = req.staffMember!;
      if (role !== 'SUPER_ADMIN' && role !== 'ADMIN') {
        return reply.status(403).send({ error: 'Forbidden' });
      }
      const { slug } = req.params as RouteParams;
      const parsed = upsertSchema.safeParse(req.body);
      if (!parsed.success) {
        return reply.status(400).send({ error: parsed.error.flatten() });
      }
      const doc = await prisma.legalDocument.upsert({
        where: { slug },
        create: { slug, ...parsed.data },
        update: parsed.data,
      });
      return doc;
    },
  );

  app.delete(
    '/api/admin/legal/:slug',
    { preHandler: [app.authenticate, app.authStaff], schema: { tags: ['admin'] } },
    async (req: FastifyRequest, reply: FastifyReply) => {
      const { role } = req.staffMember!;
      if (role !== 'SUPER_ADMIN' && role !== 'ADMIN') {
        return reply.status(403).send({ error: 'Forbidden' });
      }
      const { slug } = req.params as RouteParams;
      const existing = await prisma.legalDocument.findUnique({ where: { slug } });
      if (!existing) return reply.status(404).send({ error: 'Document not found' });
      await prisma.legalDocument.delete({ where: { slug } }).catch((e: unknown) => {
        req.log.error(e, 'Failed to delete legal document');
        return reply.status(500).send({ error: 'Failed to delete document' });
      });
      return { ok: true };
    },
  );
}
