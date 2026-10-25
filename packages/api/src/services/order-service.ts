import { OrderStatus } from '../constants/order-status.js';
import { RevokeStatus } from '../constants/revoke-status.js';
import prisma from '../plugins/prisma.js';

type Tx = Parameters<Parameters<(typeof prisma)['$transaction']>[0]>[0];
type DbClient = Tx | typeof prisma;

export function calculateCommission(totalAmount: number, commissionPct: number) {
  const commissionAmt = +((totalAmount * commissionPct) / 100).toFixed(2);
  const ownerAmount = +(totalAmount - commissionAmt).toFixed(2);
  return { commissionAmt, ownerAmount };
}

export interface PrivilegeOrder {
  productId: string;
  productName: string;
  price: number;
  createdAt: Date;
}

export interface UpgradeEntry {
  productId: string;
  fromProductName: string;
  fromPrice: number;
  upgradePrice: number;
}

export async function getPurchasedPrivileges(
  client: DbClient,
  playerName: string,
  serverId: string,
  maxDays: number,
): Promise<PrivilegeOrder[]> {
  const statuses = [OrderStatus.PAID, OrderStatus.DELIVERED];

  let dateFilter: Date | undefined;
  if (maxDays > 0) {
    dateFilter = new Date(Date.now() - maxDays * 24 * 60 * 60 * 1000);
  }

  const orders = await client.order.findMany({
    where: {
      serverId,
      playerName,
      status: { in: statuses },
      ...(dateFilter ? { createdAt: { gte: dateFilter } } : {}),
      product: { type: 'privilege' },
    },
    include: {
      product: { select: { id: true, name: true, price: true } },
    },
    orderBy: { createdAt: 'desc' },
  });

  return orders.map((o) => ({
    productId: o.product.id,
    productName: o.product.name,
    price: Number(o.product.price),
    createdAt: o.createdAt,
  }));
}

export function computeBestUpgrade(
  productId: string,
  price: number,
  purchased: PrivilegeOrder[],
  maxDiscount: number,
): UpgradeEntry | null {
  const cheaper = purchased.filter((p) => p.price < price);
  if (cheaper.length === 0) return null;

  const best = cheaper.reduce((max, p) => (p.price > max.price ? p : max));
  let diff = +(price - best.price).toFixed(2);
  if (diff <= 0) return null;

  if (maxDiscount > 0 && diff > maxDiscount) {
    diff = maxDiscount;
  }

  return {
    productId,
    fromProductName: best.productName,
    fromPrice: best.price,
    upgradePrice: diff,
  };
}

export async function revokeOrderTx(tx: Tx, params: {
  orderId: string;
  removeCommand: string;
  userId: string;
  ipAddress: string;
  auditAction: string;
  amount?: number;
}) {
  const updated = await tx.order.updateMany({
    where: {
      id: params.orderId,
      OR: [
        { revokeStatus: { not: RevokeStatus.REVOKED } },
        { revokeStatus: null },
      ],
    },
    data: { revokeStatus: RevokeStatus.PENDING, revokeCommand: params.removeCommand },
  });
  if (updated.count === 0) {
    throw new Error('ORDER_ALREADY_REVOKED');
  }

  await tx.auditLog.create({
    data: {
      userId: params.userId,
      action: params.auditAction,
      targetId: params.orderId,
      ...(params.amount !== undefined ? { amount: params.amount } : {}),
      ipAddress: params.ipAddress,
    },
  });
}

export async function reGrantOrderTx(tx: Tx, params: {
  orderId: string;
  userId: string;
  ipAddress: string;
  auditAction: string;
}) {
  const updated = await tx.order.updateMany({
    where: { id: params.orderId, revokeStatus: RevokeStatus.REVOKED },
    data: { revokeStatus: null, status: OrderStatus.PAID, retryCount: 0, lastError: null },
  });
  if (updated.count === 0) {
    throw new Error('ORDER_NOT_REVOKED');
  }

  await tx.auditLog.create({
    data: {
      userId: params.userId,
      action: params.auditAction,
      targetId: params.orderId,
      ipAddress: params.ipAddress,
    },
  });
}

export type CancelOrderResult =
  | { kind: 'ok' }
  | { kind: 'not_found' }
  | { kind: 'invalid_status'; status: string }
  | { kind: 'concurrent' };

export async function cancelOrderTx(tx: Tx, params: {
  orderId: string;
  serverId?: string;
  allowedStatuses: string[];
  refundSubscription?: boolean;
}) {
  const order = await tx.order.findUnique({ where: { id: params.orderId } });
  if (!order) return { kind: 'not_found' } as CancelOrderResult;
  if (params.serverId && order.serverId !== params.serverId) {
    return { kind: 'not_found' } as CancelOrderResult;
  }

  if (!params.allowedStatuses.includes(order.status)) {
    return { kind: 'invalid_status', status: order.status } as CancelOrderResult;
  }

  const updated = await tx.order.updateMany({
    where: { id: params.orderId, status: order.status },
    data: { status: OrderStatus.CANCELLED },
  });
  if (updated.count === 0) return { kind: 'concurrent' } as CancelOrderResult;

  if (order.productId) {
    await tx.product.updateMany({
      where: { id: order.productId, stock: { not: null } },
      data: { stock: { increment: 1 } },
    });
  }

  if (order.couponCode) {
    await tx.coupon.updateMany({
      where: { serverId: order.serverId, code: order.couponCode, usedCount: { gt: 0 } },
      data: { usedCount: { decrement: 1 } },
    });
  }

  const shouldRefund = order.status === OrderStatus.PAID && (
    params.refundSubscription || order.planTypeAtCreation !== 'subscription'
  );
  if (shouldRefund) {
    const wallet = await tx.wallet.findUnique({ where: { serverId: order.serverId } });
    if (wallet) {
      const amount = Number(order.ownerAmount);
      await tx.wallet.update({
        where: { id: wallet.id },
        data: {
          balance: { decrement: amount },
          totalEarned: { decrement: amount },
        },
      });
      await tx.transaction.create({
        data: {
          walletId: wallet.id,
          amount: -amount,
          type: 'refund',
          orderId: order.id,
          note: `Отмена заказа #${order.id.slice(0, 8)} — возврат ${amount}`,
        },
      });
    }
  }

  return { kind: 'ok' } as CancelOrderResult;
}
