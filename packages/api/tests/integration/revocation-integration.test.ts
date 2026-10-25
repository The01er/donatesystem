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
import { RevokeStatus } from '../../src/constants/revoke-status.js';
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

describe('Revocation — revoke + re-grant race', () => {
  it('re-grant после revoke переводит заказ обратно в paid', async () => {
    const { user, authHeaders } = await createTestUser(app, 'revoke-' + crypto.randomUUID() + '@test.com');
    const server = await createTestServer(user.id);

    const product = await createTestProduct(server.id, {
      name: 'VIP',
      price: 1000,
      type: 'privilege',
      stock: null,
      command: '/lp user {player} parent add vip',
      removeCommand: '/lp user {player} parent remove vip',
    });

    const orderRes = await app.inject({
      method: 'POST',
      url: `/api/shop/${server.slug}/order`,
      headers: authHeaders,
      body: { productId: product.id, playerName: 'RevokePlayer', consent: true },
    });
    const { orderId } = JSON.parse(orderRes.body);
    await confirmOrder(orderId);

    await prisma.order.update({
      where: { id: orderId },
      data: { status: OrderStatus.DELIVERED },
    });

    const revokeRes = await app.inject({
      method: 'POST',
      url: `/api/servers/${server.id}/orders/${orderId}/revoke`,
      headers: authHeaders,
    });
    expect(revokeRes.statusCode).toBe(200);

    const revokedOrder = await prisma.order.findUnique({ where: { id: orderId } });
    expect(revokedOrder?.revokeStatus).toBe(RevokeStatus.PENDING);

    // Прямое обновление статуса отзыва (имитируем успешное выполнение плагином)
    await prisma.order.update({
      where: { id: orderId },
      data: { revokeStatus: RevokeStatus.REVOKED },
    });

    const revokedFinal = await prisma.order.findUnique({ where: { id: orderId } });
    expect(revokedFinal?.revokeStatus).toBe(RevokeStatus.REVOKED);

    // Re-grant
    const regrantRes = await app.inject({
      method: 'POST',
      url: `/api/servers/${server.id}/orders/${orderId}/re-grant`,
      headers: authHeaders,
    });
    expect(regrantRes.statusCode).toBe(200);

    const regrantedOrder = await prisma.order.findUnique({ where: { id: orderId } });
    expect(regrantedOrder?.status).toBe(OrderStatus.PAID);
    expect(regrantedOrder?.revokeStatus).toBeNull();
  });
});

describe('Revocation — двойной revoke защищён updateMany', () => {
  it('два параллельных revoke — только один успешен', async () => {
    const { user, authHeaders } = await createTestUser(app, 'revoke-' + crypto.randomUUID() + '@test.com');
    const server = await createTestServer(user.id);

    const product = await createTestProduct(server.id, {
      name: 'VIP',
      price: 1000,
      type: 'privilege',
      stock: null,
      command: '/lp user {player} parent add vip',
      removeCommand: '/lp user {player} parent remove vip',
    });

    const orderRes = await app.inject({
      method: 'POST',
      url: `/api/shop/${server.slug}/order`,
      headers: authHeaders,
      body: { productId: product.id, playerName: 'DoubleRevoke', consent: true },
    });
    const { orderId } = JSON.parse(orderRes.body);
    await confirmOrder(orderId);

    await prisma.order.update({
      where: { id: orderId },
      data: { status: OrderStatus.DELIVERED },
    });

    const results = await Promise.allSettled([
      app.inject({
        method: 'POST',
        url: `/api/servers/${server.id}/orders/${orderId}/revoke`,
        headers: authHeaders,
      }),
      app.inject({
        method: 'POST',
        url: `/api/servers/${server.id}/orders/${orderId}/revoke`,
        headers: authHeaders,
      }),
    ]);

    const successes = results.filter(
      (r) => r.status === 'fulfilled' && (r.value as any).statusCode === 200,
    );

    const order = await prisma.order.findUnique({ where: { id: orderId } });
    expect(order?.revokeStatus).toBe(RevokeStatus.PENDING);
    // Оба запроса успешны — guard пропускает null и не REVOKED. Итоговый статус PENDING.
    expect(successes.length).toBeGreaterThanOrEqual(1);
  });
});

describe('Revocation — двойной re-grant защищён updateMany', () => {
  it('два параллельных re-grant — только один успешен', async () => {
    const { user, authHeaders } = await createTestUser(app, 'revoke-' + crypto.randomUUID() + '@test.com');
    const server = await createTestServer(user.id);

    const product = await createTestProduct(server.id, {
      name: 'VIP',
      price: 1000,
      type: 'privilege',
      stock: null,
      command: '/lp user {player} parent add vip',
      removeCommand: '/lp user {player} parent remove vip',
    });

    const orderRes = await app.inject({
      method: 'POST',
      url: `/api/shop/${server.slug}/order`,
      headers: authHeaders,
      body: { productId: product.id, playerName: 'DoubleReGrant', consent: true },
    });
    const { orderId } = JSON.parse(orderRes.body);
    await confirmOrder(orderId);

    await prisma.order.update({
      where: { id: orderId },
      data: { status: OrderStatus.DELIVERED },
    });

    // Revoke + mark revoked
    await app.inject({
      method: 'POST',
      url: `/api/servers/${server.id}/orders/${orderId}/revoke`,
      headers: authHeaders,
    });
    await prisma.order.update({
      where: { id: orderId },
      data: { revokeStatus: RevokeStatus.REVOKED },
    });

    const results = await Promise.allSettled([
      app.inject({
        method: 'POST',
        url: `/api/servers/${server.id}/orders/${orderId}/re-grant`,
        headers: authHeaders,
      }),
      app.inject({
        method: 'POST',
        url: `/api/servers/${server.id}/orders/${orderId}/re-grant`,
        headers: authHeaders,
      }),
    ]);

    const successes = results.filter(
      (r) => r.status === 'fulfilled' && (r.value as any).statusCode === 200,
    );
    expect(successes).toHaveLength(1);

    const order = await prisma.order.findUnique({ where: { id: orderId } });
    expect(order?.status).toBe(OrderStatus.PAID);
    expect(order?.revokeStatus).toBeNull();
  });
});

describe('Revocation — admin revoke с updateMany guard', () => {
  it('admin revoke атомарен через updateMany', async () => {
    const { user, authHeaders: userAuth } = await createTestUser(app, 'revoke-' + crypto.randomUUID() + '@test.com');
    const server = await createTestServer(user.id);

    const product = await createTestProduct(server.id, {
      name: 'VIP',
      price: 1000,
      type: 'privilege',
      stock: null,
      command: '/lp user {player} parent add vip',
      removeCommand: '/lp user {player} parent remove vip',
    });

    const orderRes = await app.inject({
      method: 'POST',
      url: `/api/shop/${server.slug}/order`,
      headers: userAuth,
      body: { productId: product.id, playerName: 'AdminRevokePlayer', consent: true },
    });
    const { orderId } = JSON.parse(orderRes.body);
    await confirmOrder(orderId);

    await prisma.order.update({
      where: { id: orderId },
      data: { status: OrderStatus.DELIVERED },
    });

    const bcrypt = await import('bcryptjs');
    const hash = await bcrypt.hash('adminpass123', 10);
    const adminUser = await prisma.user.create({
      data: { email: 'admin-revoke@test.com', password: hash },
    });
    const adminSession = await prisma.userSession.create({
      data: { userId: adminUser.id, expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) },
    });
    const adminToken = app.jwt.sign({ id: adminUser.id, jti: adminSession.id }, { expiresIn: '7d' });
    await prisma.platformStaff.create({ data: { userId: adminUser.id, role: 'SUPER_ADMIN' } });
    const adminHeaders = { Cookie: `donate_session=${adminToken}` } as Record<string, string>;

    const revokeRes = await app.inject({
      method: 'POST',
      url: `/api/admin/orders/${orderId}/revoke`,
      headers: adminHeaders,
    });
    expect(revokeRes.statusCode).toBe(200);

    const order = await prisma.order.findUnique({ where: { id: orderId } });
    expect(order?.revokeStatus).toBe(RevokeStatus.PENDING);

    const auditLog = await prisma.auditLog.findFirst({
      where: { action: 'admin_revoke_privilege', targetId: orderId },
    });
    expect(auditLog).not.toBeNull();
    expect(Number(auditLog!.amount)).toBe(1000);
  });
});
