import Fastify from 'fastify';
import cors from '@fastify/cors';
import jwt from '@fastify/jwt';
import cookie from '@fastify/cookie';
import rateLimit from '@fastify/rate-limit';
import multipart from '@fastify/multipart';
import fastifyStatic from '@fastify/static';
import { existsSync, mkdirSync } from 'node:fs';
import { config } from '../../src/config.js';
import prisma from '../../src/plugins/prisma.js';
import authPlugin from '../../src/plugins/auth.js';
import platformStaffPlugin from '../../src/plugins/platformStaff.js';
import authRoutes from '../../src/routes/auth.js';
import serverRoutes from '../../src/routes/servers.js';
import shopRoutes from '../../src/routes/shop.js';
import pluginRoutes from '../../src/routes/plugin.js';
import walletRoutes from '../../src/routes/wallet.js';
import memberRoutes from '../../src/routes/members.js';
import statsRoutes from '../../src/routes/stats.js';
import adminRoutes from '../../src/routes/admin.js';
import newsRoutes from '../../src/routes/news.js';
import faqRoutes from '../../src/routes/faq.js';
import ticketRoutes from '../../src/routes/tickets.js';
import analyticsRoutes from '../../src/routes/analytics.js';
import paymentRoutes from '../../src/routes/payment.js';

export async function createTestApp(opts?: { noRateLimit?: boolean }) {
  const app = Fastify({ logger: false });

  await app.register(cors, { origin: true, credentials: true });
  await app.register(cookie, { secret: config.cookieSecret });
  await app.register(jwt, { secret: config.jwtSecret, cookie: { cookieName: 'donate_session', signed: false } });
  if (!opts?.noRateLimit) {
    await app.register(rateLimit, { max: 1000, timeWindow: '1 minute' });
  }
  await app.register(multipart, { limits: { fileSize: 5 * 1024 * 1024 } });

  const uploadsDir = '/home/donate/uploads';
  if (!existsSync(uploadsDir)) {
    mkdirSync(uploadsDir, { recursive: true });
  }
  await app.register(fastifyStatic, {
    root: uploadsDir,
    prefix: '/uploads/',
    decorateReply: false,
  });

  await app.register(authPlugin);
  await app.register(platformStaffPlugin);

  await app.register(authRoutes);
  await app.register(serverRoutes);
  await app.register(shopRoutes);
  await app.register(pluginRoutes);
  await app.register(walletRoutes);
  await app.register(memberRoutes);
  await app.register(statsRoutes);
  await app.register(adminRoutes);
  await app.register(newsRoutes);
  await app.register(faqRoutes);
  await app.register(ticketRoutes);
  await app.register(analyticsRoutes);
  await app.register(paymentRoutes);

  await prisma.platformSettings.upsert({
    where: { id: 'global' },
    create: { id: 'global', operatingMode: 'individual' },
    update: { operatingMode: 'individual' },
  });

  app.setErrorHandler((error, _req, reply) => {
    const err = error as any;
    reply.status(err.statusCode || 500).send({
      error: err.message || 'Unknown error',
    });
  });

  return app;
}
