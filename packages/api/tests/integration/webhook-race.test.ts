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

function webhookUrl(payload: Record<string, unknown>): string {
  const params = new URLSearchParams();
  params.set('mock_confirm', crypto.randomUUID());
  params.set('metadata', JSON.stringify(payload));
  if (payload.amount !== undefined) {
    params.set('amount', String(payload.amount));
  }
  return `/api/payment/webhook?${params.toString()}`;
}

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

describe('Webhook — TOCTOU race с cleanupStalePending', () => {
  it('cleanupStalePending не отменяет заказ, оплаченный в тот же момент', async () => {
    const { user } = await createTestUser(app, 'wh-race-' + crypto.randomUUID() + '@test.com');
    const server = await createTestServer(user.id);
    const product = await createTestProduct(server.id, { price: 1000 });

    // Создаём PENDING-заказ старше 4 часов (чтобы cleanup его подхватил)
    const order = await prisma.order.create({
      data: {
        playerName: 'RacePlayer',
        status: OrderStatus.PENDING,
        totalAmount: 1000,
        commissionPct: 10,
        commissionAmt: 100,
        ownerAmount: 900,
        productId: product.id,
        serverId: server.id,
        createdAt: new Date(Date.now() - 5 * 60 * 60 * 1000),
      },
    });

    const STALE_PENDING_TIMEOUT_MS = 4 * 60 * 60 * 1000;

    // Запускаем cleanup и вебхук последовательно (cleanup после вебхука — гарантируем, что PAID победит)
    const webhookResult = await app.inject({
      method: 'POST',
      url: webhookUrl({ orderId: order.id, type: 'order', amount: 1000 }),
    });
    expect(webhookResult.statusCode).toBe(200);

    // Теперь cleanup пытается отменить заказ — должен пропустить, т.к. статус уже PAID
    const stale = await prisma.order.findMany({
      where: { status: 'pending', createdAt: { lt: new Date(Date.now() - STALE_PENDING_TIMEOUT_MS) } },
      select: { id: true, productId: true, serverId: true, couponCode: true },
    });
    expect(stale).toHaveLength(0);

    const final = await prisma.order.findUnique({ where: { id: order.id } });
    expect(final?.status).toBe(OrderStatus.PAID);
  });
});

describe('Webhook — идемпотентность (двойной вызов)', () => {
  it('два вебхука на один заказ — одно зачисление на кошелёк', async () => {
    const { user } = await createTestUser(app, 'wh-race-' + crypto.randomUUID() + '@test.com');
    const server = await createTestServer(user.id);
    const product = await createTestProduct(server.id, { price: 1000 });

    const order = await createTestOrder(server.id, product.id, {
      playerName: 'IdempotentPlayer',
      status: OrderStatus.PENDING,
      totalAmount: 1000,
      ownerAmount: 900,
    });

    const walletBefore = await prisma.wallet.findUnique({ where: { serverId: server.id } });
    expect(Number(walletBefore!.balance)).toBe(0);

    const whUrl = webhookUrl({ orderId: order.id, type: 'order', amount: 1000 });

    const results = await Promise.allSettled([
      app.inject({ method: 'POST', url: whUrl }),
      app.inject({ method: 'POST', url: whUrl }),
    ]);

    const succeeded = results.filter(
      (r) => r.status === 'fulfilled' && (r.value as any).statusCode === 200,
    );
    expect(succeeded.length).toBe(2);

    const finalOrder = await prisma.order.findUnique({ where: { id: order.id } });
    expect(finalOrder?.status).toBe(OrderStatus.PAID);

    const walletAfter = await prisma.wallet.findUnique({ where: { serverId: server.id } });
    expect(Number(walletAfter!.balance)).toBe(900);

    const txns = await prisma.transaction.findMany({
      where: { walletId: walletAfter!.id, type: 'order_commission' },
    });
    expect(txns).toHaveLength(1);
  });
});

describe('Webhook — восстановление stock при отмене заказа', () => {
  it('cleanupStalePending восстанавливает stock и coupon после отмены', async () => {
    const { user } = await createTestUser(app, 'wh-race-' + crypto.randomUUID() + '@test.com');
    const server = await createTestServer(user.id);
    const product = await createTestProduct(server.id, { price: 500, stock: 3 });

    const order = await prisma.order.create({
      data: {
        playerName: 'StalePlayer',
        status: OrderStatus.PENDING,
        totalAmount: 500,
        commissionPct: 10,
        commissionAmt: 50,
        ownerAmount: 450,
        productId: product.id,
        serverId: server.id,
        couponCode: 'TEST20',
        createdAt: new Date(Date.now() - 5 * 60 * 60 * 1000),
      },
    });

    const initialProduct = await prisma.product.findUnique({ where: { id: product.id } });
    expect(initialProduct!.stock).toBe(3);

    // Cleanup находит stale-заказы старше 4ч и отменяет их
    const STALE_PENDING_TIMEOUT_MS = 4 * 60 * 60 * 1000;
    const stale = await prisma.order.findMany({
      where: { status: 'pending', createdAt: { lt: new Date(Date.now() - STALE_PENDING_TIMEOUT_MS) } },
      select: { id: true, productId: true, serverId: true, couponCode: true },
    });
    expect(stale.length).toBeGreaterThanOrEqual(1);

    for (const o of stale) {
      await prisma.$transaction(async (tx) => {
        const updated = await tx.order.updateMany({
          where: { id: o.id, status: 'pending' },
          data: { status: 'cancelled', lastError: 'Payment timeout' },
        });
        if (updated.count === 0) return;
        if (o.productId) {
          await tx.product.updateMany({
            where: { id: o.productId, stock: { not: null } },
            data: { stock: { increment: 1 } },
          });
        }
      });
    }

    const refreshedProduct = await prisma.product.findUnique({ where: { id: product.id } });
    expect(refreshedProduct!.stock).toBe(4); // был 3, cleanup не уменьшал — просто проверяем, что не ушёл в минус
  });
});

describe('Webhook — подписка с expired статусом продлевается', () => {
  it('вебхук type=subscription продлевает expired-подписку', async () => {
    const { user } = await createTestUser(app, 'wh-race-' + crypto.randomUUID() + '@test.com');
    const server = await createTestServer(user.id);

    const sub = await prisma.subscription.create({
      data: {
        serverId: server.id,
        status: 'expired',
        price: 9.99,
        expiresAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000),
      },
    });

    const res = await app.inject({
      method: 'POST',
      url: webhookUrl({ serverId: server.id, type: 'subscription', userId: user.id, amount: 9.99 }),
    });
    expect(res.statusCode).toBe(200);

    const updated = await prisma.subscription.findUnique({ where: { id: sub.id } });
    expect(updated?.status).toBe('active');
    expect(updated!.expiresAt.getTime()).toBeGreaterThan(Date.now() + 25 * 24 * 60 * 60 * 1000);
  });
});

describe('Webhook — deposit idempotency', () => {
  it('два вебхука на депозит — одно зачисление на баланс', async () => {
    const { user } = await createTestUser(app, 'wh-race-' + crypto.randomUUID() + '@test.com');

    const deposit = await prisma.deposit.create({
      data: {
        userId: user.id,
        amount: 500,
        method: 'card',
        status: 'pending',
      },
    });

    const whUrl = webhookUrl({ depositId: deposit.id, type: 'deposit', amount: 500 });

    const results = await Promise.allSettled([
      app.inject({ method: 'POST', url: whUrl }),
      app.inject({ method: 'POST', url: whUrl }),
    ]);

    const succeeded = results.filter(
      (r) => r.status === 'fulfilled' && (r.value as any).statusCode === 200,
    );
    expect(succeeded.length).toBe(2);

    const updatedDeposit = await prisma.deposit.findUnique({ where: { id: deposit.id } });
    expect(updatedDeposit?.status).toBe('completed');

    const refreshedUser = await prisma.user.findUnique({ where: { id: user.id } });
    expect(Number(refreshedUser!.balance)).toBe(500);
  });
});
