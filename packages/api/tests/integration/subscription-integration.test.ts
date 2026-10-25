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
    create: { id: 'global', operatingMode: 'individual', subscriptionPrice: 9.99 },
    update: { operatingMode: 'individual', subscriptionPrice: 9.99 },
  });
});

describe('Subscription — продление через вебхук', () => {
  it('вебхук type=subscription продлевает активную подписку на 30 дней', async () => {
    const { user } = await createTestUser(app, 'sub-' + crypto.randomUUID() + '@test.com');
    const server = await createTestServer(user.id);

    const sub = await prisma.subscription.create({
      data: {
        serverId: server.id,
        status: 'active',
        price: 9.99,
        expiresAt: new Date(Date.now() + 1 * 24 * 60 * 60 * 1000),
      },
    });

    const params = new URLSearchParams();
    params.set('mock_confirm', crypto.randomUUID());
    params.set('metadata', JSON.stringify({ serverId: server.id, type: 'subscription', userId: user.id }));
    params.set('amount', '9.99');

    const res = await app.inject({ method: 'POST', url: `/api/payment/webhook?${params.toString()}` });
    expect(res.statusCode).toBe(200);

    const updated = await prisma.subscription.findUnique({ where: { id: sub.id } });
    expect(updated?.status).toBe('active');
    expect(updated?.chargedFrom).toBe('payment');
    expect(updated!.expiresAt.getTime()).toBeGreaterThan(Date.now() + 25 * 24 * 60 * 60 * 1000);
    expect(updated!.transactionId).not.toBeNull();

    const auditLog = await prisma.auditLog.findFirst({
      where: { action: 'subscription_renew', targetId: server.id },
    });
    expect(auditLog).not.toBeNull();
  });
});

describe('Subscription — возврат при смене на commission', () => {
  it('refundSubscription возвращает пропорциональную сумму на баланс', async () => {
    const { user, authHeaders } = await createTestUser(app, 'sub-' + crypto.randomUUID() + '@test.com');

    await prisma.user.update({
      where: { id: user.id },
      data: { balance: { increment: 100 } },
    });

    const server = await createTestServer(user.id);

    // Переключаем сервер на подписку через API (создаст subscription и спишет баланс)
    await prisma.server.update({
      where: { id: server.id },
      data: { planType: 'subscription' },
    });

    const sub = await prisma.subscription.create({
      data: {
        serverId: server.id,
        status: 'active',
        price: 9.99,
        expiresAt: new Date(Date.now() + 25 * 24 * 60 * 60 * 1000),
        chargedFrom: 'balance',
      },
    });

    const balanceBefore = await prisma.user.findUnique({ where: { id: user.id }, select: { balance: true } });

    const res = await app.inject({
      method: 'PATCH',
      url: `/api/servers/${server.id}`,
      headers: authHeaders,
      body: { planType: 'commission' },
    });
    expect(res.statusCode).toBe(200);

    const updatedSub = await prisma.subscription.findUnique({ where: { id: sub.id } });
    expect(updatedSub?.status).toBe('cancelled');

    const updatedServer = await prisma.server.findUnique({ where: { id: server.id } });
    expect(updatedServer?.planType).toBe('commission');

    const balanceAfter = await prisma.user.findUnique({ where: { id: user.id }, select: { balance: true } });
    expect(Number(balanceAfter!.balance)).toBeGreaterThan(Number(balanceBefore!.balance));
  });
});

describe('Subscription — истекшая подписка снимает деньги', () => {
  it('checkSubscriptionExpiry продлевает подписку при достаточном балансе', async () => {
    const { user } = await createTestUser(app, 'sub-' + crypto.randomUUID() + '@test.com');
    const server = await createTestServer(user.id);

    await prisma.user.update({
      where: { id: user.id },
      data: { balance: { increment: 100 } },
    });

    const sub = await prisma.subscription.create({
      data: {
        serverId: server.id,
        status: 'active',
        price: 9.99,
        expiresAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000),
      },
    });

    await prisma.server.update({
      where: { id: server.id },
      data: { planType: 'subscription' },
    });

    const { checkSubscriptionExpiry } = await import('../../src/services/subscription-service.js');
    await checkSubscriptionExpiry(server.id);

    const updated = await prisma.subscription.findUnique({ where: { id: sub.id } });
    expect(updated?.status).toBe('active');
    expect(updated!.expiresAt.getTime()).toBeGreaterThan(Date.now() + 25 * 24 * 60 * 60 * 1000);
  });

  it('checkSubscriptionExpiry переключает на commission при недостатке средств', async () => {
    const { user } = await createTestUser(app, 'sub-' + crypto.randomUUID() + '@test.com');
    const server = await createTestServer(user.id);

    await prisma.user.update({
      where: { id: user.id },
      data: { balance: 0 },
    });

    await prisma.wallet.update({
      where: { serverId: server.id },
      data: { balance: 0 },
    });

    const sub = await prisma.subscription.create({
      data: {
        serverId: server.id,
        status: 'active',
        price: 9.99,
        expiresAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000),
      },
    });

    await prisma.server.update({
      where: { id: server.id },
      data: { planType: 'subscription' },
    });

    const { checkSubscriptionExpiry } = await import('../../src/services/subscription-service.js');
    await checkSubscriptionExpiry(server.id);

    const updatedSub = await prisma.subscription.findUnique({ where: { id: sub.id } });
    expect(updatedSub?.status).toBe('expired');

    const updatedServer = await prisma.server.findUnique({ where: { id: server.id } });
    expect(updatedServer?.planType).toBe('commission');
  });
});

describe('Subscription — двойное продление защищено updateMany', () => {
  it('параллельные checkSubscriptionExpiry — только одно продление', async () => {
    const { user } = await createTestUser(app, 'sub-' + crypto.randomUUID() + '@test.com');
    const server = await createTestServer(user.id);

    await prisma.user.update({
      where: { id: user.id },
      data: { balance: { increment: 100 } },
    });

    const sub = await prisma.subscription.create({
      data: {
        serverId: server.id,
        status: 'active',
        price: 9.99,
        expiresAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000),
      },
    });

    await prisma.server.update({
      where: { id: server.id },
      data: { planType: 'subscription' },
    });

    const { checkSubscriptionExpiry } = await import('../../src/services/subscription-service.js');

    const results = await Promise.allSettled([
      checkSubscriptionExpiry(server.id),
      checkSubscriptionExpiry(server.id),
    ]);

    const fulfilled = results.filter((r) => r.status === 'fulfilled');
    expect(fulfilled.length).toBe(2);

    const updated = await prisma.subscription.findUnique({ where: { id: sub.id } });
    expect(updated?.status).toBe('active');

    const userAfter = await prisma.user.findUnique({ where: { id: user.id } });
    expect(Number(userAfter!.balance)).toBeCloseTo(100 - 9.99, 1);
  });
});
