import { describe, it, expect, beforeEach } from 'vitest';
import bcrypt from 'bcryptjs';
import { clearDatabase, createTestServer, createTestProduct, createTestCoupon, createTestOrder } from '../helpers/fixtures.js';
import { cancelOrderTx } from '../../src/services/order-service.js';
import { OrderStatus } from '../../src/constants/order-status.js';
import prisma from '../../src/plugins/prisma.js';

describe('cancelOrderTx', () => {
  let userId: string;
  let serverId: string;
  let productId: string;

  beforeEach(async () => {
    await clearDatabase();
    await prisma.platformSettings.upsert({
      where: { id: 'global' },
      create: { id: 'global', operatingMode: 'individual' },
      update: { operatingMode: 'individual' },
    });

    const hash = await bcrypt.hash('password123', 10);
    const user = await prisma.user.create({
      data: { email: `cancel-${Math.random()}@test.com`, password: hash },
    });
    userId = user.id;

    const server = await createTestServer(userId);
    serverId = server.id;
    const product = await createTestProduct(serverId, { price: 1000, stock: 5 });
    productId = product.id;
  });

  it('returns not_found for non-existent order', async () => {
    const r = await prisma.$transaction(async (tx: any) =>
      cancelOrderTx(tx, { orderId: 'fake-id', allowedStatuses: [OrderStatus.PAID] }),
    );
    expect(r.kind).toBe('not_found');
  });

  it('returns not_found when serverId does not match', async () => {
    const order = await createTestOrder(serverId, productId, { status: OrderStatus.PAID });
    const r = await prisma.$transaction(async (tx: any) =>
      cancelOrderTx(tx, {
        orderId: order.id,
        serverId: 'other-server',
        allowedStatuses: [OrderStatus.PAID],
      }),
    );
    expect(r.kind).toBe('not_found');
  });

  it('returns invalid_status when order status not in allowedStatuses', async () => {
    const order = await createTestOrder(serverId, productId, { status: OrderStatus.PAID });
    const r = await prisma.$transaction(async (tx: any) =>
      cancelOrderTx(tx, {
        orderId: order.id,
        allowedStatuses: [OrderStatus.PENDING],
      }),
    );
    expect(r.kind).toBe('invalid_status');
    if (r.kind === 'invalid_status') {
      expect(r.status).toBe(OrderStatus.PAID);
    }
  });

  it('cancels order and restores stock', async () => {
    const order = await createTestOrder(serverId, productId, { status: OrderStatus.PAID, totalAmount: 1000, ownerAmount: 900 });
    const r = await prisma.$transaction(async (tx: any) =>
      cancelOrderTx(tx, { orderId: order.id, allowedStatuses: [OrderStatus.PAID] }),
    );
    expect(r.kind).toBe('ok');

    const updated = await prisma.order.findUnique({ where: { id: order.id } });
    expect(updated?.status).toBe(OrderStatus.CANCELLED);

    const product = await prisma.product.findUnique({ where: { id: productId } });
    expect(product?.stock).toBe(6);
  });

  it('returns invalid_status when trying to cancel already cancelled order', async () => {
    const order = await createTestOrder(serverId, productId, { status: OrderStatus.PAID, totalAmount: 1000, ownerAmount: 900 });

    const r1 = await prisma.$transaction(async (tx: any) =>
      cancelOrderTx(tx, { orderId: order.id, allowedStatuses: [OrderStatus.PAID] }),
    );
    expect(r1.kind).toBe('ok');

    const r2 = await prisma.$transaction(async (tx: any) =>
      cancelOrderTx(tx, { orderId: order.id, allowedStatuses: [OrderStatus.PAID] }),
    );
    expect(r2.kind).toBe('invalid_status');
  });

  it('decrements coupon usedCount when order has couponCode', async () => {
    await createTestCoupon(serverId, { code: 'CANCELTEST', discountValue: 10, usageLimit: 10, usedCount: 3 });
    const order = await createTestOrder(serverId, productId, {
      status: OrderStatus.PAID, totalAmount: 900, ownerAmount: 810, couponCode: 'CANCELTEST',
    });

    await prisma.$transaction(async (tx: any) =>
      cancelOrderTx(tx, { orderId: order.id, allowedStatuses: [OrderStatus.PAID] }),
    );

    const coupon = await prisma.coupon.findUnique({
      where: { serverId_code: { serverId, code: 'CANCELTEST' } },
    });
    expect(coupon?.usedCount).toBe(2);
  });

  it('does NOT restore coupon if usedCount is 0', async () => {
    await createTestCoupon(serverId, { code: 'ZEROUSED', discountValue: 10, usageLimit: 10, usedCount: 0 });
    const order = await createTestOrder(serverId, productId, {
      status: OrderStatus.PAID, totalAmount: 900, ownerAmount: 810, couponCode: 'ZEROUSED',
    });

    await prisma.$transaction(async (tx: any) =>
      cancelOrderTx(tx, { orderId: order.id, allowedStatuses: [OrderStatus.PAID] }),
    );

    const coupon = await prisma.coupon.findUnique({
      where: { serverId_code: { serverId, code: 'ZEROUSED' } },
    });
    expect(coupon?.usedCount).toBe(0);
  });

  it('does NOT affect stock for products with null stock', async () => {
    const unlimitedProduct = await createTestProduct(serverId, { price: 500, stock: null });
    const order = await createTestOrder(serverId, unlimitedProduct.id, { status: OrderStatus.PAID, totalAmount: 500, ownerAmount: 450 });

    await prisma.$transaction(async (tx: any) =>
      cancelOrderTx(tx, { orderId: order.id, allowedStatuses: [OrderStatus.PAID] }),
    );

    const product = await prisma.product.findUnique({ where: { id: unlimitedProduct.id } });
    expect(product?.stock).toBeNull();
  });

  it('does NOT create refund transaction for PENDING status', async () => {
    const wallet = await prisma.wallet.findUnique({ where: { serverId } });
    const balanceBefore = Number(wallet?.balance || 0);

    const order = await createTestOrder(serverId, productId, { status: OrderStatus.PENDING, totalAmount: 1000, ownerAmount: 900 });

    await prisma.$transaction(async (tx: any) =>
      cancelOrderTx(tx, { orderId: order.id, allowedStatuses: [OrderStatus.PENDING] }),
    );

    const walletAfter = await prisma.wallet.findUnique({ where: { serverId } });
    expect(Number(walletAfter?.balance)).toBe(balanceBefore);

    const txs = await prisma.transaction.findMany({ where: { walletId: wallet?.id } });
    expect(txs).toHaveLength(0);
  });

  it('creates refund transaction for PAID commission order', async () => {
    const wallet = await prisma.wallet.findUnique({ where: { serverId } });
    const order = await createTestOrder(serverId, productId, { status: OrderStatus.PAID, totalAmount: 1000, ownerAmount: 900 });

    await prisma.$transaction(async (tx: any) =>
      cancelOrderTx(tx, { orderId: order.id, allowedStatuses: [OrderStatus.PAID] }),
    );

    const walletAfter = await prisma.wallet.findUnique({ where: { serverId } });
    expect(Number(walletAfter?.balance)).toBe(-900);

    const txs = await prisma.transaction.findMany({ where: { walletId: wallet?.id } });
    expect(txs).toHaveLength(1);
    expect(txs[0].amount).toBe(-900);
    expect(txs[0].type).toBe('refund');
  });

  it('avoids refund for PAID subscription order without refundSubscription flag', async () => {
    const wallet = await prisma.wallet.findUnique({ where: { serverId } });

    const order = await createTestOrder(serverId, productId, {
      status: OrderStatus.PAID, totalAmount: 1000, ownerAmount: 900, planTypeAtCreation: 'subscription',
    });

    await prisma.$transaction(async (tx: any) =>
      cancelOrderTx(tx, { orderId: order.id, allowedStatuses: [OrderStatus.PAID] }),
    );

    const walletAfter = await prisma.wallet.findUnique({ where: { serverId } });
    expect(Number(walletAfter?.balance)).toBe(0);

    const txs = await prisma.transaction.findMany({ where: { walletId: wallet?.id } });
    expect(txs).toHaveLength(0);
  });

  it('forces refund for PAID subscription order when refundSubscription=true', async () => {
    const wallet = await prisma.wallet.findUnique({ where: { serverId } });

    const order = await createTestOrder(serverId, productId, {
      status: OrderStatus.PAID, totalAmount: 1000, ownerAmount: 900, planTypeAtCreation: 'subscription',
    });

    await prisma.$transaction(async (tx: any) =>
      cancelOrderTx(tx, { orderId: order.id, allowedStatuses: [OrderStatus.PAID], refundSubscription: true }),
    );

    const walletAfter = await prisma.wallet.findUnique({ where: { serverId } });
    expect(Number(walletAfter?.balance)).toBe(-900);

    const txs = await prisma.transaction.findMany({ where: { walletId: wallet?.id } });
    expect(txs).toHaveLength(1);
  });
});
