import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import prisma from '../plugins/prisma.js';
import { RouteParams } from '../validators/common.js';
import { generateDocument, getStatusLabel, STORE_DOCS } from '../services/legal-document-service.js';

const docSlugs = STORE_DOCS.map((d) => d.slug);

const updateSchema = z.object({
  title: z.string().min(1).max(200),
  content: z.string().min(1),
});

type DocSlug = (typeof docSlugs)[number];

const PLACEHOLDER_PATTERNS = ['[Ваше ФИО]', '[Ваш ИНН]', '[Ваш адрес]'];

function hasPlaceholders(content: string): boolean {
  return PLACEHOLDER_PATTERNS.some((p) => content.includes(p));
}

function sellerHasData(owner: { legalName: string | null; inn: string | null; legalAddress: string | null }): boolean {
  return !!(owner.legalName && owner.inn && owner.legalAddress);
}

async function getServerWithOwner(serverId: string) {
  const server = await prisma.server.findUnique({
    where: { id: serverId },
    select: {
      name: true,
      slug: true,
      customDomain: true,
      ownerId: true,
      blockedAt: true,
      owner: { select: { legalStatus: true, legalName: true, inn: true, legalAddress: true } },
    },
  });
  if (!server) return null;

  const settings = await prisma.platformSettings.findUnique({ where: { id: 'global' } });
  const platformDomain = settings?.platformDomain || 'example.com';

  const shopUrl = server.customDomain
    ? `https://${server.customDomain}`
    : `https://${server.slug}.${platformDomain}`;

  return { ...server, shopUrl };
}

function buildSellerData(
  owner: { legalStatus: string | null; legalName: string | null; inn: string | null; legalAddress: string | null },
  shopUrl: string,
) {
  return {
    legalStatus: getStatusLabel(owner.legalStatus),
    legalName: owner.legalName || '[Ваше ФИО]',
    inn: owner.inn || '[Ваш ИНН]',
    legalAddress: owner.legalAddress || '[Ваш адрес]',
    shopUrl,
  };
}

type ServerWithOwner = NonNullable<Awaited<ReturnType<typeof getServerWithOwner>>>;

async function ensureDocument(serverId: string, slug: DocSlug, preloadedServer?: ServerWithOwner) {
  const existing = await prisma.serverLegalDocument.findUnique({
    where: { serverId_slug: { serverId, slug } },
  });

  const server = preloadedServer || (await getServerWithOwner(serverId));
  if (!server) return null;

  const sellerData = buildSellerData(server.owner, server.shopUrl);

  // If existing doc has placeholders but seller now has real data → regenerate
  if (existing && hasPlaceholders(existing.content) && sellerHasData(server.owner)) {
    const doc = generateDocument(slug, sellerData, server.name);
    return prisma.serverLegalDocument.update({
      where: { id: existing.id },
      data: { title: doc.title, content: doc.content },
    });
  }

  if (existing) return existing;

  const doc = generateDocument(slug, sellerData, server.name);
  return prisma.serverLegalDocument.create({
    data: { serverId, slug, title: doc.title, content: doc.content },
  });
}

export default async function serverLegalRoutes(app: FastifyInstance) {
  // Public: get legal doc for a shop by slug
  app.get('/api/shop/:slug/legal/:docSlug', { schema: { tags: ['shop'] } }, async (req, reply) => {
    const { slug, docSlug } = req.params as RouteParams;
    if (!docSlugs.includes(docSlug)) {
      return reply.status(404).send({ error: 'Document not found' });
    }

    const server = await prisma.server.findUnique({
      where: { slug },
      select: {
        id: true,
        name: true,
        slug: true,
        customDomain: true,
        blockedAt: true,
        ownerId: true,
        owner: { select: { legalStatus: true, legalName: true, inn: true, legalAddress: true } },
      },
    });
    if (!server || server.blockedAt) {
      return reply.status(404).send({ error: 'Shop not found' });
    }

    const settings = await prisma.platformSettings.findUnique({ where: { id: 'global' } });
    const platformDomain = settings?.platformDomain || 'example.com';
    const shopUrl = server.customDomain
      ? `https://${server.customDomain}`
      : `https://${server.slug}.${platformDomain}`;

    const doc = await ensureDocument(server.id, docSlug as DocSlug, { ...server, shopUrl });
    if (!doc) {
      return reply.status(404).send({ error: 'Document not found' });
    }
    return { title: doc.title, content: doc.content };
  });

  // List legal docs for a server (owner only)
  app.get(
    '/api/servers/:id/legal',
    { preHandler: [app.authenticate], schema: { tags: ['servers'] } },
    async (req, reply) => {
      const { id } = req.params as RouteParams;
      const { id: userId } = req.user;

      const server = await prisma.server.findUnique({
        where: { id },
        select: { ownerId: true },
      });
      if (!server) return reply.status(404).send({ error: 'Server not found' });
      if (server.ownerId !== userId) return reply.status(403).send({ error: 'Forbidden' });

      const docs = STORE_DOCS.map((d) => ({
        slug: d.slug,
        title: d.title,
        generated: true,
      }));

      const existing = await prisma.serverLegalDocument.findMany({
        where: { serverId: id },
        select: { slug: true, updatedAt: true },
      });

      const existingMap = new Map(existing.map((d) => [d.slug, d]));
      return docs.map((d) => ({
        ...d,
        exists: existingMap.has(d.slug),
        updatedAt: existingMap.get(d.slug)?.updatedAt || null,
      }));
    },
  );

  // Get specific legal doc content (owner only)
  app.get(
    '/api/servers/:id/legal/:docSlug',
    { preHandler: [app.authenticate], schema: { tags: ['servers'] } },
    async (req, reply) => {
      const { id, docSlug } = req.params as RouteParams;
      if (!docSlugs.includes(docSlug)) {
        return reply.status(404).send({ error: 'Document not found' });
      }
      const { id: userId } = req.user;

      const server = await prisma.server.findUnique({
        where: { id },
        select: { ownerId: true },
      });
      if (!server) return reply.status(404).send({ error: 'Server not found' });
      if (server.ownerId !== userId) return reply.status(403).send({ error: 'Forbidden' });

      const doc = await ensureDocument(id, docSlug as DocSlug);
      if (!doc) return reply.status(404).send({ error: 'Document not found' });
      return doc;
    },
  );

  // Update legal doc content (owner only)
  app.put(
    '/api/servers/:id/legal/:docSlug',
    { preHandler: [app.authenticate], schema: { tags: ['servers'] } },
    async (req, reply) => {
      const { id, docSlug } = req.params as RouteParams;
      if (!docSlugs.includes(docSlug)) {
        return reply.status(404).send({ error: 'Document not found' });
      }
      const { id: userId } = req.user;

      const parsed = updateSchema.safeParse(req.body);
      if (!parsed.success) {
        return reply.status(400).send({ error: parsed.error.flatten() });
      }

      const server = await prisma.server.findUnique({
        where: { id },
        select: { ownerId: true },
      });
      if (!server) return reply.status(404).send({ error: 'Server not found' });
      if (server.ownerId !== userId) return reply.status(403).send({ error: 'Forbidden' });

      const doc = await prisma.serverLegalDocument.upsert({
        where: { serverId_slug: { serverId: id, slug: docSlug } },
        create: { serverId: id, slug: docSlug, ...parsed.data },
        update: parsed.data,
      });
      return doc;
    },
  );

  // Regenerate from template (owner only)
  app.post(
    '/api/servers/:id/legal/regenerate',
    {
      preHandler: [app.authenticate],
      config: { rateLimit: { max: 5, timeWindow: '15 minutes' } },
      schema: { tags: ['servers'] },
    },
    async (req, reply) => {
      const { id } = req.params as RouteParams;
      const { id: userId } = req.user;

      const server = await getServerWithOwner(id);
      if (!server) return reply.status(404).send({ error: 'Server not found' });
      if (server.ownerId !== userId) return reply.status(403).send({ error: 'Forbidden' });

      const sellerData = buildSellerData(server.owner, server.shopUrl);

      const results = await Promise.all(
        STORE_DOCS.map(async (d) => {
          const doc = generateDocument(d.slug, sellerData, server.name);
          return prisma.serverLegalDocument.upsert({
            where: { serverId_slug: { serverId: id, slug: d.slug } },
            create: { serverId: id, slug: d.slug, title: doc.title, content: doc.content },
            update: { title: doc.title, content: doc.content },
          });
        }),
      );

      return { items: results };
    },
  );
}
