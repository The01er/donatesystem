import bcrypt from 'bcryptjs';
import type { FastifyInstance } from 'fastify';
import prisma from '../../src/plugins/prisma.js';
import { OrderStatus } from '../../src/constants/order-status.js';
import crypto from 'node:crypto';

export async function clearDatabase() {
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
  ];
  for (const t of tables) {
    await prisma.$executeRawUnsafe(`DELETE FROM \`${t}\``);
  }
  await prisma.$executeRawUnsafe('SET FOREIGN_KEY_CHECKS = 1');
}

export async function createTestUser(app: FastifyInstance, email = 'test@example.com', password = 'password123') {
  const hash = await bcrypt.hash(password, 10);
  const user = await prisma.user.create({ data: { email, password: hash } });
  const session = await prisma.userSession.create({
    data: { userId: user.id, expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) },
  });
  const token = app.jwt.sign({ id: user.id, jti: session.id }, { expiresIn: '7d' });
  return {
    user,
    session,
    token,
    authHeaders: { Cookie: `donate_session=${token}` } as Record<string, string>,
  };
}

export async function createTestAdmin(
  app: FastifyInstance,
  email = 'admin@example.com',
  role: 'SUPER_ADMIN' | 'ADMIN' | 'FINANCE' | 'SUPPORT' = 'SUPER_ADMIN',
) {
  const { user, token, authHeaders } = await createTestUser(app, email, 'adminpass123');
  await prisma.platformStaff.create({ data: { userId: user.id, role } });
  return { user, token, authHeaders };
}

export async function createTestServer(userId: string, slug?: string) {
  if (!slug) {
    slug = 'test-' + crypto.randomUUID().slice(0, 8);
  }
  const server = await prisma.server.create({
    data: {
      name: 'Test Server',
      gameType: 'minecraft',
      ipAddress: '127.0.0.1:25565',
      slug,
      ownerId: userId,
      wallet: { create: {} },
      members: { create: { userId, role: 'owner' } },
      pluginTokens: {
        create: {
          name: 'Default',
          token: crypto.randomBytes(32).toString('hex'),
          isActive: true,
        },
      },
    },
    include: { wallet: true, pluginTokens: true },
  });
  return server;
}

export async function createTestProduct(serverId: string, overrides: Record<string, any> = {}) {
  return prisma.product.create({
    data: {
      name: overrides.name || 'Test Product',
      price: overrides.price ?? 1000,
      stock: overrides.stock !== undefined ? overrides.stock : null,
      type: overrides.type || 'item',
      command: overrides.command || '/give {player} diamond 1',
      removeCommand: overrides.removeCommand ?? null,
      actionsJson: overrides.actionsJson || null,
      serverId,
    },
  });
}

export async function createTestCoupon(serverId: string, overrides: Record<string, any> = {}) {
  return prisma.coupon.create({
    data: {
      serverId,
      code: overrides.code || 'TEST20',
      discountType: overrides.discountType || 'percentage',
      discountValue: overrides.discountValue ?? 20,
      usageLimit: overrides.usageLimit ?? null,
      usedCount: overrides.usedCount ?? 0,
      isActive: overrides.isActive ?? true,
      expiresAt: overrides.expiresAt ?? null,
    },
  });
}

export async function createTestOrder(serverId: string, productId: string, overrides: Record<string, any> = {}) {
  return prisma.order.create({
    data: {
      playerName: overrides.playerName || 'TestPlayer',
      status: overrides.status || OrderStatus.PAID,
      totalAmount: overrides.totalAmount ?? 1000,
      commissionPct: overrides.commissionPct ?? 10,
      commissionAmt: overrides.commissionAmt ?? 100,
      ownerAmount: overrides.ownerAmount ?? 900,
      couponCode: overrides.couponCode ?? null,
      upgrade: overrides.upgrade ?? false,
      heartbeatAt: overrides.heartbeatAt ?? null,
      lastError: overrides.lastError ?? null,
      planTypeAtCreation: overrides.planTypeAtCreation ?? null,
      productId,
      serverId,
    },
  });
}
