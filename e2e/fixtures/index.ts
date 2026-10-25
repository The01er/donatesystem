import type { BrowserContext } from '@playwright/test';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import crypto from 'node:crypto';
import { PrismaClient } from '@prisma/client';
import { setAuthCookie, apiAuthenticated } from '../helpers/auth';

const prisma = new PrismaClient({
  datasources: {
    db: {
      url:
        process.env.TEST_DATABASE_URL ||
        'mysql://test:test@localhost:3306/donate_platform_test',
    },
  },
});

const JWT_SECRET = 'e2e-test-jwt-secret-do-not-use-in-prod';
const COOKIE_SECRET = 'e2e-test-cookie-secret-do-not-use-in-prod';

// ─── Test user ──────────────────────────────────────────────────────

export interface TestUser {
  id: string;
  email: string;
  password: string;
  cookie: string; // raw JWT value (без префикса)
}

/**
 * Создаёт пользователя напрямую через Prisma (обходит rate-limit API).
 */
export async function createTestUser(
  email: string = `e2e-user-${Date.now()}@test.com`,
  password: string = 'testpass123',
): Promise<TestUser> {
  const hash = await bcrypt.hash(password, 10);

  const user = await prisma.user.create({
    data: { email, password: hash, emailVerified: true },
  });

  const session = await prisma.userSession.create({
    data: {
      userId: user.id,
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    },
  });

  const token = jwt.sign({ id: user.id, jti: session.id }, JWT_SECRET, { expiresIn: '7d' });

  // Подписываем cookie в формате @fastify/cookie: <value>.<HMAC-SHA256(secret, value)>
  const hmac = crypto.createHmac('sha256', COOKIE_SECRET).update(token).digest('base64url');
  const signedCookie = `${token}.${hmac}`;

  return { id: user.id, email, password, cookie: signedCookie };
}

/**
 * Создаёт администратора платформы.
 */
export async function createTestAdmin(
  email: string = `e2e-admin-${Date.now()}@test.com`,
  password: string = 'adminpass123',
  role: 'SUPER_ADMIN' | 'ADMIN' | 'FINANCE' | 'SUPPORT' = 'SUPER_ADMIN',
): Promise<TestUser> {
  const user = await createTestUser(email, password);

  await prisma.platformStaff.create({
    data: { userId: user.id, role },
  });

  return user;
}

// ─── Test server ────────────────────────────────────────────────────

export interface TestServer {
  id: string;
  slug: string;
  name: string;
  cookie: string;
}

export async function createTestServer(
  userId: string,
  options: {
    name?: string;
    slug?: string;
    gameType?: string;
    ipAddress?: string;
    planType?: 'commission' | 'subscription';
  } = {},
): Promise<TestServer> {
  const slug = options.slug || `e2e-server-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;

  const server = await prisma.server.create({
    data: {
      name: options.name || 'E2E Test Server',
      gameType: options.gameType || 'minecraft',
      ipAddress: options.ipAddress || '127.0.0.1:25565',
      slug,
      planType: options.planType || 'commission',
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
  });

  return { id: server.id, slug: server.slug, name: server.name, cookie: '' };
}

// ─── Test product ───────────────────────────────────────────────────

export interface TestProduct {
  id: string;
  name: string;
  price: number;
  type: string;
}

export async function createTestProduct(
  _cookie: string,
  serverId: string,
  options: {
    name?: string;
    price?: number;
    type?: string;
    command?: string;
    removeCommand?: string;
    stock?: number | null;
  } = {},
): Promise<TestProduct> {
  const product = await prisma.product.create({
    data: {
      name: options.name || 'E2E Test Product',
      price: options.price ?? 500,
      type: (options.type || 'item') as any,
      command: options.command || '/give {player} diamond 1',
      removeCommand: options.removeCommand ?? null,
      stock: options.stock !== undefined ? options.stock : null,
      serverId,
    },
  });

  return { id: product.id, name: product.name, price: Number(product.price), type: product.type };
}

// ─── Test coupon ────────────────────────────────────────────────────

export interface TestCoupon {
  id: string;
  code: string;
  discountType: string;
  discountValue: number;
}

export async function createTestCoupon(
  _cookie: string,
  serverId: string,
  options: {
    code?: string;
    discountType?: 'percentage' | 'fixed';
    discountValue?: number;
    usageLimit?: number | null;
    isActive?: boolean;
  } = {},
): Promise<TestCoupon> {
  const code = options.code || `E2E${Math.random().toString(36).slice(2, 6).toUpperCase()}`;

  const coupon = await prisma.coupon.create({
    data: {
      serverId,
      code,
      discountType: options.discountType || 'percentage',
      discountValue: options.discountValue ?? 10,
      usageLimit: options.usageLimit ?? null,
      usedCount: 0,
      isActive: options.isActive ?? true,
    },
  });

  return { id: coupon.id, code: coupon.code, discountType: coupon.discountType, discountValue: coupon.discountValue };
}

// ─── Browser context setup ──────────────────────────────────────────

/**
 * Создаёт браузерный контекст с аутентифицированной сессией.
 */
export async function createAuthContext(browser: { newContext: (opts?: any) => Promise<BrowserContext> }, cookie: string) {
  const context = await browser.newContext();
  await setAuthCookie(context, cookie);
  return context;
}

export async function closePrisma() {
  await prisma.$disconnect();
}
