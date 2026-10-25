import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient({
  datasources: {
    db: {
      url:
        process.env.TEST_DATABASE_URL ||
        'mysql://test:test@localhost:3306/donate_platform_test',
    },
  },
});

/**
 * Очищает все таблицы тестовой БД в правильном порядке (сначала зависимые).
 */
export async function resetDatabase() {
  await prisma.$executeRawUnsafe('SET FOREIGN_KEY_CHECKS = 0');

  const tables = [
    'DeliveryAttempt',
    'Order',
    'Product',
    'Coupon',
    'WithdrawalRequest',
    'WithdrawalEvent',
    'Transaction',
    'Wallet',
    'ServerPluginToken',
    'ServerMember',
    'Subscription',
    'TicketMessage',
    'Ticket',
    'PageView',
    'EmailVerification',
    'UserSession',
    'Deposit',
    'AuditLog',
    'PlatformStaff',
    'ServerLegalDocument',
    'Server',
    'User',
    'LandingContent',
    'LegalDocument',
    'News',
    'Faq',
    'PlatformSettings',
  ];

  for (const t of tables) {
    await prisma.$executeRawUnsafe(`DELETE FROM \`${t}\``);
  }

  await prisma.$executeRawUnsafe('SET FOREIGN_KEY_CHECKS = 1');

  // Создаём PlatformSettings, если нет — нужен для работы платформы
  await prisma.platformSettings.upsert({
    where: { id: 'global' },
    create: {
      id: 'global',
      defaultCommissionPct: 10,
      subscriptionPrice: 299,
      platformDomain: 'example.com',
      cnameTarget: 'cname.example.com',
      operatingMode: 'individual',
      platformName: 'DonatePlatform',
      platformEmail: 'support@example.com',
    },
    update: {},
  });
}

export async function closePrisma() {
  await prisma.$disconnect();
}
