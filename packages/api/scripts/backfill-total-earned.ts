import { PrismaClient, Prisma } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('[backfill] starting wallet.totalEarned recalculation...');

  const wallets = await prisma.wallet.findMany({
    select: { id: true, serverId: true },
  });

  let updated = 0;
  for (const w of wallets) {
    const result = await prisma.order.aggregate({
      where: {
        serverId: w.serverId,
        status: { in: ['paid', 'delivered'] },
      },
      _sum: { ownerAmount: true },
    });

    const totalEarned = new Prisma.Decimal(result._sum.ownerAmount || 0);

    await prisma.wallet.update({
      where: { id: w.id },
      data: { totalEarned },
    });

    updated++;
  }

  console.log(`[backfill] done. ${updated} wallets updated.`);
}

main()
  .catch((e) => {
    console.error('[backfill] failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
