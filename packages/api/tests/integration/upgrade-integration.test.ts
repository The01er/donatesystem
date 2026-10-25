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
  createTestCoupon,
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

describe('Upgrade — доплата с купоном при upgradeNoCoupon=false', () => {
  it('при upgradeNoCoupon=false купон разрешён и применяется к доплате', async () => {
    const { user, authHeaders } = await createTestUser(app, 'upgrade-' + crypto.randomUUID() + '@test.com');
    const server = await createTestServer(user.id);

    await prisma.server.update({
      where: { id: server.id },
      data: { upgradeNoCoupon: false },
    });

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

    await createTestOrder(server.id, productA.id, {
      playerName: 'UpgradeWithCoupon',
      status: OrderStatus.PAID,
      totalAmount: 500,
      ownerAmount: 450,
    });

    await createTestCoupon(server.id, { code: 'UPGRADE10', discountValue: 10, discountType: 'percentage' });

    const res = await app.inject({
      method: 'POST',
      url: `/api/shop/${server.slug}/order`,
      headers: authHeaders,
      body: {
        productId: productB.id,
        playerName: 'UpgradeWithCoupon',
        upgrade: true,
        couponCode: 'UPGRADE10',
        consent: true,
      },
    });

    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.body) as { orderId: string };
    expect(body).toHaveProperty('orderId');

    await confirmOrder(body.orderId);

    const order = await prisma.order.findUnique({ where: { id: body.orderId } });
    expect(order!.upgrade).toBe(true);

    const upgradeDiff = 1000 - 500;
    const expectedWithDiscount = +(upgradeDiff * 0.9).toFixed(2);
    expect(Number(order!.totalAmount)).toBe(expectedWithDiscount);
    expect(order!.couponCode).toBe('UPGRADE10');
  });
});

describe('Upgrade — запрет купона при upgradeNoCoupon=true', () => {
  it('при upgradeNoCoupon=true + couponCode → 500', async () => {
    const { user, authHeaders } = await createTestUser(app, 'upgrade-' + crypto.randomUUID() + '@test.com');
    const server = await createTestServer(user.id);

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
      status: OrderStatus.PAID,
      totalAmount: 300,
      ownerAmount: 270,
    });

    await createTestCoupon(server.id, { code: 'BLOCKED', discountValue: 10 });

    const res = await app.inject({
      method: 'POST',
      url: `/api/shop/${server.slug}/order`,
      headers: authHeaders,
      body: {
        productId: productB.id,
        playerName: 'NoCouponPlayer',
        upgrade: true,
        couponCode: 'BLOCKED',
        consent: true,
      },
    });

    expect(res.statusCode).toBe(500);
  });
});

describe('Upgrade — конфликт с PENDING-заказом', () => {
  it('не даёт создать upgrade-заказ, если есть PENDING upgrade', async () => {
    const { user, authHeaders } = await createTestUser(app, 'upgrade-' + crypto.randomUUID() + '@test.com');
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

    await createTestOrder(server.id, productA.id, {
      playerName: 'ConflictPlayer',
      status: OrderStatus.PAID,
      totalAmount: 500,
      ownerAmount: 450,
    });

    const firstRes = await app.inject({
      method: 'POST',
      url: `/api/shop/${server.slug}/order`,
      headers: authHeaders,
      body: { productId: productB.id, playerName: 'ConflictPlayer', upgrade: true, consent: true },
    });
    expect(firstRes.statusCode).toBe(200);

    const secondRes = await app.inject({
      method: 'POST',
      url: `/api/shop/${server.slug}/order`,
      headers: authHeaders,
      body: { productId: productB.id, playerName: 'ConflictPlayer', upgrade: true, consent: true },
    });
    expect(secondRes.statusCode).toBe(409);
    const body = JSON.parse(secondRes.body) as { error: string };
    expect(body.error).toMatch(/ожидающий доставки заказ/i);
  });
});
