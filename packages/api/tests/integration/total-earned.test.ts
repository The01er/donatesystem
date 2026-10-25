import { describe, it, expect, beforeAll, beforeEach } from 'vitest';
import type { FastifyInstance } from 'fastify';
import crypto from 'node:crypto';
import { createTestApp } from '../helpers/app.js';
import {
  clearDatabase,
  createTestUser,
  createTestAdmin,
  createTestServer,
  createTestProduct,
} from '../helpers/fixtures.js';
import prisma from '../../src/plugins/prisma.js';
import { OrderStatus } from '../../src/constants/order-status.js';

let app: FastifyInstance;

async function confirmOrder(orderId: string) {
  const webhookUrl = `/api/payment/webhook?mock_confirm=${crypto.randomUUID()}&metadata=${encodeURIComponent(JSON.stringify({ orderId, type: 'order' }))}`;
  const whRes = await app.inject({ method: 'POST', url: webhookUrl });
  expect(whRes.statusCode).toBe(200);
}

beforeAll(async () => {
  app = await createTestApp();
});

beforeEach(async () => {
  await clearDatabase();
});

describe('Wallet.totalEarned — корректный учёт при PAID/CANCEL', () => {
  it('totalEarned инкрементится на ownerAmount при оплате заказа', async () => {
    const { user } = await createTestUser(app);
    const server = await createTestServer(user.id);
    const product = await createTestProduct(server.id, { price: 1000 });

    const initial = await prisma.wallet.findUnique({ where: { serverId: server.id } });
    expect(Number(initial?.totalEarned)).toBe(0);

    const orderRes = await app.inject({
      method: 'POST',
      url: `/api/shop/${server.slug}/order`,
      payload: { productId: product.id, playerName: 'Player1', consent: true },
    });
    expect(orderRes.statusCode).toBe(200);
    const { orderId } = JSON.parse(orderRes.body);

    await confirmOrder(orderId);

    const wallet = await prisma.wallet.findUnique({ where: { serverId: server.id } });
    expect(Number(wallet?.balance)).toBe(900);
    expect(Number(wallet?.totalEarned)).toBe(900);
  });

  it('totalEarned декрементится при admin cancel PAID-заказа', async () => {
    const { user } = await createTestUser(app);
    const { authHeaders: adminHeaders } = await createTestAdmin(app);
    const server = await createTestServer(user.id);
    const product = await createTestProduct(server.id, { price: 1000 });

    const orderRes = await app.inject({
      method: 'POST',
      url: `/api/shop/${server.slug}/order`,
      payload: { productId: product.id, playerName: 'Player1', consent: true },
    });
    const { orderId } = JSON.parse(orderRes.body);
    await confirmOrder(orderId);

    const w1 = await prisma.wallet.findUnique({ where: { serverId: server.id } });
    expect(Number(w1?.totalEarned)).toBe(900);

    const cancelRes = await app.inject({
      method: 'POST',
      url: `/api/admin/orders/${orderId}/cancel`,
      headers: adminHeaders,
      payload: { reason: 'test cancel' },
    });
    expect(cancelRes.statusCode).toBe(200);

    const w2 = await prisma.wallet.findUnique({ where: { serverId: server.id } });
    expect(Number(w2?.balance)).toBe(0);
    expect(Number(w2?.totalEarned)).toBe(0);
  });

  it('totalEarned НЕ меняется на подписке (ownerAmount=0)', async () => {
    const { user } = await createTestUser(app);
    const server = await createTestServer(user.id);
    const product = await createTestProduct(server.id, { price: 1000 });

    await prisma.server.update({
      where: { id: server.id },
      data: { planType: 'subscription' },
    });

    const order = await prisma.order.create({
      data: {
        serverId: server.id,
        productId: product.id,
        playerName: 'Player1',
        status: OrderStatus.PENDING,
        totalAmount: 1000,
        commissionPct: 0,
        commissionAmt: 0,
        ownerAmount: 0,
      },
    });

    await confirmOrder(order.id);

    const w = await prisma.wallet.findUnique({ where: { serverId: server.id } });
    expect(Number(w?.balance)).toBe(0);
    expect(Number(w?.totalEarned)).toBe(0);
  });
});
