import { describe, it, expect, beforeAll, beforeEach } from 'vitest';
import type { FastifyInstance } from 'fastify';
import crypto from 'node:crypto';
import { createTestApp } from '../helpers/app.js';
import {
  clearDatabase,
  createTestUser,
  createTestServer,
  createTestProduct,
  createTestCoupon,
  createTestOrder,
} from '../helpers/fixtures.js';
import { OrderStatus } from '../../src/constants/order-status.js';
import prisma from '../../src/plugins/prisma.js';

let app: FastifyInstance;

beforeAll(async () => {
  app = await createTestApp({ noRateLimit: true });
});

beforeEach(async () => {
  await clearDatabase();
  await prisma.platformSettings.upsert({
    where: { id: 'global' },
    create: { id: 'global', operatingMode: 'individual' },
    update: { operatingMode: 'individual' },
  });
});

async function confirmOrder(orderId: string) {
  const params = new URLSearchParams();
  params.set('mock_confirm', crypto.randomUUID());
  params.set('metadata', JSON.stringify({ orderId, type: 'order', amount: 1000 }));
  const res = await app.inject({ method: 'POST', url: `/api/payment/webhook?${params.toString()}` });
  expect(res.statusCode).toBe(200);
}

describe('Stock race — последний товар при параллельных запросах', () => {
  it('stock=1: только один из 5 параллельных заказов проходит', async () => {
    const { user, authHeaders } = await createTestUser(app, 'stock-' + crypto.randomUUID() + '@test.com');
    const server = await createTestServer(user.id);
    const product = await createTestProduct(server.id, { price: 500, stock: 1 });

    const requests = Array.from({ length: 5 }, (_, i) =>
      app.inject({
        method: 'POST',
        url: `/api/shop/${server.slug}/order`,
        headers: authHeaders,
        body: { productId: product.id, playerName: `Player${i}`, consent: true },
      }),
    );

    const results = await Promise.allSettled(requests);
    const successes = results.filter(
      (r) => r.status === 'fulfilled' && (r.value as any).statusCode === 200,
    );
    expect(successes).toHaveLength(1);

    const refreshed = await prisma.product.findUnique({ where: { id: product.id } });
    expect(refreshed?.stock).toBe(0);
  });

  it('stock=0: все запросы отклоняются (soldOut)', async () => {
    const { user, authHeaders } = await createTestUser(app, 'stock-' + crypto.randomUUID() + '@test.com');
    const server = await createTestServer(user.id);
    const product = await createTestProduct(server.id, { price: 500, stock: 0 });

    const requests = Array.from({ length: 3 }, (_, i) =>
      app.inject({
        method: 'POST',
        url: `/api/shop/${server.slug}/order`,
        headers: authHeaders,
        body: { productId: product.id, playerName: `Player${i}`, consent: true },
      }),
    );

    const results = await Promise.allSettled(requests);
    const successes = results.filter(
      (r) => r.status === 'fulfilled' && (r.value as any).statusCode === 200,
    );
    expect(successes).toHaveLength(0);
  });
});

describe('Coupon race — usageLimit=1 при параллельных запросах', () => {
  it('только один из 5 заказов использует купон usageLimit=1', async () => {
    const { user, authHeaders } = await createTestUser(app, 'stock-' + crypto.randomUUID() + '@test.com');
    const server = await createTestServer(user.id);
    const product = await createTestProduct(server.id, { price: 500, stock: 10 });
    await createTestCoupon(server.id, { code: 'LIMIT1', usageLimit: 1, usedCount: 0 });

    const requests = Array.from({ length: 5 }, (_, i) =>
      app.inject({
        method: 'POST',
        url: `/api/shop/${server.slug}/order`,
        headers: authHeaders,
        body: { productId: product.id, playerName: `Player${i}`, couponCode: 'LIMIT1', consent: true },
      }),
    );

    const results = await Promise.allSettled(requests);
    const successes = results.filter(
      (r) => r.status === 'fulfilled' && (r.value as any).statusCode === 200,
    );
    expect(successes.length).toBeGreaterThanOrEqual(1);

    const updated = await prisma.coupon.findUnique({
      where: { serverId_code: { serverId: server.id, code: 'LIMIT1' } },
    });
    expect(updated?.usedCount).toBe(1);
  });

  it('купон без лимита (usageLimit=null) используется всеми', async () => {
    const { user, authHeaders } = await createTestUser(app, 'stock-' + crypto.randomUUID() + '@test.com');
    const server = await createTestServer(user.id);
    const product = await createTestProduct(server.id, { price: 500, stock: 10 });
    await createTestCoupon(server.id, { code: 'UNLIMITED', usageLimit: null, discountValue: 10 });

    const requests = Array.from({ length: 3 }, (_, i) =>
      app.inject({
        method: 'POST',
        url: `/api/shop/${server.slug}/order`,
        headers: authHeaders,
        body: { productId: product.id, playerName: `Player${i}`, couponCode: 'UNLIMITED', consent: true },
      }),
    );

    const results = await Promise.allSettled(requests);
    const successes = results.filter(
      (r) => r.status === 'fulfilled' && (r.value as any).statusCode === 200,
    );
    expect(successes).toHaveLength(3);

    const updated = await prisma.coupon.findUnique({
      where: { serverId_code: { serverId: server.id, code: 'UNLIMITED' } },
    });
    expect(updated?.usedCount).toBe(3);
  });
});

describe('Stock + coupon — восстановление при отмене заказа', () => {
  it('owner cancel восстанавливает stock и decrement' + ' usedCount', async () => {
    const { user, authHeaders } = await createTestUser(app, 'stock-' + crypto.randomUUID() + '@test.com');
    const server = await createTestServer(user.id);
    const product = await createTestProduct(server.id, { price: 1000, stock: 1 });
    await createTestCoupon(server.id, { code: 'RESTORE', usageLimit: 1 });

    const orderRes = await app.inject({
      method: 'POST',
      url: `/api/shop/${server.slug}/order`,
      headers: authHeaders,
      body: { productId: product.id, playerName: 'Player1', couponCode: 'RESTORE', consent: true },
    });
    const { orderId } = JSON.parse(orderRes.body);
    await confirmOrder(orderId);

    const createdOrder = await prisma.order.findUnique({ where: { id: orderId } });
    expect(createdOrder).not.toBeNull();

    await prisma.wallet.update({
      where: { serverId: server.id },
      data: { balance: { increment: 1000 } },
    });

    const cancelRes = await app.inject({
      method: 'POST',
      url: `/api/servers/${server.id}/orders/${orderId}/cancel`,
      headers: authHeaders,
    });
    expect(cancelRes.statusCode).toBe(200);

    const refreshedProduct = await prisma.product.findUnique({ where: { id: product.id } });
    expect(refreshedProduct?.stock).toBe(1);

    const refreshedCoupon = await prisma.coupon.findUnique({
      where: { serverId_code: { serverId: server.id, code: 'RESTORE' } },
    });
    expect(refreshedCoupon?.usedCount).toBe(0);
  });
});
