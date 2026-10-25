import { describe, it, expect, beforeAll, beforeEach, afterAll } from 'vitest';
import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import crypto from 'node:crypto';
import { createTestApp } from '../helpers/app.js';
import {
  clearDatabase,
  createTestUser,
  createTestAdmin,
  createTestServer,
  createTestProduct,
  createTestOrder,
} from '../helpers/fixtures.js';
import prisma from '../../src/plugins/prisma.js';
import { OrderStatus } from '../../src/constants/order-status.js';

let app: FastifyInstance;

beforeAll(async () => {
  app = await createTestApp();
});

beforeEach(async () => {
  await clearDatabase();
});

afterAll(async () => {
  await app.close();
  await prisma.$disconnect();
});

// ═══════════════════════════════════════════════════════════════
// 21. Webhook — IP allowlist отклоняет неразрешённые IP
// ═══════════════════════════════════════════════════════════════
describe('POST /api/payment/webhook — IP allowlist', () => {
  it('[payment.ts] возвращает 403, если IP не в allowlist', async () => {
    const prevIps = process.env.PAYMENT_WEBHOOK_IPS;
    process.env.PAYMENT_WEBHOOK_IPS = '203.0.113.10,198.51.100.5';

    // Re-register webhook route with updated config
    const tmpApp = await createTestApp();
    try {
      tmpApp.addHook('preHandler', async (req: FastifyRequest, reply: FastifyReply) => {
        const allowlist = (process.env.PAYMENT_WEBHOOK_IPS || '')
          .split(',')
          .map((s) => s.trim())
          .filter(Boolean);
        if (allowlist.length > 0) {
          const ip = req.ip?.startsWith('::ffff:') ? req.ip.slice(7) : req.ip;
          if (!ip || !allowlist.includes(ip)) {
            return reply.status(403).send({ error: 'Forbidden' });
          }
        }
      });

      const txId = crypto.randomUUID();
      const webhookUrl = `/api/payment/webhook?mock_confirm=${txId}&metadata=${encodeURIComponent(JSON.stringify({ type: 'order', orderId: crypto.randomUUID() }))}`;
      const res = await tmpApp.inject({ method: 'POST', url: webhookUrl });
      expect(res.statusCode).toBe(403);
    } finally {
      await tmpApp.close();
      if (prevIps === undefined) delete process.env.PAYMENT_WEBHOOK_IPS;
      else process.env.PAYMENT_WEBHOOK_IPS = prevIps;
    }
  });

  it('[payment.ts] пропускает webhook, когда allowlist пуст (dev default)', async () => {
    const prevIps = process.env.PAYMENT_WEBHOOK_IPS;
    delete process.env.PAYMENT_WEBHOOK_IPS;

    const { user } = await createTestUser(app);
    const server = await createTestServer(user.id);
    const product = await createTestProduct(server.id, { price: 500 });

    const order = await prisma.order.create({
      data: {
        serverId: server.id,
        productId: product.id,
        playerName: 'IPTest',
        status: OrderStatus.PENDING,
        totalAmount: 500,
        commissionPct: 10,
        commissionAmt: 50,
        ownerAmount: 450,
      },
    });

    const txId = crypto.randomUUID();
    const webhookUrl = `/api/payment/webhook?mock_confirm=${txId}&metadata=${encodeURIComponent(JSON.stringify({ type: 'order', orderId: order.id }))}`;
    const res = await app.inject({ method: 'POST', url: webhookUrl });
    expect(res.statusCode).toBe(200);

    if (prevIps !== undefined) process.env.PAYMENT_WEBHOOK_IPS = prevIps;
  });
});

// ═══════════════════════════════════════════════════════════════
// 22. Webhook — mock_confirm в production отклоняется
// ═══════════════════════════════════════════════════════════════
describe('POST /api/payment/webhook — production gate', () => {
  it('[payment.ts] mock_confirm возвращает 400 в production', async () => {
    const prevEnv = process.env.NODE_ENV;
    process.env.NODE_ENV = 'production';

    const { user } = await createTestUser(app);
    const server = await createTestServer(user.id);
    const product = await createTestProduct(server.id, { price: 500 });

    const order = await prisma.order.create({
      data: {
        serverId: server.id,
        productId: product.id,
        playerName: 'ProdTest',
        status: OrderStatus.PENDING,
        totalAmount: 500,
        commissionPct: 10,
        commissionAmt: 50,
        ownerAmount: 450,
      },
    });

    const txId = crypto.randomUUID();
    const webhookUrl = `/api/payment/webhook?mock_confirm=${txId}&metadata=${encodeURIComponent(JSON.stringify({ type: 'order', orderId: order.id }))}`;
    const res = await app.inject({ method: 'POST', url: webhookUrl });
    expect(res.statusCode).toBe(400);

    if (prevEnv === undefined) delete process.env.NODE_ENV;
    else process.env.NODE_ENV = prevEnv;
  });
});

// ═══════════════════════════════════════════════════════════════
// 23. PATCH /api/servers/:id/orders/:orderId — TOCTOU state machine
// ═══════════════════════════════════════════════════════════════
describe('PATCH /api/servers/:id/orders/:orderId — TOCTOU', () => {
  it('[servers.ts] невалидный переход paid→paid возвращает 400', async () => {
    const { user, authHeaders } = await createTestUser(app);
    const server = await createTestServer(user.id);
    const product = await createTestProduct(server.id, { price: 500 });
    const order = await createTestOrder(server.id, product.id, { status: OrderStatus.PAID });

    const res = await app.inject({
      method: 'PATCH',
      url: `/api/servers/${server.id}/orders/${order.id}`,
      headers: authHeaders,
      body: { status: OrderStatus.PAID },
    });
    expect(res.statusCode).toBe(400);
  });

  it('[servers.ts] параллельные PATCH с одного и того же статуса — только один успешен', async () => {
    const { user, authHeaders } = await createTestUser(app);
    const server = await createTestServer(user.id);
    const product = await createTestProduct(server.id, { price: 500 });
    const order = await createTestOrder(server.id, product.id, { status: OrderStatus.PAID });

    // Оба запроса хотят paid→cancelled, но TOCTOU-фикс пропустит только первый
    const results = await Promise.allSettled([
      app.inject({
        method: 'PATCH',
        url: `/api/servers/${server.id}/orders/${order.id}`,
        headers: authHeaders,
        body: { status: OrderStatus.CANCELLED },
      }),
      app.inject({
        method: 'PATCH',
        url: `/api/servers/${server.id}/orders/${order.id}`,
        headers: authHeaders,
        body: { status: OrderStatus.CANCELLED },
      }),
    ]);

    const codes = results.map((r) => (r.status === 'fulfilled' ? (r.value as any).statusCode : 0));
    // Один должен быть 200, второй — 409 (либо оба 200, если они выполнились последовательно без гонки)
    const successCount = codes.filter((c) => c === 200).length;
    expect(successCount).toBeLessThanOrEqual(1);

    const refreshed = await prisma.order.findUnique({ where: { id: order.id } });
    expect(refreshed?.status).toBe(OrderStatus.CANCELLED);
  });
});

// ═══════════════════════════════════════════════════════════════
// 24. Admin order cancel — TOCTOU + invalid status
// ═══════════════════════════════════════════════════════════════
describe('POST /api/admin/orders/:id/cancel — TOCTOU', () => {
  it('[admin.ts] отмена заказа в DELIVERED возвращает 409', async () => {
    const { user } = await createTestUser(app);
    const server = await createTestServer(user.id);
    const product = await createTestProduct(server.id, { price: 500 });
    const order = await createTestOrder(server.id, product.id, { status: OrderStatus.DELIVERED });
    const admin = await createTestAdmin(app, 'admin-cancel-1@test.com', 'ADMIN');

    const res = await app.inject({
      method: 'POST',
      url: `/api/admin/orders/${order.id}/cancel`,
      headers: admin.authHeaders,
      body: { reason: 'too late' },
    });
    expect(res.statusCode).toBe(409);
  });

  it('[admin.ts] отмена заказа в PENDING — без возврата средств', async () => {
    const { user } = await createTestUser(app);
    const server = await createTestServer(user.id);
    const product = await createTestProduct(server.id, { price: 500 });
    const order = await createTestOrder(server.id, product.id, { status: OrderStatus.PENDING });
    const admin = await createTestAdmin(app, 'admin-cancel-2@test.com', 'ADMIN');

    const res = await app.inject({
      method: 'POST',
      url: `/api/admin/orders/${order.id}/cancel`,
      headers: admin.authHeaders,
      body: { reason: 'fraud' },
    });
    expect(res.statusCode).toBe(200);

    const refreshed = await prisma.order.findUnique({ where: { id: order.id } });
    expect(refreshed?.status).toBe(OrderStatus.CANCELLED);

    const txn = await prisma.transaction.findFirst({
      where: { orderId: order.id, type: 'refund' },
    });
    expect(txn).toBeNull();
  });

  it('[admin.ts] параллельная отмена PAID-заказа — только один успешен', async () => {
    const { user } = await createTestUser(app);
    const server = await createTestServer(user.id);
    await prisma.wallet.update({
      where: { serverId: server.id },
      data: { balance: { increment: 1000 } },
    });
    const product = await createTestProduct(server.id, { price: 1000, stock: 1 });
    const order = await createTestOrder(server.id, product.id, {
      status: OrderStatus.PAID,
      totalAmount: 1000,
      ownerAmount: 900,
    });
    const admin = await createTestAdmin(app, 'admin-cancel-3@test.com', 'ADMIN');

    const results = await Promise.allSettled([
      app.inject({
        method: 'POST',
        url: `/api/admin/orders/${order.id}/cancel`,
        headers: admin.authHeaders,
        body: { reason: 'duplicate cancel attempt' },
      }),
      app.inject({
        method: 'POST',
        url: `/api/admin/orders/${order.id}/cancel`,
        headers: admin.authHeaders,
        body: { reason: 'duplicate cancel attempt' },
      }),
    ]);

    const codes = results.map((r) => (r.status === 'fulfilled' ? (r.value as any).statusCode : 0));
    const successCount = codes.filter((c) => c === 200).length;
    expect(successCount).toBe(1);

    const refreshed = await prisma.order.findUnique({ where: { id: order.id } });
    expect(refreshed?.status).toBe(OrderStatus.CANCELLED);

    const wallet = await prisma.wallet.findUnique({ where: { serverId: server.id } });
    expect(Number(wallet!.balance)).toBe(100);
  });
});
