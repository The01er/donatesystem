import 'dotenv/config';
import Fastify from 'fastify';
import cors from '@fastify/cors';
import jwt from '@fastify/jwt';
import cookie from '@fastify/cookie';
import rateLimit from '@fastify/rate-limit';
import fastifyStatic from '@fastify/static';
import multipart from '@fastify/multipart';
import formbody from '@fastify/formbody';
import { config } from './config.js';
import * as Sentry from '@sentry/node';
import { trackTimeout, clearAllTimers } from './lib/timers.js';
import prisma from './plugins/prisma.js';
import authPlugin from './plugins/auth.js';
import platformStaffPlugin from './plugins/platformStaff.js';
import authRoutes from './routes/auth.js';
import serverRoutes from './routes/servers.js';
import shopRoutes from './routes/shop.js';
import pluginRoutes from './routes/plugin.js';
import walletRoutes from './routes/wallet.js';
import memberRoutes from './routes/members.js';
import statsRoutes from './routes/stats.js';
import adminRoutes from './routes/admin.js';
import newsRoutes from './routes/news.js';
import faqRoutes from './routes/faq.js';
import ticketRoutes from './routes/tickets.js';
import analyticsRoutes from './routes/analytics.js';
import paymentRoutes from './routes/payment.js';
import subscriptionRoutes from './routes/subscriptions.js';
import landingRoutes from './routes/landing.js';
import legalRoutes from './routes/legal.js';
import serverLegalRoutes from './routes/server-legal.js';
import rconRoutes from './routes/rcon.js';
import notificationRoutes from './routes/notifications.js';
import adapterRoutes from './routes/adapters.js';
import guideRoutes from './routes/guides.js';
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { OrderStatus } from './constants/order-status.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const app = Fastify({ logger: true, bodyLimit: 10 * 1024 * 1024, trustProxy: 1 });

const corsOrigins = await prisma.platformSettings
  .findUnique({ where: { id: 'global' }, select: { corsOrigins: true } })
  .then((s) => s?.corsOrigins || process.env.CORS_ORIGIN || 'http://localhost:3000')
  .catch(() => process.env.CORS_ORIGIN || 'http://localhost:3000');

await app.register(cors, {
  origin: corsOrigins === 'true' ? true : corsOrigins,
  credentials: true,
});
await app.register(cookie, { secret: config.cookieSecret });
await app.register(jwt, { secret: config.jwtSecret, cookie: { cookieName: 'donate_session', signed: true } });
await app.register(rateLimit, { max: 100, timeWindow: '1 minute' });
await app.register(multipart, { limits: { fileSize: 5 * 1024 * 1024 } });
await app.register(formbody);

const uploadsDir = config.uploadsDir;
import { existsSync, mkdirSync } from 'node:fs';
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

// Routes
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
await app.register(subscriptionRoutes);
await app.register(landingRoutes);
await app.register(legalRoutes);
await app.register(serverLegalRoutes);
await app.register(rconRoutes);
await app.register(notificationRoutes);
await app.register(adapterRoutes);
await app.register(guideRoutes);

// Seed PlatformSettings if not exists
await prisma.platformSettings.upsert({
  where: { id: 'global' },
  create: { id: 'global' },
  update: {},
});

// Seed legal documents if not exists
const LEGAL_TEMPLATES_DIR = join(__dirname, 'legal-templates');
const platformCfg = await prisma.platformSettings.findUnique({ where: { id: 'global' } });
const mode = platformCfg?.operatingMode || 'self_employed';
const legalTemplateSuffix = mode === 'individual' ? 'individual' : 'self_employed';
const legalDocs = [
  { slug: 'offer', title: 'Оферта об оказании услуг' },
  { slug: 'privacy', title: 'Политика конфиденциальности' },
  { slug: 'terms', title: 'Пользовательское соглашение' },
];
for (const doc of legalDocs) {
  const existing = await prisma.legalDocument.findUnique({ where: { slug: doc.slug } });
  if (!existing) {
    try {
      const content = readFileSync(join(LEGAL_TEMPLATES_DIR, `${doc.slug}_${legalTemplateSuffix}.html`), 'utf-8');
      await prisma.legalDocument.create({ data: { slug: doc.slug, title: doc.title, content } });
      app.log.info({ slug: doc.slug, mode }, '[seed] legal document created');
    } catch (err) {
      app.log.warn({ slug: doc.slug, err }, '[seed] failed to create legal document');
    }
  }
}

// ── Scheduled cleanup tasks ─────────────────────────────

function scheduleTask(name: string, fn: () => Promise<void>, intervalMs: number) {
  const run = async () => {
    try {
      await fn();
    } catch (err) {
      app.log.error({ err }, `[cleanup] ${name} failed`);
    }
    trackTimeout(run, intervalMs);
  };
  trackTimeout(run, intervalMs);
}

// Clean up expired sessions — every 60 minutes
const cleanupSessions = async () => {
  await prisma.userSession.deleteMany({ where: { expiresAt: { lt: new Date() } } });
};
await cleanupSessions();
scheduleTask('sessions', cleanupSessions, 60 * 60 * 1000);

// Clean up stuck delivering orders (no heartbeat > 5 min) — every 5 minutes
const STUCK_TIMEOUT_MS = 5 * 60 * 1000;
const cleanupStuck = async () => {
  const result = await prisma.order.updateMany({
    where: { status: OrderStatus.DELIVERING, heartbeatAt: { lt: new Date(Date.now() - STUCK_TIMEOUT_MS) } },
    data: {
      status: OrderStatus.PAID,
      lastError: 'Delivery timed out (no heartbeat)',
      heartbeatAt: null,
      committedActions: null,
      retryCount: { increment: 1 },
    },
  });
  if (result.count > 0) {
    app.log.warn({ count: result.count }, '[cleanup] reverted stuck orders');
  }
};
await cleanupStuck();
scheduleTask('stuck-orders', cleanupStuck, 5 * 60 * 1000);

const STALE_PENDING_TIMEOUT_MS = 4 * 60 * 60 * 1000; // 4 hours — enough for banking gateways

// Clean up stale pending orders — every 15 minutes
const cleanupStalePending = async () => {
  const stale = await prisma.order.findMany({
    where: { status: OrderStatus.PENDING, createdAt: { lt: new Date(Date.now() - STALE_PENDING_TIMEOUT_MS) } },
    select: { id: true, productId: true, serverId: true, couponCode: true },
  });

  for (const o of stale) {
    try {
      await prisma.$transaction(async (tx) => {
        const updated = await tx.order.updateMany({
          where: { id: o.id, status: OrderStatus.PENDING },
          data: { status: OrderStatus.CANCELLED, lastError: 'Payment timeout' },
        });
        if (updated.count === 0) return;
        if (o.productId) {
          await tx.product.updateMany({
            where: { id: o.productId, stock: { not: null } },
            data: { stock: { increment: 1 } },
          });
        }
        if (o.couponCode) {
          await tx.coupon.updateMany({
            where: { serverId: o.serverId, code: o.couponCode, usedCount: { gt: 0 } },
            data: { usedCount: { decrement: 1 } },
          });
        }
      });
    } catch (err) {
      app.log.error({ err, orderId: o.id }, '[cleanup] failed to restore stock');
    }
  }
};
await cleanupStalePending();
scheduleTask('stale-pending', cleanupStalePending, 15 * 60 * 1000);

// Clean up old page views (90+ days) — every 24 hours
const cleanupPageViews = async () => {
  await prisma.pageView.deleteMany({ where: { createdAt: { lt: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000) } } });
};
await cleanupPageViews();
scheduleTask('page-views', cleanupPageViews, 24 * 60 * 60 * 1000);

// Subscription renewal check — every 30 minutes
import { runSubscriptionRenewals } from './services/subscription-service.js';
await runSubscriptionRenewals();
scheduleTask('subscriptions', runSubscriptionRenewals, 30 * 60 * 1000);

// Health check with DB
app.get('/api/health', async () => {
  await prisma.$queryRaw`SELECT 1`;
  return { status: 'ok', db: 'ok' };
});

// Global error handler — sanitize errors in production
app.setErrorHandler((error, _req, reply) => {
  const err = error as any;
  app.log.error(err);
  const isProduction = process.env.NODE_ENV === 'production';
  if (isProduction) {
    Sentry.captureException(err, { extra: { statusCode: err.statusCode || 500 } });
  }
  reply.status(err.statusCode || 500).send({
    error: isProduction ? 'Internal Server Error' : err.message || 'Unknown error',
    ...(isProduction ? {} : { stack: err.stack }),
  });
});

app.setNotFoundHandler((_req, reply) => {
  reply.status(404).send({ error: 'Not Found' });
});

// Sentry
if (config.sentryDsn) {
  Sentry.init({
    dsn: config.sentryDsn,
    environment: process.env.NODE_ENV || 'development',
    tracesSampleRate: 0.1,
  });
  app.addHook('onError', async (req, _reply, err) => {
    Sentry.captureException(err, { extra: { url: req.url, method: req.method } });
  });
}

// Graceful shutdown
async function gracefulShutdown(signal: string) {
  app.log.info({ signal }, 'Received signal — shutting down gracefully');
  let hadError = false;
  try {
    clearAllTimers();
    const shutdownTimeout = setTimeout(() => {
      app.log.warn('Shutdown timeout exceeded — forcing exit');
      process.exit(1);
    }, 10000);
    await app.close();
    clearTimeout(shutdownTimeout);
  } catch (err) {
    app.log.error({ err }, 'Error during app.close()');
    hadError = true;
  }
  try {
    await prisma.$disconnect();
  } catch (err) {
    app.log.error({ err }, 'Error during prisma.$disconnect()');
    hadError = true;
  }
  process.exit(hadError ? 1 : 0);
}
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

// Production security checks — hard stop on misconfiguration
if (process.env.NODE_ENV === 'production') {
  const settings = await prisma.platformSettings.findUnique({ where: { id: 'global' }, select: { paymentWebhookIps: true } });
  const envIps = process.env.PAYMENT_WEBHOOK_IPS || '';
  const dbIps = settings?.paymentWebhookIps || '';

  if (!envIps && !dbIps) {
    console.warn('[SECURITY] PAYMENT_WEBHOOK_IPS is not configured — webhook IP filtering is DISABLED');
    console.warn('[SECURITY] Set via admin panel (Settings → Платёжные шлюзы → Список разрешённых IP)');
    console.warn('[SECURITY] YooKassa IPs: 185.71.76.0/27, 91.225.124.0/24');
    console.warn('[SECURITY] AnyPay IPs: 145.239.0.0/16');
  }

  if (!config.paymentWebhookSecret) {
    console.error('[FATAL] PAYMENT_WEBHOOK_SECRET must be configured in production — webhook signing is REQUIRED');
    process.exit(1);
  }
}

// Start
try {
  await app.listen({ port: config.port, host: '0.0.0.0' });
  console.log(`API server running on http://0.0.0.0:${config.port}`);
} catch (err) {
  app.log.error(err);
  process.exit(1);
}
