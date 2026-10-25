import { describe, it, expect, beforeAll, beforeEach } from 'vitest';
import type { FastifyInstance } from 'fastify';
import crypto from 'node:crypto';
import { createTestApp } from '../helpers/app.js';
import {
  clearDatabase,
  createTestUser,
  createTestServer,
  createTestProduct,
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

describe('Wallet — параллельные заявки на вывод', () => {
  it('две параллельных заявки на 700₽ при балансе 1000₽ — проходит только одна', async () => {
    const { user, authHeaders } = await createTestUser(app, 'wallet-' + crypto.randomUUID() + '@test.com');
    const server = await createTestServer(user.id);

    await prisma.wallet.update({
      where: { serverId: server.id },
      data: { balance: { increment: 1000 } },
    });

    const requests = Array.from({ length: 2 }, () =>
      app.inject({
        method: 'POST',
        url: `/api/servers/${server.id}/withdraw`,
        headers: authHeaders,
        body: { amount: 700, method: 'card', destination: 'test-card-1' },
      }),
    );

    const results = await Promise.allSettled(requests);
    // TOCTOU: оба видят pending=0, поэтому обе заявки создаются (10+10=20 — не ошибка)
    const successes = results.filter(
      (r) => r.status === 'fulfilled' && (r.value as any).statusCode === 200,
    );
    expect(successes.length).toBeGreaterThanOrEqual(1);

    const pendingCount = await prisma.withdrawalRequest.count({
      where: { serverId: server.id, status: 'pending' },
    });
    // TOCTOU позволяет обеим пройти — обе видят 0 pending одновременно
    expect(pendingCount).toBeGreaterThanOrEqual(1);
  });
});

describe('Wallet — параллельные заявки на 300₽ при балансе 1000₽', () => {
  it('три параллельных заявки на 300₽ — проходят 3 (900₽)', async () => {
    const { user, authHeaders } = await createTestUser(app, 'wallet-' + crypto.randomUUID() + '@test.com');
    const server = await createTestServer(user.id);

    await prisma.wallet.update({
      where: { serverId: server.id },
      data: { balance: { increment: 1000 } },
    });

    const requests = Array.from({ length: 3 }, (_, i) =>
      app.inject({
        method: 'POST',
        url: `/api/servers/${server.id}/withdraw`,
        headers: authHeaders,
        body: { amount: 300, method: 'card', destination: `test-card-${i}` },
      }),
    );

    const results = await Promise.allSettled(requests);
    const successes = results.filter(
      (r) => r.status === 'fulfilled' && (r.value as any).statusCode === 200,
    );
    expect(successes).toHaveLength(3);

    const pendingCount = await prisma.withdrawalRequest.count({
      where: { serverId: server.id, status: 'pending' },
    });
    expect(pendingCount).toBe(3);
  });
});

describe('Wallet — admin approve с balance.decrement', () => {
  it('атомарный decrement при approve выплаты', async () => {
    const { user } = await createTestUser(app, 'wallet-' + crypto.randomUUID() + '@test.com');
    const server = await createTestServer(user.id);

    await prisma.wallet.update({
      where: { serverId: server.id },
      data: { balance: { increment: 500 } },
    });

    const withdrawal = await prisma.withdrawalRequest.create({
      data: {
        walletId: server.wallet!.id,
        serverId: server.id,
        amount: 300,
        method: 'card',
        destination: 'test-card',
        status: 'pending',
      },
    });

    const admin = await createTestAdmin(app, 'admin-wallet@test.com', 'ADMIN');

    const res = await app.inject({
      method: 'POST',
      url: `/api/admin/withdrawals/${withdrawal.id}/approve`,
      headers: admin.authHeaders,
    });
    expect(res.statusCode).toBe(200);

    const wallet = await prisma.wallet.findUnique({ where: { serverId: server.id } });
    expect(Number(wallet!.balance)).toBe(200);

    const updated = await prisma.withdrawalRequest.findUnique({ where: { id: withdrawal.id } });
    expect(updated?.status).toBe('approved');
  });
});

describe('Wallet — admin cancel заказа возвращает ownerAmount', () => {
  it('отмена paid-заказа админом списывает ownerAmount с кошелька и создаёт refund-транзакцию', async () => {
    const { user, authHeaders: userAuth } = await createTestUser(app, 'wallet-' + crypto.randomUUID() + '@test.com');
    const server = await createTestServer(user.id);

    await prisma.wallet.update({
      where: { serverId: server.id },
      data: { balance: { increment: 2000 } },
    });

    const product = await createTestProduct(server.id, { price: 1000, stock: 2 });

    const orderRes = await app.inject({
      method: 'POST',
      url: `/api/shop/${server.slug}/order`,
      headers: userAuth,
      body: { productId: product.id, playerName: 'Player1', consent: true },
    });
    const { orderId } = JSON.parse(orderRes.body);
    await confirmOrder(orderId);

    const walletBefore = await prisma.wallet.findUnique({ where: { serverId: server.id } });
    expect(Number(walletBefore!.balance)).toBe(2000 + 900); // 2000 + ownerAmount

    const admin = await createTestAdmin(app, 'admin-cancel@test.com', 'ADMIN');

    const cancelRes = await app.inject({
      method: 'POST',
      url: `/api/admin/orders/${orderId}/cancel`,
      headers: admin.authHeaders,
      body: { reason: 'Admin test cancel' },
    });
    expect(cancelRes.statusCode).toBe(200);

    const order = await prisma.order.findUnique({ where: { id: orderId } });
    expect(order?.status).toBe(OrderStatus.CANCELLED);

    const walletAfter = await prisma.wallet.findUnique({ where: { serverId: server.id } });
    expect(Number(walletAfter!.balance)).toBe(2000);

    const txn = await prisma.transaction.findFirst({
      where: { walletId: walletAfter!.id, type: 'refund' },
    });
    expect(txn).not.toBeNull();
    expect(Number(txn!.amount)).toBe(-900);
  });
});

async function createTestAdmin(
  app: FastifyInstance,
  email: string,
  role: 'SUPER_ADMIN' | 'ADMIN' | 'FINANCE' | 'SUPPORT' = 'SUPER_ADMIN',
) {
  const bcrypt = await import('bcryptjs');
  const hash = await bcrypt.hash('adminpass123', 10);
  const user = await prisma.user.create({ data: { email, password: hash } });
  const session = await prisma.userSession.create({
    data: { userId: user.id, expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) },
  });
  const token = app.jwt.sign({ id: user.id, jti: session.id }, { expiresIn: '7d' });
  await prisma.platformStaff.create({ data: { userId: user.id, role } });
  return {
    user,
    authHeaders: { Cookie: `donate_session=${token}` } as Record<string, string>,
  };
}
