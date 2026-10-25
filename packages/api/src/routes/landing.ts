import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { z } from 'zod';
import prisma from '../plugins/prisma.js';
import { RouteParams } from '../validators/common.js';

import { writeFileSync, existsSync, mkdirSync } from 'fs';
import { join } from 'path';
import { config } from '../config.js';

const ALLOWED_MIME_TYPES = ['image/png', 'image/jpeg', 'image/webp'];

const MIME_EXT: Record<string, string> = {
  'image/png': '.png',
  'image/jpeg': '.jpg',
  'image/webp': '.webp',
};

function validateMagicBytes(mime: string, buffer: Buffer): boolean {
  if (buffer.length < 8) return false;
  const hex = buffer.subarray(0, 8).toString('hex');
  if (mime === 'image/png') return hex.startsWith('89504e47');
  if (mime === 'image/jpeg') return hex.startsWith('ffd8ff');
  if (mime === 'image/webp') return hex.startsWith('52494646');
  return false;
}

const VALID_SECTIONS = ['hero', 'features', 'testimonials', 'cta', 'footer', 'roadmap'] as const;

const sectionContentSchema: Record<string, z.ZodType> = {
  hero: z.object({
    title: z.string().min(1).max(200),
    subtitle: z.string().min(1).max(500),
    ctaText: z.string().min(1).max(100),
    ctaLink: z.string().min(1).max(500),
    bgImage: z.string().max(500).optional(),
  }),
  features: z.object({
    items: z
      .array(
        z.object({
          icon: z.string().min(1).max(10),
          title: z.string().min(1).max(100),
          desc: z.string().min(1).max(500),
        }),
      )
      .min(1)
      .max(12),
  }),
  testimonials: z.object({
    items: z
      .array(
        z.object({
          avatar: z.string().max(500).optional(),
          name: z.string().min(1).max(100),
          role: z.string().min(1).max(100),
          text: z.string().min(1).max(1000),
        }),
      )
      .min(1)
      .max(20),
  }),
  cta: z.object({
    title: z.string().min(1).max(200),
    subtitle: z.string().min(1).max(500),
    btnText: z.string().min(1).max(100),
    btnLink: z.string().min(1).max(500),
  }),
  footer: z.object({
    copyright: z.string().min(1).max(200),
    links: z
      .array(
        z.object({
          text: z.string().min(1).max(100),
          url: z.string().min(1).max(500),
        }),
      )
      .max(20),
  }),
  roadmap: z.object({
    title: z.string().min(1).max(200),
    items: z
      .array(
        z.object({
          status: z.enum(['done', 'in_progress', 'planned']),
          text: z.string().min(1).max(500),
          date: z.string().max(100).optional().nullable(),
          note: z.string().max(500).optional().nullable(),
        }),
      )
      .min(0)
      .max(30),
  }),
};

function readStream(stream: NodeJS.ReadableStream): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    stream.on('data', (chunk: Buffer) => chunks.push(chunk));
    stream.on('end', () => resolve(Buffer.concat(chunks)));
    stream.on('error', reject);
  });
}

export default async function landingRoutes(app: FastifyInstance) {
  app.get('/api/landing', { schema: { tags: ['landing'] } }, async () => {
    const rows = await prisma.landingContent.findMany();
    const sections: Record<string, unknown> = {};
    for (const row of rows) {
      sections[row.section] = row.content;
    }
    const settings = await prisma.platformSettings.findUnique({ where: { id: 'global' } });
    const faq = await prisma.faq.findMany({
      orderBy: { sortOrder: 'asc' },
      take: 6,
      select: { id: true, question: true, answer: true, sortOrder: true, createdAt: true, updatedAt: true },
    });
    const serverCount = await prisma.server.count();
    const featuredShops = await prisma.server.findMany({
      where: { blockedAt: null },
      orderBy: { createdAt: 'desc' },
      take: 6,
      select: {
        id: true,
        name: true,
        slug: true,
        logoUrl: true,
        gameType: true,
        customDomain: true,
      },
    });
    return {
      sections,
      subscriptionPrice: settings ? Number(settings.subscriptionPrice) : 9.99,
      currency: settings?.currency || 'RUB',
      faq,
      serverCount,
      featuredShops,
      platformDomain: settings?.platformDomain || 'example.com',
      operatingMode: settings?.operatingMode || 'self_employed',
      platformName: settings?.brandName || 'DonatePlatform',
      platformEmail: settings?.platformEmail || null,
      platformPhone: settings?.platformPhone || null,
      platformInn: settings?.platformInn || null,
      platformAddress: settings?.platformAddress || null,
    };
  });

  app.put(
    '/api/admin/landing/:section',
    { preHandler: [app.authenticate, app.authStaff], schema: { tags: ['admin'] } },
    async (req: FastifyRequest, reply: FastifyReply) => {
      const { role } = req.staffMember!;
      if (role !== 'SUPER_ADMIN' && role !== 'ADMIN') {
        return reply.status(403).send({ error: 'Only SUPER_ADMIN or ADMIN can edit landing' });
      }
      const { section } = req.params as RouteParams;
      if (!VALID_SECTIONS.includes(section as (typeof VALID_SECTIONS)[number])) {
        return reply.status(400).send({ error: `Invalid section: ${section}` });
      }
      const validator = sectionContentSchema[section];
      if (!validator) {
        return reply.status(400).send({ error: `No validator for section: ${section}` });
      }
      const body = req.body as { content: unknown };
      const parsed = validator.safeParse(body.content);
      if (!parsed.success) {
        return reply.status(400).send({ error: parsed.error.flatten() });
      }
      await prisma.landingContent.upsert({
        where: { section },
        create: { section, content: parsed.data },
        update: { content: parsed.data },
      });
      return { ok: true };
    },
  );

  app.post(
    '/api/admin/landing/upload',
    { preHandler: [app.authenticate, app.authStaff], schema: { tags: ['admin'] } },
    async (req: FastifyRequest, reply: FastifyReply) => {
      const { role } = req.staffMember!;
      if (role !== 'SUPER_ADMIN' && role !== 'ADMIN') {
        return reply.status(403).send({ error: 'Only SUPER_ADMIN or ADMIN can upload' });
      }
      const data = await req.file();
      if (!data) {
        return reply.status(400).send({ error: 'No file uploaded' });
      }
      if (!ALLOWED_MIME_TYPES.includes(data.mimetype)) {
        return reply.status(400).send({ error: 'Invalid file type. Allowed: png, jpg, webp' });
      }
      let buffer: Buffer;
      try {
        buffer = await readStream(data.file);
      } catch {
        return reply.status(400).send({ error: 'Failed to read file' });
      }
      if (buffer.length === 0) {
        return reply.status(400).send({ error: 'Empty file' });
      }
      if (!validateMagicBytes(data.mimetype, buffer)) {
        return reply.status(400).send({ error: 'Invalid file content' });
      }
      if (buffer.length > 5 * 1024 * 1024) {
        return reply.status(400).send({ error: 'File too large. Max 5MB' });
      }
      const ext = MIME_EXT[data.mimetype] || '.png';
      const fileName = `landing_${Date.now()}${ext}`;
      const landingDir = join(config.uploadsDir, '_landing');
      if (!existsSync(landingDir)) {
        mkdirSync(landingDir, { recursive: true });
      }
      const filePath = join(landingDir, fileName);
      writeFileSync(filePath, buffer);
      return { url: `/uploads/_landing/${fileName}` };
    },
  );
}
