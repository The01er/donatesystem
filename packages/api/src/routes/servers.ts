import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { z } from 'zod';
import crypto from 'node:crypto';

import { existsSync, mkdirSync, unlinkSync, rmSync, writeFileSync } from 'node:fs';
import { join, extname } from 'node:path';
import prisma from '../plugins/prisma.js';
import { actionsJsonSchema, validatePlaceholders } from '../validators/actions.js';
import { OrderStatus } from '../constants/order-status.js';
import { RevokeStatus } from '../constants/revoke-status.js';
import { checkSubscriptionExpiry, chargeSubscription, refundSubscriptionTx } from '../services/subscription-service.js';
import { invalidateShopCache } from '../plugins/cache.js';
import { getOperatingMode } from '../lib/platform-settings.js';
import { config } from '../config.js';
import { encryptSecret } from '../lib/crypto.js';
import { revokeOrderTx, reGrantOrderTx, cancelOrderTx } from '../services/order-service.js';
import { getAdapter } from '../adapters/registry.js';

interface RouteParams {
  id: string;
  [key: string]: string;
}

const slugSchema = z
  .string()
  .min(3)
  .max(30)
  .regex(/^[a-z0-9-]+$/, 'Slug must contain only lowercase letters, digits, and hyphens');

const createServerSchema = z.object({
  name: z.string().min(1).max(100),
  gameType: z.string().min(1).max(50),
  ipAddress: z.string().min(1).max(100),
  slug: slugSchema,
  planType: z.enum(['commission', 'subscription']).optional(),
});

const updateServerSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  gameType: z.string().min(1).max(50).optional(),
  ipAddress: z.string().min(1).max(100).optional(),
  slug: slugSchema.optional(),
  customDomain: z
    .union([
      z.string().regex(/^[a-z0-9-]+(\.[a-z0-9-]+)*\.[a-z]{2,}$/).max(255),
      z.literal(''),
      z.null(),
    ])
    .optional(),
  planType: z.enum(['commission', 'subscription']).optional(),
  upgradeEnabled: z.boolean().optional(),
  upgradeMaxDays: z.number().int().min(0).optional(),
  upgradeMaxDiscount: z.number().min(0).optional(),
  upgradeNoCoupon: z.boolean().optional(),
  logoUrl: z.string().max(500).nullable().optional(),
  coverUrl: z.string().max(500).nullable().optional(),
  primaryColor: z.string().max(50).optional(),
  template: z.enum(['gaming', 'cyber']).optional(),
  showTopDonators: z.boolean().optional(),
  showRecentPurchases: z.boolean().optional(),
});

const paymentKeyEntrySchema = z.object({
  provider: z.string().min(1).max(50),
  secret: z.string().max(500).optional().default(''),
  publicKey: z.string().max(500).nullable().optional(),
  enabled: z.boolean().optional().default(true),
  extra: z.record(z.string()).nullable().optional(),
});

const createProductSchema = z.object({
  name: z.string().min(1).max(100),
  description: z.string().max(500).optional(),
  imageUrl: z.string().max(500).optional(),
  price: z.number().min(0),
  stock: z.number().int().min(0).nullable().optional(),
  type: z.enum(['item', 'privilege', 'currency', 'roulette', 'other']).optional().default('item'),
  command: z.string().max(8000).optional(),
  removeCommand: z
    .string()
    .max(2000)
    .refine(validatePlaceholders, { message: 'Invalid placeholder in removeCommand' })
    .optional(),
  actionsJson: actionsJsonSchema.optional(),
});

const updateProductSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  description: z.string().max(500).nullable().optional(),
  imageUrl: z.string().max(500).nullable().optional(),
  price: z.number().min(0).optional(),
  stock: z.number().int().min(0).nullable().optional(),
  type: z.enum(['item', 'privilege', 'currency', 'roulette', 'other']).optional(),
  command: z.string().max(8000).nullable().optional(),
  removeCommand: z
    .string()
    .max(2000)
    .refine(validatePlaceholders, { message: 'Invalid placeholder in removeCommand' })
    .nullable()
    .optional(),
  actionsJson: actionsJsonSchema.nullable().optional(),
});

const restockSchema = z.object({
  stock: z.number().int().min(0),
});

const ordersQuerySchema = z.object({
  page: z.coerce.number().int().min(1).optional().default(1),
  limit: z.coerce.number().int().min(1).max(100).optional().default(20),
});

async function ownServer(userId: string, serverId: string) {
  return prisma.server.findFirst({
    where: { id: serverId, ownerId: userId },
  });
}

export default async function serverRoutes(app: FastifyInstance) {
  // ─── Servers ───────────────────────────────────────────────

  app.get('/api/servers', { preHandler: [app.authenticate], schema: { tags: ['servers'] } }, async (req) => {
    const { id } = req.user;
    const servers = await prisma.server.findMany({
      where: { ownerId: id },
      orderBy: { createdAt: 'desc' },
      omit: { paymentKeys: true },
    });
    const operatingMode = await getOperatingMode();
    return servers.map((s) => ({ ...s, operatingMode }));
  });

  app.post(
    '/api/servers',
    {
      preHandler: [app.authenticate],
      config: { rateLimit: { max: 5, timeWindow: '15 minutes' } },
      schema: { tags: ['servers'] },
    },
    async (req, reply) => {
      const parsed = createServerSchema.safeParse(req.body);
      if (!parsed.success) {
        return reply.status(400).send({ error: parsed.error.flatten() });
      }

      const { id } = req.user;
      const user = await prisma.user.findUnique({ where: { id }, select: { emailVerified: true } });
      if (!user?.emailVerified) {
        return reply.status(403).send({ error: 'Подтвердите email перед созданием витрины' });
      }

      const existing = await prisma.server.findUnique({ where: { slug: parsed.data.slug } });
      if (existing) {
        return reply.status(409).send({ error: 'Slug already taken' });
      }

      const operatingMode = await getOperatingMode();
      const isSelfEmployed = operatingMode === 'self_employed';

      const { planType: inputPlanType, ...serverData } = parsed.data;

      if (isSelfEmployed && inputPlanType && inputPlanType !== 'subscription') {
        return reply.status(403).send({ error: 'В режиме самозанятого доступна только подписочная модель' });
      }
      const resolvedPlanType: 'commission' | 'subscription' = isSelfEmployed
        ? 'subscription'
        : inputPlanType || 'commission';

      let subPrice = 9.99;
      const settings = await prisma.platformSettings.findUnique({ where: { id: 'global' } });
      if (settings) subPrice = Number(settings.subscriptionPrice);

      const server = await prisma.$transaction(async (tx) => {
        const tokenSecret = crypto.randomBytes(32).toString('hex');

        const srv = await tx.server.create({
          data: {
            ...serverData,
            planType: resolvedPlanType,
            ownerId: id,
            wallet: { create: {} },
            members: {
              create: { userId: id, role: 'owner' },
            },
            pluginTokens: {
              create: { name: 'Default', token: tokenSecret, isActive: true },
            },
          },
        });

        if (isSelfEmployed) {
          await tx.subscription.create({
            data: {
              serverId: srv.id,
              status: 'active',
              price: subPrice,
              expiresAt: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000),
            },
          });
        } else {
          const charged = await chargeSubscription(srv.id, id, subPrice, tx);
          if (charged.ok) {
            await tx.subscription.create({
              data: {
                serverId: srv.id,
                status: 'active',
                price: subPrice,
                expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
              },
            });
          }
        }

        return { ...srv, tokenSecret, planType: resolvedPlanType };
      });

      const platformDomain = await getPlatformDomain();
      const shopUrl = `https://${parsed.data.slug}.${platformDomain}`;
      return {
        ...server,
        planType: server.planType,
        subscriptionCharged: true,
        pluginToken: server.tokenSecret,
        shopUrl,
        operatingMode,
      };
    },
  );

  app.get('/api/servers/:id', { preHandler: [app.authenticate], schema: { tags: ['servers'] } }, async (req, reply) => {
    const { id } = req.user;
    const { id: serverId } = req.params as RouteParams;
    const server = await ownServer(id, serverId);
    if (!server) return reply.status(404).send({ error: 'Not found' });
    await checkSubscriptionExpiry(serverId);
    const fullServer = await prisma.server.findUnique({
      where: { id: serverId },
      include: { subscription: true },
    });
    if (!fullServer) return reply.status(404).send({ error: 'Not found' });
    const platformDomain = await getPlatformDomain();
    const shopUrl = `https://${fullServer.slug}.${platformDomain}`;
    const cnameTarget = await getCnameTarget();
    const operatingMode = await getOperatingMode();
    const settings = await prisma.platformSettings.findUnique({ where: { id: 'global' } });
    const globalSubscriptionPrice = settings ? Number(settings.subscriptionPrice) : 9.99;
    return { ...fullServer, shopUrl, operatingMode, cnameTarget, globalSubscriptionPrice };
  });

  app.patch(
    '/api/servers/:id',
    { preHandler: [app.authenticate], schema: { tags: ['servers'] } },
    async (req, reply) => {
      const { id: userId } = req.user;
      const { id: serverId } = req.params as RouteParams;
      const serverData = await ownServer(userId, serverId);
      if (!serverData) return reply.status(404).send({ error: 'Not found' });

      const parsed = updateServerSchema.safeParse(req.body);
      if (!parsed.success) {
        return reply.status(400).send({ error: parsed.error.flatten() });
      }

      let refundResult: { refund: number; daysLeft: number } | null = null;

      // Slug change — check uniqueness
      if (parsed.data.slug && parsed.data.slug !== serverData.slug) {
        const slugTaken = await prisma.server.findUnique({ where: { slug: parsed.data.slug } });
        if (slugTaken) {
          return reply.status(409).send({ error: 'Slug already taken' });
        }
      }

      // Block switch to commission when self_employed
      if (parsed.data.planType === 'commission') {
        const operatingMode = await getOperatingMode();
        if (operatingMode === 'self_employed') {
          return reply.status(403).send({ error: 'Смена на комиссионный тариф недоступна в режиме самозанятого' });
        }
      }

      // Switching to subscription — charge immediately
      if (parsed.data.planType === 'subscription' && serverData.planType !== 'subscription') {
        let subPrice = 9.99;
        const settings = await prisma.platformSettings.findUnique({ where: { id: 'global' } });
        if (settings) subPrice = Number(settings.subscriptionPrice);

        try {
          await prisma.$transaction(async (tx) => {
            const charged = await chargeSubscription(serverId, userId, subPrice, tx);
            if (!charged.ok) throw new Error('INSUFFICIENT_FUNDS');

            await tx.subscription.upsert({
              where: { serverId },
              create: {
                serverId,
                status: 'active',
                price: subPrice,
                expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
              },
              update: {
                status: 'active',
                price: subPrice,
                expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
              },
            });
          });
        } catch (err) {
          if (err instanceof Error && err.message === 'INSUFFICIENT_FUNDS') {
            return reply.status(400).send({
              error: 'Недостаточно средств на личном балансе или кошельке витрины для оплаты подписки.',
            });
          }
          throw err;
        }
      }

      // Switching from subscription to commission — refund (atomic with server update)
      if (parsed.data.planType === 'commission' && serverData.planType === 'subscription') {
        const txResult = await prisma.$transaction(async (tx) => {
          const sub = await tx.subscription.findUnique({ where: { serverId } });
          let refund: { refund: number; daysLeft: number } | null = null;
          if (sub) {
            refund = await refundSubscriptionTx(tx, sub.id);
          }
          const updated = await tx.server.update({
            where: { id: serverId },
            data: parsed.data,
            include: { subscription: true },
          });
          return { refund, updated };
        });
        refundResult = txResult.refund;
        const platformDomain = await getPlatformDomain();
        const shopUrl = `https://${txResult.updated.slug}.${platformDomain}`;
        invalidateShopCache(txResult.updated.slug);
        const operatingMode = await getOperatingMode();
        return { ...txResult.updated, refund: txResult.refund, shopUrl, operatingMode };
      }

      const updated = await prisma.server.update({
        where: { id: serverId },
        data: parsed.data,
        include: { subscription: true },
      });

      const platformDomain = await getPlatformDomain();
      const shopUrl = `https://${updated.slug}.${platformDomain}`;

      invalidateShopCache(updated.slug);

      const operatingMode = await getOperatingMode();
      return { ...updated, refund: refundResult, shopUrl, operatingMode };
    },
  );

  app.delete(
    '/api/servers/:id',
    { preHandler: [app.authenticate], schema: { tags: ['servers'] } },
    async (req, reply) => {
      const { id: userId } = req.user;
      const { id: serverId } = req.params as RouteParams;
      const server = await ownServer(userId, serverId);
      if (!server) return reply.status(404).send({ error: 'Not found' });

      const activeOrders = await prisma.order.count({
        where: { serverId, status: { in: [OrderStatus.PAID, OrderStatus.DELIVERING] } },
      });
      if (activeOrders > 0) {
        return reply
          .status(400)
          .send({ error: 'Cannot delete server with active orders. Complete or cancel them first.' });
      }

      const uploadDir = join(config.uploadsDir, serverId);
      if (existsSync(uploadDir)) {
        rmSync(uploadDir, { recursive: true, force: true });
      }

      await prisma.server.delete({ where: { id: serverId } });
      return { ok: true };
    },
  );

  // ─── Branding (Uploads) ───────────────────────────────────

  const ALLOWED_MIME_TYPES = ['image/png', 'image/jpeg', 'image/webp'];

  const MIME_EXT: Record<string, string> = {
    'image/png': '.png',
    'image/jpeg': '.jpg',
    'image/webp': '.webp',
  };

  const MAGIC_BYTES: Record<string, { prefix: string; offset?: number; check?: (hex: string) => boolean }[]> = {
    'image/png': [{ prefix: '89504e47' }],
    'image/jpeg': [
      { prefix: 'ffd8ffe0' },
      { prefix: 'ffd8ffe1' },
      { prefix: 'ffd8ffe2' },
      { prefix: 'ffd8ffdb' },
      { prefix: 'ffd8ffee' },
    ],
    'image/webp': [{ prefix: '52494646', check: (hex) => hex.length >= 24 && hex.slice(16, 24) === '57454250' }],
  };

  function validateMagicBytes(mimeType: string, buffer: Buffer): boolean {
    const signatures = MAGIC_BYTES[mimeType];
    if (!signatures) return false;
    const hex = buffer.subarray(0, 16).toString('hex').toLowerCase();
    return signatures.some((sig) => {
      const prefixHex = sig.prefix.toLowerCase();
      if (!hex.startsWith(prefixHex)) return false;
      if (sig.check) return sig.check(hex);
      return true;
    });
  }

  function readStream(stream: NodeJS.ReadableStream): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      const chunks: Buffer[] = [];
      stream.on('data', (chunk: Buffer) => chunks.push(chunk));
      stream.on('error', reject);
      stream.on('end', () => resolve(Buffer.concat(chunks)));
    });
  }

  async function saveUpload(
    req: FastifyRequest,
    reply: FastifyReply,
    serverId: string,
    type: 'logo' | 'cover',
    maxSize: number,
  ): Promise<string | null> {
    const data = await req.file();
    if (!data) {
      req.log.warn({ serverId, type }, 'saveUpload: no file in request');
      reply.status(400).send({ error: 'No file uploaded' });
      return null;
    }

    req.log.info({ serverId, type, mimetype: data.mimetype, filename: data.filename }, 'saveUpload: file received');

    if (!ALLOWED_MIME_TYPES.includes(data.mimetype)) {
      req.log.warn({ serverId, type, mimetype: data.mimetype }, 'saveUpload: invalid mime type');
      reply.status(400).send({ error: 'Invalid file type. Allowed: png, jpg, webp' });
      return null;
    }

    let buffer: Buffer;
    try {
      buffer = await readStream(data.file);
    } catch (err) {
      req.log.warn({ serverId, type, err }, 'saveUpload: read stream failed');
      reply.status(400).send({ error: 'Failed to read file' });
      return null;
    }

    const hexPreview = buffer.subarray(0, 8).toString('hex');
    req.log.info({ serverId, type, size: buffer.length, firstBytes: hexPreview }, 'saveUpload: buffer read');

    if (buffer.length === 0) {
      req.log.warn({ serverId, type }, 'saveUpload: empty file');
      reply.status(400).send({ error: 'Empty file' });
      return null;
    }

    if (!validateMagicBytes(data.mimetype, buffer)) {
      req.log.warn({ serverId, type, firstBytes: hexPreview }, 'saveUpload: magic bytes mismatch');
      reply.status(400).send({ error: 'Invalid file content: signature does not match declared type' });
      return null;
    }

    if (buffer.length > maxSize) {
      req.log.warn({ serverId, type, size: buffer.length, maxSize }, 'saveUpload: file too large');
      reply.status(400).send({ error: `File too large. Max ${Math.round((maxSize / 1024 / 1024) * 10) / 10}MB` });
      return null;
    }

    const ext = MIME_EXT[data.mimetype] || extname(data.filename).toLowerCase() || '.png';
    const safeExt = ['.png', '.jpg', '.jpeg', '.webp'].includes(ext) ? ext : '.png';
    const fileName = `${type}${safeExt}`;

    const serverDir = join(config.uploadsDir, serverId);
    if (!existsSync(serverDir)) {
      mkdirSync(serverDir, { recursive: true });
    }

    const filePath = join(serverDir, fileName);
    if (existsSync(filePath)) {
      unlinkSync(filePath);
    }

    writeFileSync(filePath, buffer);
    return `/uploads/${serverId}/${fileName}`;
  }

  async function deleteFile(serverDir: string, fileName: string): Promise<void> {
    const filePath = join(serverDir, fileName);
    if (existsSync(filePath)) {
      unlinkSync(filePath);
    }
  }

  async function getPlatformDomain(): Promise<string> {
    const settings = await prisma.platformSettings.findUnique({ where: { id: 'global' } });
    return settings?.platformDomain || 'example.com';
  }

  async function getCnameTarget(): Promise<string> {
    const settings = await prisma.platformSettings.findUnique({ where: { id: 'global' } });
    return settings?.cnameTarget || `domains.${settings?.platformDomain || 'example.com'}`;
  }

  app.post(
    '/api/servers/:id/upload-logo',
    { preHandler: [app.authenticate], schema: { tags: ['servers'] } },
    async (req, reply) => {
      const { id: userId } = req.user;
      const { id: serverId } = req.params as RouteParams;
      const server = await ownServer(userId, serverId);
      if (!server) return reply.status(404).send({ error: 'Not found' });

      const url = await saveUpload(req, reply, serverId, 'logo', 2 * 1024 * 1024);
      if (!url) return;

      await prisma.server.update({ where: { id: serverId }, data: { logoUrl: url } });
      invalidateShopCache(server.slug);
      return { url };
    },
  );

  app.post(
    '/api/servers/:id/upload-cover',
    { preHandler: [app.authenticate], schema: { tags: ['servers'] } },
    async (req, reply) => {
      const { id: userId } = req.user;
      const { id: serverId } = req.params as RouteParams;
      const server = await ownServer(userId, serverId);
      if (!server) return reply.status(404).send({ error: 'Not found' });

      const url = await saveUpload(req, reply, serverId, 'cover', 5 * 1024 * 1024);
      if (!url) return;

      await prisma.server.update({ where: { id: serverId }, data: { coverUrl: url } });
      invalidateShopCache(server.slug);
      return { url };
    },
  );

  app.delete(
    '/api/servers/:id/logo',
    { preHandler: [app.authenticate], schema: { tags: ['servers'] } },
    async (req, reply) => {
      const { id: userId } = req.user;
      const { id: serverId } = req.params as RouteParams;
      const server = await ownServer(userId, serverId);
      if (!server) return reply.status(404).send({ error: 'Not found' });

      const serverDir = join(config.uploadsDir, serverId);
      for (const ext of ['.png', '.jpg', '.jpeg', '.webp']) {
        await deleteFile(serverDir, `logo${ext}`);
      }
      await prisma.server.update({ where: { id: serverId }, data: { logoUrl: null } });
      invalidateShopCache(server.slug);
      return { ok: true };
    },
  );

  app.delete(
    '/api/servers/:id/cover',
    { preHandler: [app.authenticate], schema: { tags: ['servers'] } },
    async (req, reply) => {
      const { id: userId } = req.user;
      const { id: serverId } = req.params as RouteParams;
      const server = await ownServer(userId, serverId);
      if (!server) return reply.status(404).send({ error: 'Not found' });

      const serverDir = join(config.uploadsDir, serverId);
      for (const ext of ['.png', '.jpg', '.jpeg', '.webp']) {
        await deleteFile(serverDir, `cover${ext}`);
      }
      await prisma.server.update({ where: { id: serverId }, data: { coverUrl: null } });
      invalidateShopCache(server.slug);
      return { ok: true };
    },
  );

  // ─── Products ──────────────────────────────────────────────

  app.get(
    '/api/servers/:id/products',
    { preHandler: [app.authenticate], schema: { tags: ['servers'] } },
    async (req, reply) => {
      const { id: userId } = req.user;
      const { id: serverId } = req.params as RouteParams;
      const server = await ownServer(userId, serverId);
      if (!server) return reply.status(404).send({ error: 'Not found' });

      return prisma.product.findMany({
        where: { serverId, deletedAt: null },
        orderBy: { createdAt: 'desc' },
      });
    },
  );

  app.post(
    '/api/servers/:id/products',
    { preHandler: [app.authenticate], schema: { tags: ['servers'] } },
    async (req, reply) => {
      const { id: userId } = req.user;
      const { id: serverId } = req.params as RouteParams;
      const server = await ownServer(userId, serverId);
      if (!server) return reply.status(404).send({ error: 'Not found' });

      const parsed = createProductSchema.safeParse(req.body);
      if (!parsed.success) {
        return reply.status(400).send({ error: parsed.error.flatten() });
      }

      let finalActionsJson: string | null = null;
      if (parsed.data.command && parsed.data.command.trim()) {
        const commands = parsed.data.command
          .split('\n')
          .map((s) => s.trim())
          .filter((s) => s.length > 0);
        if (commands.length > 0) {
          finalActionsJson = JSON.stringify(commands.map((cmd) => ({ type: 'command', value: cmd })));
        }
      } else if (parsed.data.actionsJson) {
        finalActionsJson = parsed.data.actionsJson;
      } else {
        return reply.status(400).send({ error: 'Provide command or actionsJson' });
      }

      const { command: _cmd, removeCommand, ...rest } = parsed.data;
      const product = await prisma.product.create({
        data: { ...rest, removeCommand: removeCommand || null, actionsJson: finalActionsJson, serverId },
      });

      invalidateShopCache(server.slug);
      return product;
    },
  );

  app.get(
    '/api/servers/:id/products/:productId',
    { preHandler: [app.authenticate], schema: { tags: ['servers'] } },
    async (req, reply) => {
      const { id: userId } = req.user;
      const { id: serverId, productId } = req.params as RouteParams;
      const server = await ownServer(userId, serverId);
      if (!server) return reply.status(404).send({ error: 'Not found' });

      const product = await prisma.product.findFirst({
        where: { id: productId, serverId },
      });
      if (!product) return reply.status(404).send({ error: 'Not found' });
      return product;
    },
  );

  app.patch(
    '/api/servers/:id/products/:productId',
    { preHandler: [app.authenticate], schema: { tags: ['servers'] } },
    async (req, reply) => {
      const { id: userId } = req.user;
      const { id: serverId, productId } = req.params as RouteParams;
      const server = await ownServer(userId, serverId);
      if (!server) return reply.status(404).send({ error: 'Not found' });

      const parsed = updateProductSchema.safeParse(req.body);
      if (!parsed.success) {
        return reply.status(400).send({ error: parsed.error.flatten() });
      }

      const product = await prisma.product.findFirst({
        where: { id: productId, serverId },
      });
      if (!product) return reply.status(404).send({ error: 'Not found' });

      const updateData: Record<string, unknown> = {};
      if (parsed.data.name !== undefined) updateData.name = parsed.data.name;
      if (parsed.data.description !== undefined) updateData.description = parsed.data.description;
      if (parsed.data.imageUrl !== undefined) updateData.imageUrl = parsed.data.imageUrl;
      if (parsed.data.price !== undefined) updateData.price = parsed.data.price;
      if (parsed.data.stock !== undefined) updateData.stock = parsed.data.stock;
      if (parsed.data.type !== undefined) updateData.type = parsed.data.type;

      if (parsed.data.command !== undefined) {
        if (parsed.data.command && parsed.data.command.trim()) {
          const commands = parsed.data.command
            .split('\n')
            .map((s) => s.trim())
            .filter((s) => s.length > 0);
          if (commands.length > 0) {
            updateData.actionsJson = JSON.stringify(commands.map((cmd) => ({ type: 'command', value: cmd })));
          }
          updateData.command = parsed.data.command;
        } else {
          updateData.command = null;
        }
      }

      if (parsed.data.removeCommand !== undefined) {
        updateData.removeCommand = parsed.data.removeCommand && parsed.data.removeCommand.trim()
          ? parsed.data.removeCommand.trim()
          : null;
      }

      if (parsed.data.actionsJson !== undefined) {
        updateData.actionsJson = parsed.data.actionsJson;
      }

      const product2 = await prisma.product.update({
        where: { id: productId },
        data: updateData,
      });

      invalidateShopCache(server.slug);
      return product2;
    },
  );

  app.delete(
    '/api/servers/:id/products/:productId',
    { preHandler: [app.authenticate], schema: { tags: ['servers'] } },
    async (req, reply) => {
      const { id: userId } = req.user;
      const { id: serverId, productId } = req.params as RouteParams;
      const server = await ownServer(userId, serverId);
      if (!server) return reply.status(404).send({ error: 'Not found' });

      const product = await prisma.product.findFirst({
        where: { id: productId, serverId },
      });
      if (!product) return reply.status(404).send({ error: 'Not found' });

      const orderCount = await prisma.order.count({ where: { productId } });
      if (orderCount > 0) {
        // Soft delete — сохраняем историю заказов
        await prisma.product.update({
          where: { id: productId },
          data: { deletedAt: new Date() },
        });
      } else {
        // Hard delete — покупок не было
        await prisma.product.delete({ where: { id: productId } });
      }
      invalidateShopCache(server.slug);
      return { ok: true, deleted: orderCount === 0, archived: orderCount > 0 };
    },
  );

  app.put(
    '/api/servers/:id/products/:productId/restock',
    { preHandler: [app.authenticate], schema: { tags: ['servers'] } },
    async (req, reply) => {
      const { id: userId } = req.user;
      const { id: serverId, productId } = req.params as RouteParams;
      const server = await ownServer(userId, serverId);
      if (!server) return reply.status(404).send({ error: 'Not found' });

      const parsed = restockSchema.safeParse(req.body);
      if (!parsed.success) return reply.status(400).send({ error: parsed.error.flatten() });

      const product = await prisma.product.findFirst({
        where: { id: productId, serverId },
      });
      if (!product) return reply.status(404).send({ error: 'Not found' });

      const updated = await prisma.product.update({
        where: { id: productId },
        data: { stock: parsed.data.stock },
      });

      invalidateShopCache(server.slug);
      return updated;
    },
  );

  // ─── Orders ────────────────────────────────────────────────

  app.get(
    '/api/servers/:id/orders',
    { preHandler: [app.authenticate], schema: { tags: ['servers'] } },
    async (req, reply) => {
      const { id: userId } = req.user;
      const { id: serverId } = req.params as RouteParams;

      const server = await ownServer(userId, serverId);
      if (!server) return reply.status(404).send({ error: 'Not found' });

      const query = ordersQuerySchema.parse(req.query);
      const skip = (query.page - 1) * query.limit;

      const [orders, total] = await Promise.all([
        prisma.order.findMany({
          where: { serverId },
          include: { product: { select: { name: true, price: true } } },
          orderBy: { createdAt: 'desc' },
          skip,
          take: query.limit,
        }),
        prisma.order.count({ where: { serverId } }),
      ]);

      return {
        items: orders,
        pagination: { page: query.page, limit: query.limit, total, pages: Math.ceil(total / query.limit) },
      };
    },
  );

  app.post(
    '/api/servers/:id/orders/:orderId/cancel',
    { preHandler: [app.authenticate], schema: { tags: ['servers'] } },
    async (req, reply) => {
      const { id: userId } = req.user;
      const { id: serverId, orderId } = req.params as RouteParams;

      const server = await ownServer(userId, serverId);
      if (!server) return reply.status(404).send({ error: 'Not found' });

      const result = await prisma.$transaction(async (tx) => {
        return cancelOrderTx(tx, {
          orderId,
          serverId,
          allowedStatuses: [OrderStatus.PAID, OrderStatus.DELIVERING],
        });
      });

      if (result.kind === 'not_found') {
        return reply.status(404).send({ error: 'Not found' });
      }
      if (result.kind === 'invalid_status') {
        return reply.status(400).send({ error: 'Order cannot be cancelled in its current status' });
      }
      if (result.kind === 'concurrent') {
        return reply.status(409).send({ error: 'Order was modified concurrently' });
      }

      return { ok: true };
    },
  );

  app.post(
    '/api/servers/:id/orders/:orderId/retry',
    { preHandler: [app.authenticate], schema: { tags: ['servers'] } },
    async (req, reply) => {
      const { id: userId } = req.user;
      const { id: serverId, orderId } = req.params as RouteParams;

      const server = await ownServer(userId, serverId);
      if (!server) return reply.status(404).send({ error: 'Not found' });

      const order = await prisma.order.findFirst({ where: { id: orderId, serverId } });
      if (!order) return reply.status(404).send({ error: 'Not found' });
      if (order.status !== OrderStatus.FAILED) {
        return reply.status(400).send({ error: 'Only failed orders can be retried' });
      }

      await prisma.$transaction(async (tx) => {
        const updated = await tx.order.updateMany({
          where: { id: orderId, status: OrderStatus.FAILED },
          data: { status: OrderStatus.PAID, retryCount: 0, lastError: null },
        });
        if (updated.count === 0) {
          throw new Error('Order was modified concurrently');
        }
      });

      return { ok: true };
    },
  );

  app.post(
    '/api/servers/:id/orders/:orderId/revoke',
    { preHandler: [app.authenticate], config: { rateLimit: { max: 10, timeWindow: '1 minute' } }, schema: { tags: ['servers'] } },
    async (req, reply) => {
      const { id: userId } = req.user;
      const { id: serverId, orderId } = req.params as RouteParams;

      const server = await ownServer(userId, serverId);
      if (!server) return reply.status(404).send({ error: 'Not found' });

      const order = await prisma.order.findFirst({
        where: { id: orderId, serverId },
        include: { product: { select: { type: true, removeCommand: true } } },
      });
      if (!order) return reply.status(404).send({ error: 'Not found' });
      if (order.status !== OrderStatus.DELIVERED && order.status !== OrderStatus.PAID) {
        return reply.status(400).send({ error: 'Only paid or delivered orders can be revoked' });
      }
      if (order.revokeStatus === RevokeStatus.REVOKED) {
        return reply.status(400).send({ error: 'Privilege already revoked' });
      }
      if (order.product.type !== 'privilege') {
        return reply.status(400).send({ error: 'Only privilege products can be revoked' });
      }
      if (!order.product.removeCommand) {
        return reply.status(400).send({ error: 'No remove command configured for this product' });
      }

      await prisma.$transaction((tx) =>
        revokeOrderTx(tx, {
          orderId,
          removeCommand: order.product.removeCommand!,
          userId,
          ipAddress: req.ip,
          auditAction: 'owner_revoke_privilege',
        }),
      );

      const adapter = getAdapter(server.gameType || 'minecraft');
      if (adapter.isDeliverable(server)) {
        const rawCmd = order.product.removeCommand!;
        const commands = rawCmd.split('\n').filter(Boolean);
        const cmdResult = await adapter.executeCommands(server, commands, order.playerName, order.id);

        await prisma.$transaction((tx) =>
          tx.order.updateMany({
            where: { id: orderId, revokeStatus: RevokeStatus.PENDING },
            data: { revokeStatus: cmdResult.ok ? RevokeStatus.REVOKED : RevokeStatus.FAILED },
          }),
        );
      }

      return { ok: true };
    },
  );

  app.post(
    '/api/servers/:id/orders/:orderId/re-grant',
    { preHandler: [app.authenticate], config: { rateLimit: { max: 5, timeWindow: '1 minute' } }, schema: { tags: ['servers'] } },
    async (req, reply) => {
      const { id: userId } = req.user;
      const { id: serverId, orderId } = req.params as RouteParams;

      const server = await ownServer(userId, serverId);
      if (!server) return reply.status(404).send({ error: 'Not found' });

      const order = await prisma.order.findFirst({
        where: { id: orderId, serverId },
        select: { id: true, revokeStatus: true },
      });
      if (!order) return reply.status(404).send({ error: 'Not found' });
      if (order.revokeStatus !== RevokeStatus.REVOKED) {
        return reply.status(400).send({ error: 'Only revoked orders can be re-granted' });
      }

      await prisma.$transaction((tx) =>
        reGrantOrderTx(tx, {
          orderId,
          userId,
          ipAddress: req.ip,
          auditAction: 'owner_regrant_privilege',
        }),
      );

      const adapter = getAdapter(server.gameType || 'minecraft');
      if (adapter.isDeliverable(server)) {
        adapter.deliverOrder(orderId, serverId).then((res) => {
          if (!res.ok) req.log.warn({ orderId, error: res.error }, 'Re-grant delivery failed');
        }).catch((e: unknown) => {
          req.log.error({ orderId, err: e }, 'Re-grant delivery threw');
        });
      }

      return { ok: true };
    },
  );

  app.get(
    '/api/servers/:id/orders/:orderId',
    { preHandler: [app.authenticate], schema: { tags: ['servers'] } },
    async (req, reply) => {
      const { id: userId } = req.user;
      const { id: serverId, orderId } = req.params as RouteParams;

      const server = await ownServer(userId, serverId);
      if (!server) {
        const member = await prisma.serverMember.findFirst({
          where: { serverId, userId },
        });
        if (!member) return reply.status(404).send({ error: 'Not found' });
      }

      const order = await prisma.order.findFirst({
        where: { id: orderId, serverId },
        include: {
          product: { select: { id: true, name: true, type: true, removeCommand: true, actionsJson: true } },
          deliveryAttempts: {
            orderBy: { createdAt: 'asc' },
            select: {
              id: true,
              actionIndex: true,
              actionType: true,
              status: true,
              error: true,
              rollbackStatus: true,
              createdAt: true,
            },
          },
        },
      });
      if (!order) return reply.status(404).send({ error: 'Not found' });

      return { order };
    },
  );

  const allowedTransitions: Record<string, string[]> = {
    [OrderStatus.PENDING]: [OrderStatus.PAID, OrderStatus.CANCELLED],
    [OrderStatus.PAID]: [OrderStatus.DELIVERING, OrderStatus.CANCELLED],
    [OrderStatus.DELIVERING]: [OrderStatus.PAID, OrderStatus.DELIVERED, OrderStatus.FAILED],
    [OrderStatus.FAILED]: [OrderStatus.PAID],
    [OrderStatus.DELIVERED]: [],
    [OrderStatus.CANCELLED]: [],
  };

  const patchOrderSchema = z.object({
    status: z.enum([
      OrderStatus.PAID,
      OrderStatus.DELIVERING,
      OrderStatus.DELIVERED,
      OrderStatus.CANCELLED,
      OrderStatus.FAILED,
    ]),
  });

  app.patch(
    '/api/servers/:id/orders/:orderId',
    { preHandler: [app.authenticate], schema: { tags: ['servers'] } },
    async (req, reply) => {
      const { id: userId } = req.user;
      const { id: serverId, orderId } = req.params as RouteParams;
      const server = await ownServer(userId, serverId);
      if (!server) return reply.status(404).send({ error: 'Not found' });

      const parsed = patchOrderSchema.safeParse(req.body);
      if (!parsed.success) {
        return reply.status(400).send({ error: parsed.error.flatten() });
      }

      const order = await prisma.order.findFirst({
        where: { id: orderId, serverId },
        select: { id: true, status: true },
      });
      if (!order) return reply.status(404).send({ error: 'Not found' });

      if (!allowedTransitions[order.status]?.includes(parsed.data.status)) {
        return reply.status(400).send({ error: `Invalid transition: ${order.status} → ${parsed.data.status}` });
      }

      const updated = await prisma.order.updateMany({
        where: { id: orderId, status: order.status },
        data: { status: parsed.data.status },
      });

      if (updated.count === 0) {
        return reply.status(409).send({ error: 'Order status changed concurrently' });
      }

      return prisma.order.findUnique({
        where: { id: orderId },
        select: { id: true, status: true },
      });
    },
  );

  // ─── Payment Keys ──────────────────────────────────────────

  app.get(
    '/api/servers/:id/payment-keys',
    { preHandler: [app.authenticate], schema: { tags: ['servers'] } },
    async (req, reply) => {
      const { id: userId } = req.user;
      const { id: serverId } = req.params as RouteParams;
      const server = await ownServer(userId, serverId);
      if (!server) return reply.status(404).send({ error: 'Not found' });

      const rawKeys = server.paymentKeys;
      const keysList = Array.isArray(rawKeys) ? (rawKeys as Array<Record<string, unknown>>) : [];

      const safeKeys = keysList.map((k) => ({
        provider: k.provider,
        publicKey: k.publicKey || null,
        enabled: k.enabled !== false,
        extra: k.extra || null,
      }));

      return { keys: safeKeys };
    },
  );

  app.put(
    '/api/servers/:id/payment-keys',
    { preHandler: [app.authenticate], schema: { tags: ['servers'] } },
    async (req, reply) => {
      const { id: userId } = req.user;
      const { id: serverId } = req.params as RouteParams;
      const server = await ownServer(userId, serverId);
      if (!server) return reply.status(404).send({ error: 'Not found' });

      if (server.planType === 'subscription') {
        const owner = await prisma.user.findUnique({
          where: { id: userId },
          select: { legalStatus: true, legalName: true, inn: true },
        });

        if (!owner?.legalStatus || !owner?.legalName || !owner?.inn) {
          return reply.status(400).send({
            error: 'Для подключения платёжных систем необходимо заполнить реквизиты продавца в личном кабинете.',
          });
        }

        const docCount = await prisma.serverLegalDocument.count({
          where: { serverId },
        });

        if (docCount < 3) {
          return reply.status(400).send({
            error:
              'Для подключения платёжных систем необходимо создать юридические документы магазина в разделе «Юридические».',
          });
        }
      }

      const body = req.body as unknown;
      let inputArray: unknown[];
      if (Array.isArray(body)) {
        inputArray = body;
      } else if (body && typeof body === 'object') {
        inputArray = [body];
      } else {
        return reply.status(400).send({ error: 'Expected array or object' });
      }

      const parsed = z.array(paymentKeyEntrySchema).safeParse(inputArray);
      if (!parsed.success) {
        return reply.status(400).send({ error: parsed.error.flatten() });
      }

      const hasRealProvider = parsed.data.some((e) => e.provider !== 'mock');

      if (server.planType === 'subscription' && hasRealProvider) {
        const owner = await prisma.user.findUnique({
          where: { id: userId },
          select: { legalStatus: true, legalName: true, inn: true },
        });

        if (!owner?.legalStatus || !owner?.legalName || !owner?.inn) {
          return reply.status(400).send({
            error: 'Для подключения платёжных систем необходимо заполнить реквизиты продавца в личном кабинете.',
          });
        }

        const docCount = await prisma.serverLegalDocument.count({
          where: { serverId },
        });

        if (docCount < 3) {
          return reply.status(400).send({
            error:
              'Для подключения платёжных систем необходимо создать юридические документы магазина в разделе «Юридические».',
          });
        }
      }

      const existingRaw = server.paymentKeys;
      const existingList = Array.isArray(existingRaw) ? (existingRaw as Array<Record<string, unknown>>) : [];

      const mergedKeys = parsed.data.map((entry) => {
        const existing = existingList.find((e) => e.provider === entry.provider);
        if (entry.provider === 'mock') {
          return { ...entry, secret: '' };
        }
        return {
          ...entry,
          secret: entry.secret ? encryptSecret(entry.secret) : (existing?.secret as string) || '',
        };
      });

      await prisma.server.update({
        where: { id: serverId },
        data: { paymentKeys: mergedKeys },
      });

      return { ok: true };
    },
  );

  app.patch(
    '/api/servers/:id/payment-keys/:provider/toggle',
    { preHandler: [app.authenticate], schema: { tags: ['servers'] } },
    async (req, reply) => {
      const { id: userId } = req.user;
      const { id: serverId, provider } = req.params as RouteParams & { provider: string };
      const server = await ownServer(userId, serverId);
      if (!server) return reply.status(404).send({ error: 'Not found' });

      const rawKeys = server.paymentKeys;
      const keysList = Array.isArray(rawKeys) ? (rawKeys as Array<Record<string, unknown>>) : [];

      const existing = keysList.find((k) => k.provider === provider);
      if (!existing) {
        return reply.status(404).send({ error: 'Платёжная система не найдена' });
      }

      const updated = keysList.map((k) => {
        if (k.provider === provider) {
          return { ...k, enabled: k.enabled === false ? true : false };
        }
        return k;
      });

      await prisma.server.update({
        where: { id: serverId },
        data: { paymentKeys: updated },
      });

      return { ok: true };
    },
  );

  app.delete(
    '/api/servers/:id/payment-keys/:provider',
    { preHandler: [app.authenticate], schema: { tags: ['servers'] } },
    async (req, reply) => {
      const { id: userId } = req.user;
      const { id: serverId, provider } = req.params as RouteParams & { provider: string };
      const server = await ownServer(userId, serverId);
      if (!server) return reply.status(404).send({ error: 'Not found' });

      const rawKeys = server.paymentKeys;
      const keysList = Array.isArray(rawKeys) ? (rawKeys as Array<Record<string, unknown>>) : [];

      const updated = keysList.filter((k) => k.provider !== provider);

      await prisma.server.update({
        where: { id: serverId },
        data: { paymentKeys: updated.length > 0 ? updated : [] },
      });

      return { ok: true };
    },
  );

  // ─── Subscription (owner) ───────────────────────────────────

  app.get(
    '/api/servers/:id/subscription',
    { preHandler: [app.authenticate], schema: { tags: ['servers'] } },
    async (req, reply) => {
      const { id: userId } = req.user;
      const { id: serverId } = req.params as RouteParams;
      const server = await ownServer(userId, serverId);
      if (!server) return reply.status(404).send({ error: 'Not found' });

      await checkSubscriptionExpiry(serverId);

      const sub = await prisma.subscription.findUnique({ where: { serverId } });
      return sub || null;
    },
  );

  // ─── Coupons ─────────────────────────────────────────────

  const createCouponSchema = z.object({
    code: z
      .string()
      .min(3)
      .max(20)
      .regex(/^[a-zA-Z0-9]+$/),
    discountType: z.enum(['percentage', 'fixed']),
    discountValue: z.number().positive(),
    usageLimit: z.number().int().positive().optional(),
    expiresAt: z.string().optional(),
  });

  const updateCouponSchema = z.object({
    isActive: z.boolean().optional(),
    usageLimit: z.number().int().positive().nullable().optional(),
    expiresAt: z.string().nullable().optional(),
  });

  app.get(
    '/api/servers/:id/coupons',
    { preHandler: [app.authenticate], schema: { tags: ['servers'] } },
    async (req, reply) => {
      const { id: userId } = req.user;
      const { id: serverId } = req.params as RouteParams;
      const server = await ownServer(userId, serverId);
      if (!server) return reply.status(404).send({ error: 'Not found' });

      const query = z
        .object({
          page: z.coerce.number().int().min(1).optional().default(1),
          limit: z.coerce.number().int().min(1).max(100).optional().default(20),
        })
        .parse(req.query);
      const skip = (query.page - 1) * query.limit;

      const [coupons, total] = await Promise.all([
        prisma.coupon.findMany({
          where: { serverId },
          orderBy: { createdAt: 'desc' },
          skip,
          take: query.limit,
        }),
        prisma.coupon.count({ where: { serverId } }),
      ]);

      return {
        items: coupons,
        pagination: { page: query.page, limit: query.limit, total, pages: Math.ceil(total / query.limit) },
      };
    },
  );

  app.post(
    '/api/servers/:id/coupons',
    { preHandler: [app.authenticate], schema: { tags: ['servers'] } },
    async (req, reply) => {
      const { id: userId } = req.user;
      const { id: serverId } = req.params as RouteParams;
      const server = await ownServer(userId, serverId);
      if (!server) return reply.status(404).send({ error: 'Not found' });

      const parsed = createCouponSchema.safeParse(req.body);
      if (!parsed.success) return reply.status(400).send({ error: parsed.error.flatten() });

      if (
        parsed.data.discountType === 'percentage' &&
        (parsed.data.discountValue < 1 || parsed.data.discountValue > 99)
      ) {
        return reply.status(400).send({ error: 'Percentage discount must be between 1 and 99' });
      }

      const existing = await prisma.coupon.findUnique({
        where: { serverId_code: { serverId, code: parsed.data.code.toUpperCase() } },
      });
      if (existing) return reply.status(409).send({ error: 'Coupon code already exists' });

      const coupon = await prisma.coupon.create({
        data: {
          serverId,
          code: parsed.data.code.toUpperCase(),
          discountType: parsed.data.discountType,
          discountValue: parsed.data.discountValue,
          usageLimit: parsed.data.usageLimit,
          expiresAt: parsed.data.expiresAt ? new Date(parsed.data.expiresAt) : null,
        },
      });

      return coupon;
    },
  );

  app.patch(
    '/api/servers/:id/coupons/:couponId',
    { preHandler: [app.authenticate], schema: { tags: ['servers'] } },
    async (req, reply) => {
      const { id: userId } = req.user;
      const { id: serverId, couponId } = req.params as RouteParams;
      const server = await ownServer(userId, serverId);
      if (!server) return reply.status(404).send({ error: 'Not found' });

      const parsed = updateCouponSchema.safeParse(req.body);
      if (!parsed.success) return reply.status(400).send({ error: parsed.error.flatten() });

      const coupon = await prisma.coupon.findFirst({ where: { id: couponId, serverId } });
      if (!coupon) return reply.status(404).send({ error: 'Not found' });

      return prisma.coupon.update({
        where: { id: couponId },
        data: {
          ...(parsed.data.isActive !== undefined ? { isActive: parsed.data.isActive } : {}),
          ...(parsed.data.usageLimit !== undefined ? { usageLimit: parsed.data.usageLimit } : {}),
          ...(parsed.data.expiresAt !== undefined
            ? { expiresAt: parsed.data.expiresAt ? new Date(parsed.data.expiresAt) : null }
            : {}),
        },
      });
    },
  );

  app.delete(
    '/api/servers/:id/coupons/:couponId',
    { preHandler: [app.authenticate], schema: { tags: ['servers'] } },
    async (req, reply) => {
      const { id: userId } = req.user;
      const { id: serverId, couponId } = req.params as RouteParams;
      const server = await ownServer(userId, serverId);
      if (!server) return reply.status(404).send({ error: 'Not found' });

      const coupon = await prisma.coupon.findFirst({ where: { id: couponId, serverId } });
      if (!coupon) return reply.status(404).send({ error: 'Not found' });

      await prisma.coupon.delete({ where: { id: couponId } });
      return { ok: true };
    },
  );

  // ─── Caddy on-demand TLS check ─────────────────────────────

  app.get(
    '/api/check-domain',
    {
      config: { rateLimit: { max: 10, timeWindow: '1 minute' } },
    },
    async (req, reply) => {
      const ip = req.ip?.startsWith('::ffff:') ? req.ip.slice(7) : req.ip;
      if (ip !== '127.0.0.1' && ip !== '::1') {
        return reply.status(403).send({ status: 'forbidden' });
      }

      const domain = (req.query as { domain?: string }).domain || req.headers.host || '';
      if (!domain) return reply.status(400).send({ status: 'invalid' });
      const server = await prisma.server.findFirst({
        where: { customDomain: domain },
        select: { id: true },
      });
      // Caddy authorizes cert issuance on ANY 2xx from the ask endpoint, so an
      // unknown domain must be answered with a non-2xx status, never 200.
      if (!server) return reply.status(403).send({ status: 'invalid' });
      return { status: 'valid' };
    },
  );
}
