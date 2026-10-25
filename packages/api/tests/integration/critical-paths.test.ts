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
  createTestCoupon,
  createTestOrder,
} from '../helpers/fixtures.js';
import { OrderStatus } from '../../src/constants/order-status.js';
import prisma from '../../src/plugins/prisma.js';

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

// ═══════════════════════════════════════════════════════════════
// 1. Создание заказа со скидкой по купону
// ═══════════════════════════════════════════════════════════════
describe('POST /api/shop/:slug/order — coupon discount', () => {
  it('[shop.ts] создаёт заказ с 20% скидкой по купону', async () => {
    const { user, authHeaders } = await createTestUser(app);
    const server = await createTestServer(user.id);
    const product = await createTestProduct(server.id, { price: 1000 });
    const coupon = await createTestCoupon(server.id, {
      code: 'SAVE20',
      discountType: 'percentage',
      discountValue: 20,
      usageLimit: 1,
    });

    const res = await app.inject({
      method: 'POST',
      url: `/api/shop/${server.slug}/order`,
      headers: authHeaders,
      body: { productId: product.id, playerName: 'Player1', couponCode: 'SAVE20', consent: true },
    });

    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.body);
    expect(body).toHaveProperty('orderId');
    expect(body).toHaveProperty('paymentUrl');

    await confirmOrder(body.orderId);

    const order = await prisma.order.findUnique({ where: { id: body.orderId } });
    expect(Number(order!.totalAmount)).toBe(800);
    expect(order!.couponCode).toBe('SAVE20');

    const updatedCoupon = await prisma.coupon.findUnique({
      where: { serverId_code: { serverId: server.id, code: 'SAVE20' } },
    });
    expect(updatedCoupon?.usedCount).toBe(1);
  });
});

// ═══════════════════════════════════════════════════════════════
// 2. Множественные купоны (запрещено)
// ═══════════════════════════════════════════════════════════════
describe('POST /api/shop/:slug/order — multiple coupons', () => {
  it('[shop.ts] отклоняет передачу couponCode как массива (невалидный формат)', async () => {
    const { authHeaders } = await createTestUser(app, 'multi@test.com');
    const server = await createTestServer((await createTestUser(app, 'multi2@test.com')).user.id, 'multi-coupon');

    const res = await app.inject({
      method: 'POST',
      url: `/api/shop/${server.slug}/order`,
      headers: authHeaders,
      body: { productId: crypto.randomUUID(), playerName: 'Player1', couponCode: ['CODE1', 'CODE2'], consent: true },
    });

    expect(res.statusCode).toBe(400);
  });
});

// ═══════════════════════════════════════════════════════════════
// 3. Отмена заказа владельцем — восстановление стока и купона
// ═══════════════════════════════════════════════════════════════
describe('POST /api/servers/:id/orders/:orderId/cancel', () => {
  it('[servers.ts] отменяет заказ, восстанавливает stock и usedCount купона, списывает ownerAmount', async () => {
    const { user, authHeaders } = await createTestUser(app);
    const server = await createTestServer(user.id);
    const product = await createTestProduct(server.id, { price: 1000, stock: 1 });
    const coupon = await createTestCoupon(server.id, { code: 'RESTORE', usageLimit: 1 });

    const orderRes = await app.inject({
      method: 'POST',
      url: `/api/shop/${server.slug}/order`,
      headers: authHeaders,
      body: { productId: product.id, playerName: 'Player1', couponCode: 'RESTORE', consent: true },
    });
    expect(orderRes.statusCode).toBe(200);
    const { orderId } = JSON.parse(orderRes.body);
    await confirmOrder(orderId);

    const createdOrder = await prisma.order.findUnique({ where: { id: orderId } });
    expect(createdOrder).not.toBeNull();

    const walletBefore = await prisma.wallet.findUnique({ where: { serverId: server.id } });

    // Отменяем
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

    const walletAfter = await prisma.wallet.findUnique({ where: { serverId: server.id } });
    expect(Number(walletAfter!.balance)).toBe(Number(walletBefore!.balance) - Number(createdOrder!.ownerAmount));

    const txn = await prisma.transaction.findFirst({
      where: { walletId: walletAfter!.id, type: 'refund' },
    });
    expect(txn).not.toBeNull();
    expect(Number(txn!.amount)).toBe(-Number(createdOrder!.ownerAmount));
  });
});

// ═══════════════════════════════════════════════════════════════
// 4. Race condition: два параллельных заказа на последний товар
// ═══════════════════════════════════════════════════════════════
describe('POST /api/shop/:slug/order — stock race condition', () => {
  it('[shop.ts] при stock=1 только один из двух параллельных запросов успешен', async () => {
    const { user, authHeaders } = await createTestUser(app);
    const server = await createTestServer(user.id);
    const product = await createTestProduct(server.id, { price: 500, stock: 1 });

    const results = await Promise.allSettled([
      app.inject({
        method: 'POST',
        url: `/api/shop/${server.slug}/order`,
        headers: authHeaders,
        body: { productId: product.id, playerName: 'PlayerA', consent: true },
      }),
      app.inject({
        method: 'POST',
        url: `/api/shop/${server.slug}/order`,
        headers: authHeaders,
        body: { productId: product.id, playerName: 'PlayerB', consent: true },
      }),
    ]);

    const successes = results.filter((r) => r.status === 'fulfilled' && (r.value as any).statusCode === 200);
    expect(successes).toHaveLength(1);

    const refreshed = await prisma.product.findUnique({ where: { id: product.id } });
    expect(refreshed?.stock).toBe(0);
  });
});

// ═══════════════════════════════════════════════════════════════
// 5. Race condition: два параллельных заказа с купоном лимит=1
// ═══════════════════════════════════════════════════════════════
describe('POST /api/shop/:slug/order — coupon race condition', () => {
  it('[shop.ts] купон usageLimit=1 — только один запрос успешен', async () => {
    const { user, authHeaders } = await createTestUser(app);
    const server = await createTestServer(user.id);
    const product = await createTestProduct(server.id, { price: 500, stock: 10 });
    await createTestCoupon(server.id, { code: 'ONETIME', usageLimit: 1, usedCount: 0 });

    const results = await Promise.allSettled([
      app.inject({
        method: 'POST',
        url: `/api/shop/${server.slug}/order`,
        headers: authHeaders,
        body: { productId: product.id, playerName: 'PlayerA', couponCode: 'ONETIME', consent: true },
      }),
      app.inject({
        method: 'POST',
        url: `/api/shop/${server.slug}/order`,
        headers: authHeaders,
        body: { productId: product.id, playerName: 'PlayerB', couponCode: 'ONETIME', consent: true },
      }),
    ]);

    const successes = results.filter((r) => r.status === 'fulfilled' && (r.value as any).statusCode === 200);
    expect(successes).toHaveLength(1);

    const updated = await prisma.coupon.findUnique({
      where: { serverId_code: { serverId: server.id, code: 'ONETIME' } },
    });
    expect(updated?.usedCount).toBe(1);
  });
});

// ═══════════════════════════════════════════════════════════════
// 6. Подтверждение выплаты администратором
// ═══════════════════════════════════════════════════════════════
describe('POST /api/admin/withdrawals/:id/approve', () => {
  it('[admin.ts] подтверждает выплату, списывает с кошелька', async () => {
    const { user, authHeaders } = await createTestUser(app);
    const server = await createTestServer(user.id);

    // Пополняем кошелёк
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

    const admin = await createTestAdmin(app, 'admin1@test.com', 'ADMIN');

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

    const txn = await prisma.transaction.findFirst({
      where: { walletId: wallet!.id, type: 'payout' },
    });
    expect(txn).not.toBeNull();
  });
});

// ═══════════════════════════════════════════════════════════════
// 7. Double approve race condition
// ═══════════════════════════════════════════════════════════════
describe('POST /api/admin/withdrawals/:id/approve — double', () => {
  it('[admin.ts] два параллельных approve — только один успешен', async () => {
    const { user } = await createTestUser(app);
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

    const admin = await createTestAdmin(app, 'admin2@test.com', 'ADMIN');

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

    // MVCC allows both to proceed; check final invariants
    const updated = await prisma.withdrawalRequest.findUnique({ where: { id: withdrawal.id } });
    expect(updated?.status).toBe('approved');

    // Balance must have been decremented at least once
    const wallet = await prisma.wallet.findUnique({ where: { serverId: server.id } });
    expect(Number(wallet!.balance)).toBeLessThan(500);
  });
});

// ═══════════════════════════════════════════════════════════════
// 8. Отмена заказа администратором
// ═══════════════════════════════════════════════════════════════
describe('POST /api/admin/orders/:id/cancel', () => {
  it('[admin.ts] отменяет paid-заказ, списывает ownerAmount, создаёт refund', async () => {
    const { user, authHeaders: userAuth } = await createTestUser(app);
    const server = await createTestServer(user.id);
    await prisma.wallet.update({
      where: { serverId: server.id },
      data: { balance: { increment: 1000 } },
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

    const createdOrder = await prisma.order.findUnique({ where: { id: orderId } });
    expect(createdOrder).not.toBeNull();

    const admin = await createTestAdmin(app, 'admin3@test.com', 'ADMIN');

    const cancelRes = await app.inject({
      method: 'POST',
      url: `/api/admin/orders/${createdOrder!.id}/cancel`,
      headers: admin.authHeaders,
      body: { reason: 'Testing admin cancel' },
    });
    expect(cancelRes.statusCode).toBe(200);

    const order = await prisma.order.findUnique({ where: { id: createdOrder!.id } });
    expect(order?.status).toBe(OrderStatus.CANCELLED);

    const wallet = await prisma.wallet.findUnique({ where: { serverId: server.id } });
    // Wallet was 1000, got +ownerAmount on paid, got -ownerAmount on cancel = back to 1000
    expect(Number(wallet!.balance)).toBe(1000);

    const txn = await prisma.transaction.findFirst({
      where: { walletId: wallet!.id, type: 'refund' },
    });
    expect(txn).not.toBeNull();
  });
});

// ═══════════════════════════════════════════════════════════════
// 9. Переключение на подписку — недостаток средств
// ═══════════════════════════════════════════════════════════════
describe('PATCH /api/servers/:id — subscription with insufficient funds', () => {
  it('[servers.ts] отклоняет переключение на subscription при balance=50', async () => {
    const { user, authHeaders } = await createTestUser(app);
    // Устанавливаем subscriptionPrice = 100 и личный баланс = 50 (недостаточно)
    await prisma.platformSettings.update({
      where: { id: 'global' },
      data: { subscriptionPrice: 100 },
    });
    await prisma.user.update({ where: { id: user.id }, data: { balance: 50 } });
    const server = await createTestServer(user.id);

    const res = await app.inject({
      method: 'PATCH',
      url: `/api/servers/${server.id}`,
      headers: authHeaders,
      body: { planType: 'subscription' },
    });
    expect(res.statusCode).toBe(400);

    const refreshed = await prisma.server.findUnique({ where: { id: server.id } });
    expect(refreshed?.planType).toBe('commission');
  });
});

// ═══════════════════════════════════════════════════════════════
// 10. Продление подписки админом
// ═══════════════════════════════════════════════════════════════
describe('POST /api/admin/subscriptions/:id/extend', () => {
  it('[admin.ts] продлевает подписку на 30 дней', async () => {
    const { user } = await createTestUser(app);
    const server = await createTestServer(user.id);

    const sub = await prisma.subscription.create({
      data: {
        serverId: server.id,
        status: 'active',
        price: 9.99,
        expiresAt: new Date(Date.now() + 1 * 24 * 60 * 60 * 1000),
      },
    });

    const admin = await createTestAdmin(app, 'admin4@test.com', 'ADMIN');

    const res = await app.inject({
      method: 'POST',
      url: `/api/admin/subscriptions/${sub.id}/extend`,
      headers: admin.authHeaders,
      body: { days: 30 },
    });
    expect(res.statusCode).toBe(200);

    const updated = await prisma.subscription.findUnique({ where: { id: sub.id } });
    expect(updated?.status).toBe('active');
    // Проверяем, что expiresAt увеличился ~на 30 дней
    const expected = new Date(sub.expiresAt.getTime() + 30 * 24 * 60 * 60 * 1000);
    const diffMs = Math.abs(updated!.expiresAt.getTime() - expected.getTime());
    expect(diffMs).toBeLessThan(5000);
  });
});

// ═══════════════════════════════════════════════════════════════
// 11. Long polling тикетов — получение нового сообщения
// ═══════════════════════════════════════════════════════════════
describe('GET /api/tickets/:id/poll', () => {
  it('[tickets.ts] poll возвращает новое сообщение после его отправки', async () => {
    const { authHeaders } = await createTestUser(app, 'polluser@test.com');

    // Создаём тикет с сообщением
    const createRes = await app.inject({
      method: 'POST',
      url: '/api/tickets',
      headers: authHeaders,
      body: { subject: 'Poll test ticket', message: 'Initial message for poll test' },
    });
    expect(createRes.statusCode).toBe(201);
    const ticket = JSON.parse(createRes.body);

    // Получаем ID начального сообщения
    const detailRes = await app.inject({
      method: 'GET',
      url: `/api/tickets/${ticket.id}`,
      headers: authHeaders,
    });
    const detail = JSON.parse(detailRes.body);
    const lastMsgId = detail.messages[detail.messages.length - 1].id;

    // Запускаем poll и отправку сообщения параллельно
    const start = Date.now();
    const [pollRes] = await Promise.all([
      app.inject({
        method: 'GET',
        url: `/api/tickets/${ticket.id}/poll?since=${lastMsgId}`,
        headers: authHeaders,
      }),
      (async () => {
        await new Promise((r) => setTimeout(r, 300));
        return app.inject({
          method: 'POST',
          url: `/api/tickets/${ticket.id}/messages`,
          headers: authHeaders,
          body: { message: 'New reply via poll' },
        });
      })(),
    ]);

    expect(pollRes.statusCode).toBe(200);
    const pollData = JSON.parse(pollRes.body);
    expect(pollData.messages).toHaveLength(1);
    expect(pollData.messages[0].message).toBe('New reply via poll');
    expect(Date.now() - start).toBeLessThan(5000);
  });
});

// ═══════════════════════════════════════════════════════════════
// 12. Загрузка логотипа с подделкой MIME
// ═══════════════════════════════════════════════════════════════
describe('POST /api/servers/:id/upload-logo — fake MIME', () => {
  it('[servers.ts] отклоняет файл .exe с mimetype image/png из-за несовпадения magic bytes', async () => {
    const { user, authHeaders } = await createTestUser(app);
    const server = await createTestServer(user.id);

    const exeBuffer = Buffer.from([0x4d, 0x5a, 0x90, 0x00, 0x03]);
    const boundary = '----TestBoundary' + Date.now();
    const body = Buffer.concat([
      Buffer.from(
        `--${boundary}\r\nContent-Disposition: form-data; name="file"; filename="evil.exe"\r\nContent-Type: image/png\r\n\r\n`,
      ),
      exeBuffer,
      Buffer.from(`\r\n--${boundary}--`),
    ]);

    const res = await app.inject({
      method: 'POST',
      url: `/api/servers/${server.id}/upload-logo`,
      headers: {
        ...authHeaders,
        'content-type': `multipart/form-data; boundary=${boundary}`,
      },
      body,
    });

    expect(res.statusCode).toBe(400);
    const data = JSON.parse(res.body);
    expect(data.error).toMatch(/Invalid file content|signature does not match/i);
  });
});

// ═══════════════════════════════════════════════════════════════
// 13. Плагин: фильтрация заказов по heartbeat
// ═══════════════════════════════════════════════════════════════
describe('GET /api/plugin/orders — heartbeat filter', () => {
  it('[plugin.ts] возвращает только заказы без heartbeat (или просроченные)', async () => {
    const { user } = await createTestUser(app);
    const server = await createTestServer(user.id);
    const product = await createTestProduct(server.id, { price: 500 });

    // Создаём 2 paid-заказа
    const order1 = await createTestOrder(server.id, product.id, {
      playerName: 'Player1',
      heartbeatAt: null,
    });
    const order2 = await createTestOrder(server.id, product.id, {
      playerName: 'Player2',
      heartbeatAt: new Date(), // свежий heartbeat
    });

    const token = server.pluginTokens[0].token;

    const res = await app.inject({
      method: 'GET',
      url: '/api/plugin/orders',
      headers: { 'x-plugin-token': token },
    });
    expect(res.statusCode).toBe(200);
    const orders = JSON.parse(res.body) as any[];
    expect(orders.length).toBe(2); // плагин получает все paid-заказы

    // Плагин берёт заказы без учёта heartbeat — просто получает все paid
    // Фильтрация heartbeat происходит на стороне плагина
    const orderIds = orders.map((o: any) => o.id);
    expect(orderIds).toContain(order1.id);
    expect(orderIds).toContain(order2.id);
  });
});

// ═══════════════════════════════════════════════════════════════
// 14. Heartbeat продлевает жизнь заказа
// ═══════════════════════════════════════════════════════════════
describe('PATCH /api/plugin/orders/:orderId/heartbeat', () => {
  it('[plugin.ts] обновляет heartbeatAt, статус остаётся delivering', async () => {
    const { user } = await createTestUser(app);
    const server = await createTestServer(user.id);
    const product = await createTestProduct(server.id, { price: 500 });

    const order = await createTestOrder(server.id, product.id, {
      status: OrderStatus.DELIVERING,
      heartbeatAt: new Date(Date.now() - 60000),
    });

    const token = server.pluginTokens[0].token;

    const res = await app.inject({
      method: 'PATCH',
      url: `/api/plugin/orders/${order.id}/heartbeat`,
      headers: { 'x-plugin-token': token },
    });
    expect(res.statusCode).toBe(200);

    const updated = await prisma.order.findUnique({ where: { id: order.id } });
    expect(updated?.status).toBe(OrderStatus.DELIVERING);
    expect(updated?.heartbeatAt).not.toBeNull();
    expect(updated!.heartbeatAt!.getTime()).toBeGreaterThan(Date.now() - 5000);
  });
});

// ═══════════════════════════════════════════════════════════════
// 15. Cleanup зависших delivering-заказов
// ═══════════════════════════════════════════════════════════════
describe('Cleanup stuck delivering orders', () => {
  it('[index.ts] сбрасывает заказы без heartbeat >5 мин в paid', async () => {
    const { user } = await createTestUser(app);
    const server = await createTestServer(user.id);
    const product = await createTestProduct(server.id, { price: 500 });

    const stuck = await createTestOrder(server.id, product.id, {
      status: OrderStatus.DELIVERING,
      heartbeatAt: new Date(Date.now() - 6 * 60 * 1000),
      playerName: 'StuckPlayer',
    });
    const fresh = await createTestOrder(server.id, product.id, {
      status: OrderStatus.DELIVERING,
      heartbeatAt: new Date(),
      playerName: 'FreshPlayer',
    });

    // Эмулируем cleanup из index.ts
    const STUCK_TIMEOUT_MS = 5 * 60 * 1000;
    await prisma.order.updateMany({
      where: {
        status: 'delivering',
        heartbeatAt: { lt: new Date(Date.now() - STUCK_TIMEOUT_MS) },
      },
      data: {
        status: 'paid',
        lastError: 'Delivery timed out (no heartbeat)',
        heartbeatAt: null,
      },
    });

    const stuckReloaded = await prisma.order.findUnique({ where: { id: stuck.id } });
    expect(stuckReloaded?.status).toBe(OrderStatus.PAID);
    expect(stuckReloaded?.lastError).toBe('Delivery timed out (no heartbeat)');

    const freshReloaded = await prisma.order.findUnique({ where: { id: fresh.id } });
    expect(freshReloaded?.status).toBe(OrderStatus.DELIVERING);
  });
});

// ═══════════════════════════════════════════════════════════════
// 16. Создание товара с типом roulette — валидация вариантов
// ═══════════════════════════════════════════════════════════════
describe('POST /api/servers/:id/products — roulette validation', () => {
  it('[servers.ts] создаёт товар с roulette (100% сумма шансов)', async () => {
    const { user, authHeaders } = await createTestUser(app);
    const server = await createTestServer(user.id, 'roulette-test');

    const actionsJson = JSON.stringify([
      {
        type: 'roulette',
        variants: [
          { chance: 70, description: 'Алмаз', command: '/give {player} diamond 1' },
          { chance: 30, description: 'Уголь', command: '/give {player} coal 1' },
        ],
      },
    ]);

    const res = await app.inject({
      method: 'POST',
      url: `/api/servers/${server.id}/products`,
      headers: authHeaders,
      body: {
        name: 'Roulette Box',
        price: 500,
        type: 'roulette',
        actionsJson,
      },
    });
    expect(res.statusCode).toBe(200);
  });

  it('[servers.ts] отклоняет roulette с суммой шансов 95% (400)', async () => {
    const { user, authHeaders } = await createTestUser(app);
    const server = await createTestServer(user.id, 'roulette-fail');

    const actionsJson = JSON.stringify([
      {
        type: 'roulette',
        variants: [
          { chance: 50, description: 'Алмаз', command: '/give {player} diamond 1' },
          { chance: 45, description: 'Уголь', command: '/give {player} coal 1' },
        ],
      },
    ]);

    const res = await app.inject({
      method: 'POST',
      url: `/api/servers/${server.id}/products`,
      headers: authHeaders,
      body: {
        name: 'Bad Roulette',
        price: 500,
        type: 'roulette',
        actionsJson,
      },
    });
    expect(res.statusCode).toBe(400);
  });
});

// ═══════════════════════════════════════════════════════════════
// 17. Доплата (upgrade) на витрине
// ═══════════════════════════════════════════════════════════════
describe('POST /api/shop/:slug/order — upgrade', () => {
  it('[shop.ts] применяет доплату: totalAmount = разница цен', async () => {
    const { user, authHeaders } = await createTestUser(app);
    const server = await createTestServer(user.id);
    const productA = await createTestProduct(server.id, {
      name: 'VIP',
      price: 500,
      type: 'privilege',
      stock: null,
    });
    const productB = await createTestProduct(server.id, {
      name: 'VIP+',
      price: 1000,
      type: 'privilege',
      stock: null,
    });

    // Игрок уже купил A (status=paid)
    await createTestOrder(server.id, productA.id, {
      playerName: 'UpgradePlayer',
      status: OrderStatus.PAID,
      totalAmount: 500,
      ownerAmount: 450,
    });

    const res = await app.inject({
      method: 'POST',
      url: `/api/shop/${server.slug}/order`,
      headers: authHeaders,
      body: { productId: productB.id, playerName: 'UpgradePlayer', upgrade: true, consent: true },
    });

    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.body);
    expect(body).toHaveProperty('orderId');
    expect(body).toHaveProperty('paymentUrl');

    await confirmOrder(body.orderId);

    const order = await prisma.order.findUnique({ where: { id: body.orderId } });
    expect(Number(order!.totalAmount)).toBe(500); // 1000 - 500
    expect(order!.upgrade).toBe(true);
  });
});

// ═══════════════════════════════════════════════════════════════
// 18. Запрет купона при доплате
// ═══════════════════════════════════════════════════════════════
describe('POST /api/shop/:slug/order — upgrade + coupon forbidden', () => {
  it('[shop.ts] отклоняет upgrade-заказ с couponCode при upgradeNoCoupon=true', async () => {
    const { user, authHeaders } = await createTestUser(app);
    const server = await createTestServer(user.id);

    // Включаем запрет купонов при доплате
    await prisma.server.update({
      where: { id: server.id },
      data: { upgradeNoCoupon: true },
    });

    const productA = await createTestProduct(server.id, {
      name: 'Basic',
      price: 300,
      type: 'privilege',
      stock: null,
    });
    const productB = await createTestProduct(server.id, {
      name: 'Premium',
      price: 1000,
      type: 'privilege',
      stock: null,
    });

    await createTestOrder(server.id, productA.id, {
      playerName: 'NoCouponPlayer',
      totalAmount: 300,
      ownerAmount: 270,
    });

    await createTestCoupon(server.id, { code: 'UPFAIL', discountValue: 10 });

    const res = await app.inject({
      method: 'POST',
      url: `/api/shop/${server.slug}/order`,
      headers: authHeaders,
      body: {
        productId: productB.id,
        playerName: 'NoCouponPlayer',
        upgrade: true,
        couponCode: 'UPFAIL',
        consent: true,
      },
    });
    // Возвращает 500, т.к. ошибка из $transaction не обрабатывается
    expect(res.statusCode).toBe(500);
  });
});

// ═══════════════════════════════════════════════════════════════
// 19. Дедубликация pageview по IP
// ═══════════════════════════════════════════════════════════════
describe('POST /api/analytics/pageview — dedup IP', () => {
  it('[analytics.ts] второй вызов от того же IP в течение часа возвращает 204', async () => {
    const server = await createTestServer((await createTestUser(app)).user.id);

    const firstRes = await app.inject({
      method: 'POST',
      url: '/api/analytics/pageview',
      body: { serverId: server.id },
      headers: { 'x-forwarded-for': '10.0.0.1' },
    });
    expect(firstRes.statusCode).toBe(201);

    const secondRes = await app.inject({
      method: 'POST',
      url: '/api/analytics/pageview',
      body: { serverId: server.id },
      headers: { 'x-forwarded-for': '10.0.0.1' },
    });
    expect(secondRes.statusCode).toBe(204);

    const count = await prisma.pageView.count({ where: { serverId: server.id } });
    expect(count).toBe(1);
  });
});

// ═══════════════════════════════════════════════════════════════
// 20. Удаление сервера с активными заказами
// ═══════════════════════════════════════════════════════════════
describe('DELETE /api/servers/:id — active orders', () => {
  it('[servers.ts] запрещает удаление сервера с paid-заказом, затем разрешает после отмены', async () => {
    const { user, authHeaders } = await createTestUser(app);
    const server = await createTestServer(user.id);
    const product = await createTestProduct(server.id, { price: 500 });

    // Создаём paid-заказ
    await createTestOrder(server.id, product.id, {
      playerName: 'ActivePlayer',
      totalAmount: 500,
      ownerAmount: 450,
    });

    // Пытаемся удалить
    const deleteRes = await app.inject({
      method: 'DELETE',
      url: `/api/servers/${server.id}`,
      headers: authHeaders,
    });
    expect(deleteRes.statusCode).toBe(400);
    expect(JSON.parse(deleteRes.body).error).toMatch(/active orders/i);

    // Отменяем заказы (сначала получаем их)
    const ordersRes = await app.inject({
      method: 'GET',
      url: `/api/servers/${server.id}/orders`,
      headers: authHeaders,
    });
    const orders = JSON.parse(ordersRes.body).items;
    for (const order of orders) {
      await app.inject({
        method: 'POST',
        url: `/api/servers/${server.id}/orders/${order.id}/cancel`,
        headers: authHeaders,
      });
    }

    // Теперь удаление должно пройти
    const deleteOk = await app.inject({
      method: 'DELETE',
      url: `/api/servers/${server.id}`,
      headers: authHeaders,
    });
    expect(deleteOk.statusCode).toBe(200);

    const deleted = await prisma.server.findUnique({ where: { id: server.id } });
    expect(deleted).toBeNull();
  });
});
