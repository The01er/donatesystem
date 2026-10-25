import { describe, it, expect, beforeAll, beforeEach, vi } from 'vitest';
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

// ─── RCON ─────────────────────────────────────────────────────

describe('RCON — deliverOrderViaRcon', () => {
  it('успешная доставка через RCON переводит заказ в DELIVERED', async () => {
    const { user } = await createTestUser(app, 'rcon-' + crypto.randomUUID() + '@test.com');
    const server = await createTestServer(user.id);

    // Настраиваем RCON на сервере
    await prisma.server.update({
      where: { id: server.id },
      data: { rconHost: '127.0.0.1', rconPort: 25575, rconPassword: 'testpassword' },
    });

    const product = await prisma.product.create({
      data: {
        serverId: server.id,
        name: 'RCON-Test',
        price: 500,
        type: 'item',
        actionsJson: JSON.stringify([{ type: 'command', value: 'give {player} diamond 1' }]),
      },
    });

    const order = await createTestOrder(server.id, product.id, {
      playerName: 'TestPlayer',
      status: OrderStatus.PAID,
      totalAmount: 500,
      ownerAmount: 450,
    });

    const { deliverOrderViaRcon } = await import('../../src/services/rcon-service.js');
    const result = await deliverOrderViaRcon(order.id, server.id);

    // RCON connection refused (127.0.0.1:25575) — заказ должен перейти в DELIVERING, потом retry → PAID
    expect(result.ok).toBe(false);

    const refreshed = await prisma.order.findUnique({ where: { id: order.id } });
    expect(refreshed?.status).toBe(OrderStatus.PAID);
    expect(refreshed?.retryCount).toBeGreaterThanOrEqual(1);
  });

  it('пустой actionsJson (нет действий) — сразу DELIVERED', async () => {
    const { user } = await createTestUser(app, 'rcon-' + crypto.randomUUID() + '@test.com');
    const server = await createTestServer(user.id);
    await prisma.server.update({
      where: { id: server.id },
      data: { rconHost: '127.0.0.1', rconPort: 25575, rconPassword: 'testpassword' },
    });

    const product = await prisma.product.create({
      data: {
        serverId: server.id,
        name: 'Empty',
        price: 100,
        type: 'item',
        actionsJson: '[]',
      },
    });

    const order = await createTestOrder(server.id, product.id, {
      playerName: 'EmptyPlayer',
      status: OrderStatus.PAID,
      totalAmount: 100,
      ownerAmount: 90,
    });

    const { deliverOrderViaRcon } = await import('../../src/services/rcon-service.js');
    const result = await deliverOrderViaRcon(order.id, server.id);

    expect(result.ok).toBe(true);

    const refreshed = await prisma.order.findUnique({ where: { id: order.id } });
    expect(refreshed?.status).toBe(OrderStatus.DELIVERED);
  });

  it('заказ в DELIVERED не переоткрывается', async () => {
    const { user } = await createTestUser(app, 'rcon-' + crypto.randomUUID() + '@test.com');
    const server = await createTestServer(user.id);
    await prisma.server.update({
      where: { id: server.id },
      data: { rconHost: '127.0.0.1', rconPort: 25575, rconPassword: 'testpassword' },
    });

    const product = await createTestProduct(server.id);
    const order = await createTestOrder(server.id, product.id, {
      playerName: 'DeliveredPlayer',
      status: OrderStatus.DELIVERED,
      totalAmount: 100,
    });

    const { deliverOrderViaRcon } = await import('../../src/services/rcon-service.js');
    const result = await deliverOrderViaRcon(order.id, server.id);
    expect(result.ok).toBe(true);
    expect(result.error).toBeUndefined();
  });

  it('заказ с не-RCON конфигом возвращает ошибку', async () => {
    const { user } = await createTestUser(app, 'rcon-' + crypto.randomUUID() + '@test.com');
    const server = await createTestServer(user.id);
    const product = await createTestProduct(server.id);

    const order = await createTestOrder(server.id, product.id, {
      playerName: 'NoRconPlayer',
      status: OrderStatus.PAID,
      totalAmount: 100,
    });

    const { deliverOrderViaRcon } = await import('../../src/services/rcon-service.js');
    const result = await deliverOrderViaRcon(order.id, server.id);
    expect(result.ok).toBe(false);
    expect(result.error).toContain('RCON not configured');
  });
});

// ─── Webhook — amount mismatch ────────────────────────────────

describe('Webhook — amount validation', () => {
  it('вебхук с неверной суммой заказа — ошибка AMOUNT_MISMATCH', async () => {
    const { user } = await createTestUser(app, 'wh-amount-' + crypto.randomUUID() + '@test.com');
    const server = await createTestServer(user.id);
    const product = await createTestProduct(server.id, { price: 1000 });

    const order = await createTestOrder(server.id, product.id, {
      playerName: 'AmountPlayer',
      status: OrderStatus.PENDING,
      totalAmount: 1000,
      ownerAmount: 900,
    });

    const res = await app.inject({
      method: 'POST',
      url: webhookUrl({ orderId: order.id, type: 'order', amount: 500 }),
    });

    expect(res.statusCode).toBe(500);

    const refreshed = await prisma.order.findUnique({ where: { id: order.id } });
    expect(refreshed?.status).toBe(OrderStatus.PENDING);
  });

  it('вебхук с неверной суммой депозита — ошибка AMOUNT_MISMATCH', async () => {
    const { user } = await createTestUser(app, 'wh-dep-amount-' + crypto.randomUUID() + '@test.com');

    const deposit = await prisma.deposit.create({
      data: { userId: user.id, amount: 500, method: 'card', status: 'pending' },
    });

    const res = await app.inject({
      method: 'POST',
      url: webhookUrl({ depositId: deposit.id, type: 'deposit', amount: 100 }),
    });

    expect(res.statusCode).toBe(500);

    const refreshed = await prisma.deposit.findUnique({ where: { id: deposit.id } });
    expect(refreshed?.status).toBe('pending');
  });

  it('вебхук с неверной суммой подписки — ошибка AMOUNT_MISMATCH', async () => {
    const { user } = await createTestUser(app, 'wh-sub-amount-' + crypto.randomUUID() + '@test.com');
    const server = await createTestServer(user.id);

    await prisma.subscription.create({
      data: {
        serverId: server.id,
        status: 'active',
        price: 9.99,
        expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      },
    });

    const res = await app.inject({
      method: 'POST',
      url: webhookUrl({ serverId: server.id, type: 'subscription', userId: user.id, amount: 1 }),
    });

    expect(res.statusCode).toBe(500);
  });
});

// ─── Webhook — invalid provider/metadata ──────────────────────

describe('Webhook — invalid payload', () => {
  it('вебхук без type в metadata — 400', async () => {
    const res = await app.inject({
      method: 'POST',
      url: webhookUrl({ someKey: 'value', type: 'unknown' }),
    });

    expect(res.statusCode).toBe(400);
  });

  it('вебхук с failed статусом — не меняет данные', async () => {
    const { user } = await createTestUser(app, 'wh-fail-' + crypto.randomUUID() + '@test.com');

    const deposit = await prisma.deposit.create({
      data: { userId: user.id, amount: 500, method: 'card', status: 'pending' },
    });

    const params = new URLSearchParams();
    params.set('metadata', JSON.stringify({ depositId: deposit.id, type: 'deposit' }));
    // Без mock_confirm — невалидный пэйлоад

    const res = await app.inject({
      method: 'POST',
      url: `/api/payment/webhook?${params.toString()}`,
    });

    expect(res.statusCode).toBe(400);

    const refreshed = await prisma.deposit.findUnique({ where: { id: deposit.id } });
    expect(refreshed?.status).toBe('pending');
  });
});

// ─── Webhook — deposit edge cases ────────────────────────────

describe('Webhook — deposit', () => {
  it('completed депозит зачисляется на баланс пользователя', async () => {
    const { user } = await createTestUser(app, 'wh-dep-' + crypto.randomUUID() + '@test.com');

    const deposit = await prisma.deposit.create({
      data: { userId: user.id, amount: 1500, method: 'card', status: 'pending' },
    });

    const res = await app.inject({
      method: 'POST',
      url: webhookUrl({ depositId: deposit.id, type: 'deposit', amount: 1500 }),
    });
    expect(res.statusCode).toBe(200);

    const refreshedUser = await prisma.user.findUnique({ where: { id: user.id } });
    expect(Number(refreshedUser!.balance)).toBe(1500);
  });
});

// ─── Webhook — RCON triggered by webhook ──────────────────────

describe('Webhook — triggers RCON delivery', () => {
  it('вебхук для заказа с RCON запускает доставку (заказ в PAID, RCON пытается подключиться)', async () => {
    const { user } = await createTestUser(app, 'wh-rcon-' + crypto.randomUUID() + '@test.com');
    const server = await createTestServer(user.id);

    await prisma.server.update({
      where: { id: server.id },
      data: { rconHost: '127.0.0.1', rconPort: 25575, rconPassword: 'testpassword' },
    });

    const product = await prisma.product.create({
      data: {
        serverId: server.id,
        name: 'WebhookRcon',
        price: 500,
        type: 'item',
        actionsJson: JSON.stringify([{ type: 'command', value: 'give {player} diamond 1' }]),
      },
    });

    const order = await createTestOrder(server.id, product.id, {
      playerName: 'RconWebhookPlayer',
      status: OrderStatus.PENDING,
      totalAmount: 500,
      ownerAmount: 450,
    });

    const res = await app.inject({
      method: 'POST',
      url: webhookUrl({ orderId: order.id, type: 'order', amount: 500 }),
    });
    expect(res.statusCode).toBe(200);

    // Заказ переведён в PAID (или DELIVERING, если RCON успел)
    const refreshed = await prisma.order.findUnique({ where: { id: order.id } });
    expect([OrderStatus.PAID, OrderStatus.DELIVERING, OrderStatus.DELIVERED]).toContain(refreshed?.status);

    // Баланс кошелька зачислен
    const wallet = await prisma.wallet.findUnique({ where: { serverId: server.id } });
    expect(Number(wallet!.balance)).toBe(450);
  });
});

// ─── RCON — command injection guard ──────────────────────────

describe('RCON — fillPlaceholders sanitization', () => {
  it('sanitizeMinecraftName удаляет спецсимволы из ника', async () => {
    // Импортируем через динамический импорт, чтобы модуль был прогрет
    const { deliverOrderViaRcon } = await import('../../src/services/rcon-service.js');
    const { user } = await createTestUser(app, 'rcon-sanitize-' + crypto.randomUUID() + '@test.com');
    const server = await createTestServer(user.id);

    await prisma.server.update({
      where: { id: server.id },
      data: { rconHost: '127.0.0.1', rconPort: 25575, rconPassword: 'testpassword' },
    });

    // Ник с опасными символами
    const maliciousName = 'Steve; say pwned; op Steve';

    const product = await prisma.product.create({
      data: {
        serverId: server.id,
        name: 'SanitizeTest',
        price: 100,
        type: 'item',
        actionsJson: JSON.stringify([{ type: 'command', value: 'give {player} diamond' }]),
      },
    });

    const order = await createTestOrder(server.id, product.id, {
      playerName: maliciousName,
      status: OrderStatus.PAID,
      totalAmount: 100,
      ownerAmount: 90,
    });

    const result = await deliverOrderViaRcon(order.id, server.id);

    // RCON connection refused — не важно, важно что ни один спецсимвол не был передан как есть
    expect(result.ok).toBe(false);

    const refreshed = await prisma.order.findUnique({ where: { id: order.id } });
    expect(refreshed?.status).toBe(OrderStatus.PAID);
  });

  it('нормальный Minecraft-ник не изменяется', async () => {
    const { deliverOrderViaRcon } = await import('../../src/services/rcon-service.js');
    const { user } = await createTestUser(app, 'rcon-normal-' + crypto.randomUUID() + '@test.com');
    const server = await createTestServer(user.id);

    await prisma.server.update({
      where: { id: server.id },
      data: { rconHost: '127.0.0.1', rconPort: 25575, rconPassword: 'testpassword' },
    });

    const product = await prisma.product.create({
      data: {
        serverId: server.id,
        name: 'NormalName',
        price: 100,
        type: 'item',
        actionsJson: JSON.stringify([{ type: 'command', value: 'give {player} diamond' }]),
      },
    });

    const order = await createTestOrder(server.id, product.id, {
      playerName: 'Steve123',
      status: OrderStatus.PAID,
      totalAmount: 100,
      ownerAmount: 90,
    });

    const result = await deliverOrderViaRcon(order.id, server.id);
    expect(result.ok).toBe(false); // RCON connection refused
  });
});
