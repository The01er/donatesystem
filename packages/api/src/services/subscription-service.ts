import prisma from '../plugins/prisma.js';
import { getOperatingMode } from '../lib/platform-settings.js';

const SUBSCRIPTION_DAYS = 30;

type Tx = Parameters<Parameters<(typeof prisma)['$transaction']>[0]>[0];
type TxClient = Tx | typeof prisma;

export async function chargeSubscription(
  serverId: string,
  ownerId: string,
  price: number,
  tx?: TxClient,
): Promise<{ ok: boolean; from: 'balance' | 'wallet' | null }> {
  const client = tx ?? prisma;

  try {
    const balanceResult = await client.user.updateMany({
      where: { id: ownerId, balance: { gte: price } },
      data: { balance: { decrement: price } },
    });

    if (balanceResult.count > 0) {
      if (!tx) {
        await prisma.subscription.update({
          where: { serverId },
          data: { chargedFrom: 'balance' },
        });
      }
      return { ok: true, from: 'balance' };
    }

    const walletResult = await client.wallet.updateMany({
      where: { serverId, balance: { gte: price } },
      data: { balance: { decrement: price } },
    });

    if (walletResult.count > 0) {
      const wallet = await client.wallet.findUnique({ where: { serverId }, select: { id: true } });
      if (wallet) {
        await client.transaction.create({
          data: {
            walletId: wallet.id,
            amount: -price,
            type: 'correction',
            note: `Оплата подписки — ${price.toFixed(2)}₽ (списание с кошелька витрины)`,
          },
        });
      }
      if (!tx) {
        await prisma.subscription.update({
          where: { serverId },
          data: { chargedFrom: 'wallet' },
        });
      }
      return { ok: true, from: 'wallet' };
    }

    return { ok: false, from: null };
  } catch (e: unknown) {
    console.error('[chargeSubscription] failed for server', serverId, e);
    return { ok: false, from: null };
  }
}

export async function checkSubscriptionExpiry(serverId: string) {
  const server = await prisma.server.findUnique({
    where: { id: serverId },
    select: {
      planType: true,
      ownerId: true,
      subscription: { select: { id: true, status: true, expiresAt: true, price: true } },
    },
  });
  if (!server || server.planType !== 'subscription' || !server.subscription) return;
  if (server.subscription.status !== 'active' || server.subscription.expiresAt >= new Date()) return;

  const operatingMode = await getOperatingMode();

  if (operatingMode === 'self_employed') {
    // Self-employed: just mark expired, don't switch to commission
    await prisma.subscription.update({
      where: { id: server.subscription.id },
      data: { status: 'expired' },
    });
    return;
  }

  const charged = await chargeSubscription(serverId, server.ownerId, Number(server.subscription.price));
  if (!charged.ok) {
    await prisma.$transaction([
      prisma.server.update({ where: { id: serverId }, data: { planType: 'commission' } }),
      prisma.subscription.update({ where: { id: server.subscription.id }, data: { status: 'expired' } }),
    ]);
    return;
  }

  // Conditional update — only if expiresAt is still in the past
  const updated = await prisma.subscription.updateMany({
    where: {
      id: server.subscription.id,
      status: 'active',
      expiresAt: { lt: new Date() },
    },
    data: { expiresAt: new Date(Date.now() + SUBSCRIPTION_DAYS * 24 * 60 * 60 * 1000) },
  });

  if (updated.count === 0) {
    const refundAmount = Number(server.subscription.price);
    await prisma.$transaction(async (tx) => {
      if (charged.from === 'balance') {
        await tx.user.update({
          where: { id: server.ownerId },
          data: { balance: { increment: refundAmount } },
        });
      } else if (charged.from === 'wallet') {
        await tx.wallet.update({
          where: { serverId },
          data: { balance: { increment: refundAmount } },
        });
      }
    });
  }
}

export async function refundSubscription(subscriptionId: string): Promise<{ refund: number; daysLeft: number }> {
  return prisma.$transaction((tx) => refundSubscriptionTx(tx, subscriptionId));
}

export async function refundSubscriptionTx(
  tx: Tx,
  subscriptionId: string,
): Promise<{ refund: number; daysLeft: number }> {
  const sub = await tx.subscription.findUnique({ where: { id: subscriptionId } });
  if (!sub) return { refund: 0, daysLeft: 0 };

  let refund = 0;
  let daysLeft = 0;

  if (sub.status === 'active' && sub.expiresAt > new Date()) {
    const now = Date.now();
    const diffMs = sub.expiresAt.getTime() - now;
    daysLeft = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    refund = Math.round((Number(sub.price) / SUBSCRIPTION_DAYS) * daysLeft * 100) / 100;

    if (refund > 0) {
      const server = await tx.server.findUnique({
        where: { id: sub.serverId },
        select: { ownerId: true, wallet: { select: { id: true } } },
      });
      if (server) {
        if (sub.chargedFrom === 'wallet' && server.wallet) {
          await tx.wallet.update({
            where: { id: server.wallet.id },
            data: { balance: { increment: refund } },
          });
          await tx.transaction.create({
            data: {
              walletId: server.wallet.id,
              amount: refund,
              type: 'correction',
              note: `Возврат за подписку — ${refund.toFixed(2)}₽ за ${daysLeft} неиспользованных дней`,
            },
          });
        } else {
          await tx.user.update({
            where: { id: server.ownerId },
            data: { balance: { increment: refund } },
          });
          if (server.wallet) {
            await tx.transaction.create({
              data: {
                walletId: server.wallet.id,
                amount: refund,
                type: 'correction',
                note: `Возврат за подписку — ${refund.toFixed(2)}₽ за ${daysLeft} неиспользованных дней`,
              },
            });
          }
        }
      }
    }
  }

  await tx.subscription.update({
    where: { id: sub.id },
    data: { status: 'cancelled' },
  });

  await tx.server.update({
    where: { id: sub.serverId },
    data: { planType: 'commission' },
  });

  return { refund, daysLeft };
}

export async function runSubscriptionRenewals() {
  const expired = await prisma.subscription.findMany({
    where: { status: 'active', expiresAt: { lt: new Date() } },
    select: { serverId: true },
  });
  await Promise.allSettled(expired.map((sub) => checkSubscriptionExpiry(sub.serverId)));
}
