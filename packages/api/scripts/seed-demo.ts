import 'dotenv/config';
import prisma from '../src/plugins/prisma.js';
import bcrypt from 'bcryptjs';

const DEMO_EMAIL = 'demo@example.com';
const DEMO_PASSWORD = process.env.DEMO_PASSWORD || 'change-me-demo';
const SERVER_NAME = 'SkyBlock Premium';
const SERVER_SLUG = 'demo';

async function main() {
  const existing = await prisma.user.findUnique({ where: { email: DEMO_EMAIL } });
  if (existing) {
    console.log('Demo user already exists. Skipping.');
    return;
  }

  const password = await bcrypt.hash(DEMO_PASSWORD, 10);
  const user = await prisma.user.create({
    data: {
      email: DEMO_EMAIL,
      password,
      emailVerified: true,
      onboardingCompleted: true,
      balance: 0,
    },
  });
  console.log(`Created user: ${user.email}`);

  const server = await prisma.server.create({
    data: {
      name: SERVER_NAME,
      gameType: 'minecraft',
      ipAddress: 'demo.example.com',
      slug: SERVER_SLUG,
      planType: 'subscription',
      template: 'cyber',
      primaryColor: 'violet',
      ownerId: user.id,
      paymentKeys: [{ provider: 'mock', enabled: true }],
    },
  });
  console.log(`Created server: ${server.name} (${server.slug})`);

  // Grant SUPER_ADMIN to demo user
  const existingStaff = await prisma.platformStaff.findUnique({ where: { userId: user.id } });
  if (!existingStaff) {
    await prisma.platformStaff.create({
      data: { userId: user.id, role: 'SUPER_ADMIN' },
    });
    console.log('Granted SUPER_ADMIN role');
  }

  // Wallet
  const wallet = await prisma.wallet.create({
    data: { serverId: server.id, balance: 0, totalEarned: 0 },
  });
  console.log('Created wallet');

  // Subscription (1 year)
  await prisma.subscription.create({
    data: {
      serverId: server.id,
      status: 'active',
      price: 9.99,
      expiresAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
      chargedFrom: 'balance',
    },
  });
  console.log('Created subscription (1 year)');

  // Products
  const products = [
    { name: 'VIP', type: 'privilege', price: 299, command: 'lp user {player} parent add vip', removeCommand: 'lp user {player} parent remove vip' },
    { name: 'Premium', type: 'privilege', price: 599, command: 'lp user {player} parent add premium', removeCommand: 'lp user {player} parent remove premium' },
    { name: 'Elite', type: 'privilege', price: 1199, command: 'lp user {player} parent add elite', removeCommand: 'lp user {player} parent remove elite' },
    { name: 'Titan', type: 'privilege', price: 2499, command: 'lp user {player} parent add titan', removeCommand: 'lp user {player} parent remove titan', stock: 50 },
    { name: '1000 Монет', type: 'currency', price: 99, command: 'eco give {player} 1000' },
    { name: '5000 Монет', type: 'currency', price: 399, command: 'eco give {player} 5000' },
    { name: '10000+2000 Монет', type: 'currency', price: 699, command: 'eco give {player} 12000' },
    { name: 'Набор Инструментов', type: 'item', price: 149, command: 'give {player} minecraft:diamond_pickaxe 1', stock: 30 },
    { name: 'Набор Брони', type: 'item', price: 299, command: 'give {player} minecraft:diamond_chestplate 1', stock: 20 },
    { name: 'Ключ от сундука', type: 'item', price: 49, command: 'give {player} minecraft:tripwire_hook 1', stock: 100 },
    {
      name: 'Таинственный Свиток', type: 'roulette', price: 199,
      actionsJson: JSON.stringify({
        type: 'roulette',
        variants: [
          { description: 'VIP', command: 'lp user {player} parent add vip', weight: 40 },
          { description: 'Premium', command: 'lp user {player} parent add premium', weight: 30 },
          { description: 'Elite', command: 'lp user {player} parent add elite', weight: 15 },
          { description: '1000 Монет', command: 'eco give {player} 1000', weight: 10 },
          { description: 'Titan', command: 'lp user {player} parent add titan', weight: 5 },
        ],
      }),
    },
  ];

  for (const p of products) {
    await prisma.product.create({
      data: {
        serverId: server.id,
        name: p.name,
        type: p.type as any,
        price: p.price,
        command: p.command || null,
        removeCommand: (p as any).removeCommand || null,
        stock: (p as any).stock ?? null,
        actionsJson: (p as any).actionsJson || null,
      },
    });
  }
  console.log(`Created ${products.length} products`);

  // Coupon
  await prisma.coupon.create({
    data: {
      serverId: server.id,
      code: 'WELCOME',
      discountType: 'percentage',
      discountValue: 10,
      usageLimit: 100,
      usedCount: 0,
      expiresAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
    },
  });
  console.log('Created coupon WELCOME (10%)');

  // Demo orders (10 with fake donators)
  const donatorNames = ['SteveMaster', 'Alex_Pro', 'NotchFan', 'CreeperSlayer', 'Enderman_42', 'DiamondLord', 'NetherKing', 'RedstoneGenius', 'PvP_Wizard', 'BuildCraft'];
  const productsForOrder = await prisma.product.findMany({ where: { serverId: server.id }, take: 5 });

  for (let i = 0; i < 10; i++) {
    const product = productsForOrder[i % productsForOrder.length];
    const amount = Number(product.price);
    const ownerAmount = Math.round(amount * 0.9 * 100) / 100;
    await prisma.order.create({
      data: {
        serverId: server.id,
        productId: product.id,
        playerName: donatorNames[i],
        email: `${donatorNames[i].toLowerCase()}@example.com`,
        consent: true,
        amount,
        ownerAmount,
        totalAmount: amount,
        status: 'delivered',
        commissionPct: 10,
        committedActions: JSON.stringify([0]),
      },
    });
  }
  console.log(`Created ${donatorNames.length} demo orders`);

  console.log('\nDemo shop ready at https://demo.example.com');
  console.log(`Login: ${DEMO_EMAIL} / ${DEMO_PASSWORD}`);
}

main()
  .catch((e) => {
    console.error('Seed failed:', e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
