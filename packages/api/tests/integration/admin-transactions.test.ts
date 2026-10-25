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

async function createTestAdmin(app: FastifyInstance, email: string, role: 'SUPER_ADMIN' | 'ADMIN' | 'FINANCE' | 'SUPPORT' = 'SUPER_ADMIN') {
  const bcrypt = await import('bcryptjs');
  const hash = await bcrypt.hash('adminpass123', 10);
  const user = await prisma.user.create({ data: { email, password: hash } });
  const session = await prisma.userSession.create({
    data: { userId: user.id, expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) },
  });
  const token = app.jwt.sign({ id: user.id, jti: session.id }, { expiresIn: '7d' });
  await prisma.platformStaff.create({ data: { userId: user.id, role } });
  return { user, authHeaders: { Cookie: `donate_session=${token}` } as Record<string, string> };
}

async function confirmOrder(orderId: string) {
  const params = new URLSearchParams();
  params.set('mock_confirm', crypto.randomUUID());
  params.set('metadata', JSON.stringify({ orderId, type: 'order', amount: 1000 }));
  const res = await app.inject({ method: 'POST', url: `/api/payment/webhook?${params.toString()}` });
  expect(res.statusCode).toBe(200);
}

describe('Admin — блокировка сервера', () => {
  it('SUPER_ADMIN блокирует сервер, витрина возвращает 404', async () => {
    const { user } = await createTestUser(app, 'admin-' + crypto.randomUUID() + '@test.com');
    const server = await createTestServer(user.id);

    const admin = await createTestAdmin(app, 'admin-block@test.com', 'SUPER_ADMIN');

    const blockRes = await app.inject({
      method: 'POST',
      url: `/api/admin/servers/${server.id}/block`,
      headers: admin.authHeaders,
      body: { reason: 'Violation of terms' },
    });
    expect(blockRes.statusCode).toBe(200);

    const blocked = await prisma.server.findUnique({ where: { id: server.id } });
    expect(blocked?.blockedAt).not.toBeNull();
    expect(blocked?.blockReason).toBe('Blocked by admin');

    const shopRes = await app.inject({
      method: 'GET',
      url: `/api/shop/${server.slug}`,
    });
    expect(shopRes.statusCode).toBe(404);
  });

  it('разблокировка сервера восстанавливает витрину', async () => {
    const { user } = await createTestUser(app, 'admin-' + crypto.randomUUID() + '@test.com');
    const server = await createTestServer(user.id);

    const admin = await createTestAdmin(app, 'admin-unblock@test.com', 'SUPER_ADMIN');

    await app.inject({
      method: 'POST',
      url: `/api/admin/servers/${server.id}/block`,
      headers: admin.authHeaders,
      body: { reason: 'Temporary block' },
    });

    const unblockRes = await app.inject({
      method: 'POST',
      url: `/api/admin/servers/${server.id}/unblock`,
      headers: admin.authHeaders,
    });
    expect(unblockRes.statusCode).toBe(200);

    const unblocked = await prisma.server.findUnique({ where: { id: server.id } });
    expect(unblocked?.blockedAt).toBeNull();
    expect(unblocked?.blockReason).toBeNull();

    const shopRes = await app.inject({
      method: 'GET',
      url: `/api/shop/${server.slug}`,
    });
    expect(shopRes.statusCode).toBe(200);
  });
});

describe('Admin — отмена paid-заказа админом', () => {
  it('admin cancel возвращает stock + ownerAmount + refund-транзакцию', async () => {
    const { user, authHeaders: userAuth } = await createTestUser(app, 'admin-' + crypto.randomUUID() + '@test.com');
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
      body: { productId: product.id, playerName: 'AdminCancelPlayer', consent: true },
    });
    const { orderId } = JSON.parse(orderRes.body);
    await confirmOrder(orderId);

    const walletBefore = await prisma.wallet.findUnique({ where: { serverId: server.id } });
    expect(Number(walletBefore!.balance)).toBe(2000 + 900);

    const admin = await createTestAdmin(app, 'admin-cancel2@test.com', 'ADMIN');

    const cancelRes = await app.inject({
      method: 'POST',
      url: `/api/admin/orders/${orderId}/cancel`,
      headers: admin.authHeaders,
      body: { reason: 'Admin initiated cancel for testing' },
    });
    expect(cancelRes.statusCode).toBe(200);

    const order = await prisma.order.findUnique({ where: { id: orderId } });
    expect(order?.status).toBe(OrderStatus.CANCELLED);

    const refreshedProduct = await prisma.product.findUnique({ where: { id: product.id } });
    expect(refreshedProduct?.stock).toBe(2);

    const walletAfter = await prisma.wallet.findUnique({ where: { serverId: server.id } });
    expect(Number(walletAfter!.balance)).toBe(2000);

    const txn = await prisma.transaction.findFirst({
      where: { walletId: walletAfter!.id, type: 'refund' },
    });
    expect(txn).not.toBeNull();
    expect(Number(txn!.amount)).toBe(-900);
  });
});

describe('Admin — атомарное продление подписки с auditLog', () => {
  it('admin extend создаёт AuditLog и продлевает expiresAt', async () => {
    const { user } = await createTestUser(app, 'admin-' + crypto.randomUUID() + '@test.com');
    const server = await createTestServer(user.id);

    const sub = await prisma.subscription.create({
      data: {
        serverId: server.id,
        status: 'active',
        price: 9.99,
        expiresAt: new Date(Date.now() + 1 * 24 * 60 * 60 * 1000),
      },
    });

    const admin = await createTestAdmin(app, 'admin-extend@test.com', 'ADMIN');

    const res = await app.inject({
      method: 'POST',
      url: `/api/admin/subscriptions/${sub.id}/extend`,
      headers: admin.authHeaders,
      body: { days: 30 },
    });
    expect(res.statusCode).toBe(200);

    const updated = await prisma.subscription.findUnique({ where: { id: sub.id } });
    expect(updated?.status).toBe('active');

    const expected = new Date(sub.expiresAt.getTime() + 30 * 24 * 60 * 60 * 1000);
    const diffMs = Math.abs(updated!.expiresAt.getTime() - expected.getTime());
    expect(diffMs).toBeLessThan(5000);

    const auditLog = await prisma.auditLog.findFirst({
      where: { action: 'admin_extend_subscription', targetId: sub.id },
    });
    expect(auditLog).not.toBeNull();
  });
});

describe('Admin — параллельные approve выплаты', () => {
  it('два параллельных approve — атомарный decrement баланса', async () => {
    const { user } = await createTestUser(app, 'admin-' + crypto.randomUUID() + '@test.com');
    const server = await createTestServer(user.id);

    await prisma.wallet.update({
      where: { serverId: server.id },
      data: { balance: { increment: 1000 } },
    });

    const withdrawal = await prisma.withdrawalRequest.create({
      data: {
        walletId: server.wallet!.id,
        serverId: server.id,
        amount: 500,
        method: 'card',
        destination: 'test-card',
        status: 'pending',
      },
    });

    const admin = await createTestAdmin(app, 'admin-approve2@test.com', 'ADMIN');

    // Сбросим, что первый approve уже возможет статус
    const results = await Promise.allSettled([
      app.inject({
        method: 'POST',
        url: `/api/admin/withdrawals/${withdrawal.id}/approve`,
        headers: admin.authHeaders,
      }),
      app.inject({
        method: 'POST',
        url: `/api/admin/withdrawals/${withdrawal.id}/approve`,
        headers: admin.authHeaders,
      }),
    ]);

    // MVCC: оба могут вернуть 200, но баланс должен быть корректен
    const wallet = await prisma.wallet.findUnique({ where: { serverId: server.id } });
    expect(Number(wallet!.balance)).toBe(500);

    const updated = await prisma.withdrawalRequest.findUnique({ where: { id: withdrawal.id } });
    expect(updated?.status).toBe('approved');

    const txns = await prisma.transaction.findMany({
      where: { walletId: wallet!.id, type: 'payout' },
    });
    expect(txns).toHaveLength(1);
  });
});
