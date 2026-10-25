import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import bcrypt from 'bcryptjs';
import crypto from 'node:crypto';
import { z } from 'zod';
import prisma from '../plugins/prisma.js';
import { sendVerificationEmail, sendPasswordResetEmail } from '../services/email-service.js';
import { STORE_DOCS, generateDocument, getStatusLabel } from '../services/legal-document-service.js';
import { getPlatformConfig, getOperatingMode } from '../lib/platform-settings.js';

const BASE_URL = process.env.BASE_URL || 'http://localhost:3000';


interface RouteParams {
  sessionId: string;
  [key: string]: string;
}

function normalizeIp(ip: string | undefined): string | null {
  if (!ip) return null;
  // Normalize IPv4-mapped IPv6 addresses (::ffff:192.168.x.x → 192.168.x.x)
  if (ip.startsWith('::ffff:')) return ip.slice(7);
  // Guard against unprocessed proxy placeholders like {remote_host}
  if (ip.includes('{')) return null;
  return ip;
}

const SESSION_TTL_DAYS = 7;
const MAX_SESSIONS = 10;
const COOKIE_NAME = 'donate_session';

async function validateCaptcha(token: string, secretKey: string): Promise<boolean> {
  if (!secretKey) return true;
  try {
    const params = new URLSearchParams({ secret: secretKey, response: token });
    const res = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
      method: 'POST',
      body: params,
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    });
    const data = (await res.json()) as { success?: boolean };
    return data.success === true;
  } catch {
    return false;
  }
}

const registerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
  consent: z.boolean().refine((v) => v === true, { message: 'Необходимо согласие на обработку персональных данных' }),
  captchaToken: z.string().optional(),
});

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
  captchaToken: z.string().optional(),
});

export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1),
  newPassword: z.string().min(8),
});

export const deleteAllSessionsSchema = z.object({
  all: z.enum(['true']),
});

const forgotPasswordSchema = z.object({
  email: z.string().email(),
  captchaToken: z.string().optional(),
});

const resetPasswordSchema = z.object({
  token: z.string(),
  newPassword: z.string().min(8),
});

function generateToken(): string {
  return crypto.randomBytes(32).toString('hex');
}

function makeSessionExpiry(): Date {
  return new Date(Date.now() + SESSION_TTL_DAYS * 24 * 60 * 60 * 1000);
}

async function createSession(userId: string, req: FastifyRequest) {
  return prisma.$transaction(async (tx) => {
    const sessions = await tx.userSession.findMany({
      where: { userId, expiresAt: { gt: new Date() } },
      orderBy: { lastUsedAt: 'asc' },
      select: { id: true },
    });
    if (sessions.length >= MAX_SESSIONS) {
      const toDelete = sessions.slice(0, sessions.length - MAX_SESSIONS + 1).map((s: { id: string }) => s.id);
      await tx.userSession.deleteMany({ where: { id: { in: toDelete } } });
    }
    return tx.userSession.create({
      data: {
        userId,
        expiresAt: makeSessionExpiry(),
        userAgent: (req.headers?.['user-agent'] as string)?.slice(0, 500) || null,
        ipAddress: normalizeIp(req.ip),
      },
    });
  });
}

function setTokenCookie(reply: FastifyReply, token: string) {
  reply.setCookie(COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: SESSION_TTL_DAYS * 24 * 60 * 60,
    signed: true,
  });
}

export default async function authRoutes(app: FastifyInstance) {
  app.get(
    '/api/auth/public-config',
    { schema: { tags: ['auth'] } },
    async () => {
      const [cfg, settings] = await Promise.all([
        getPlatformConfig(),
        prisma.platformSettings.findUnique({ where: { id: 'global' }, select: { brandName: true } }),
      ]);
      return { siteKey: cfg.turnstileSiteKey || null, brandName: settings?.brandName || null };
    },
  );

  app.post(
    '/api/auth/register',
    { config: { rateLimit: { max: 5, timeWindow: '5 minutes' } }, schema: { tags: ['auth'] } },
    async (req, reply) => {
      const parsed = registerSchema.safeParse(req.body);
      if (!parsed.success) {
        return reply.status(400).send({ error: parsed.error.flatten() });
      }

      const { email, password, captchaToken } = parsed.data;
      const config = await getPlatformConfig();
      if (config.turnstileSecretKey) {
        if (!captchaToken) {
          return reply.status(400).send({ error: 'Captcha token is required' });
        }
        const valid = await validateCaptcha(captchaToken, config.turnstileSecretKey);
        if (!valid) {
          return reply.status(400).send({ error: 'Captcha validation failed' });
        }
      }
      const existing = await prisma.user.findUnique({ where: { email } });
      if (existing) {
        return reply.status(409).send({ error: 'Email already registered' });
      }

      const hash = await bcrypt.hash(password, 10);
      const user = await prisma.user.create({
        data: { email, password: hash },
      });

      const verificationToken = generateToken();
      await prisma.emailVerification.create({
        data: {
          userId: user.id,
          token: verificationToken,
          type: 'email_verify',
          expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
        },
      });

      try {
        await sendVerificationEmail({ email: user.email }, verificationToken);
      } catch (e: unknown) {
        req.log.error(e, 'Failed to send verification email');
      }

      return { message: 'На ваш email отправлена ссылка для подтверждения' };
    },
  );

  app.post(
    '/api/auth/login',
    { config: { rateLimit: { max: 5, timeWindow: '5 minutes' } }, schema: { tags: ['auth'] } },
    async (req, reply) => {
      const parsed = loginSchema.safeParse(req.body);
      if (!parsed.success) {
        return reply.status(400).send({ error: parsed.error.flatten() });
      }

      const { email, password, captchaToken } = parsed.data;
      const config = await getPlatformConfig();
      if (config.turnstileSecretKey) {
        if (!captchaToken) {
          return reply.status(400).send({ error: 'Captcha token is required' });
        }
        const valid = await validateCaptcha(captchaToken, config.turnstileSecretKey);
        if (!valid) {
          return reply.status(400).send({ error: 'Captcha validation failed' });
        }
      }
      const user = await prisma.user.findUnique({
        where: { email },
        select: { id: true, email: true, password: true, bannedAt: true, banReason: true, emailVerified: true },
      });
      if (!user) {
        return reply.status(401).send({ error: 'Invalid credentials' });
      }

      const valid = await bcrypt.compare(password, user.password);
      if (!valid) {
        return reply.status(401).send({ error: 'Invalid credentials' });
      }

      if (user.bannedAt) {
        return reply.status(403).send({ error: 'Banned', reason: user.banReason });
      }

      const session = await createSession(user.id, req);
      const token = app.jwt.sign({ id: user.id, jti: session.id }, { expiresIn: `${SESSION_TTL_DAYS}d` });

      setTokenCookie(reply, token);
      return { user: { id: user.id, email: user.email, emailVerified: user.emailVerified }, sessionId: session.id };
    },
  );

  app.post('/api/auth/logout', { preHandler: [app.authenticate], schema: { tags: ['auth'] } }, async (req, reply) => {
    const { jti } = req.user;
    if (jti) {
      await prisma.userSession.delete({ where: { id: jti } }).catch((err) => {
        req.log.error({ err, jti }, 'Failed to delete session on logout');
      });
    }
    reply.clearCookie(COOKIE_NAME, { path: '/' });
    return { ok: true };
  });

  app.get('/api/auth/me', { preHandler: [app.authenticate], schema: { tags: ['auth'] } }, async (req) => {
    const { id, jti } = req.user;

    const operatingMode = await getOperatingMode();
    const isSelfEmployed = operatingMode === 'self_employed';

    const user = await prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        email: true,
        createdAt: true,
        onboardingCompleted: true,
        emailVerified: true,
        legalStatus: true,
        legalName: true,
        inn: true,
        legalAddress: true,
        ...(isSelfEmployed ? {} : { balance: true }),
      },
    });
    if (!user) return;
    let onboardingCompleted = user.onboardingCompleted;
    if (!onboardingCompleted) {
      const serverWithProduct = await prisma.server.findFirst({
        where: { ownerId: id, products: { some: {} } },
        select: { id: true },
      });
      if (serverWithProduct) {
        await prisma.user.update({ where: { id }, data: { onboardingCompleted: true } });
        onboardingCompleted = true;
      }
    }
    if (jti) {
      await prisma.userSession.update({ where: { id: jti }, data: { lastUsedAt: new Date() } }).catch((err) => {
        req.log.error({ err, jti }, 'Failed to update session lastUsedAt');
      });
    }
    return {
      id: user.id,
      email: user.email,
      createdAt: user.createdAt,
      onboardingCompleted,
      emailVerified: user.emailVerified,
      legalStatus: user.legalStatus,
      legalName: user.legalName,
      inn: user.inn,
      legalAddress: user.legalAddress,
      ...('balance' in user ? { balance: user.balance } : {}),
    };
  });

  app.post('/api/auth/onboarding', { preHandler: [app.authenticate], schema: { tags: ['auth'] } }, async (req) => {
    const { id } = req.user;
    await prisma.user.update({ where: { id }, data: { onboardingCompleted: true } });
    return { ok: true };
  });

  // ── Sessions: list own sessions ───────────────────────────
  app.get('/api/auth/sessions', { preHandler: [app.authenticate], schema: { tags: ['auth'] } }, async (req) => {
    const { id, jti } = req.user;
    const sessions = await prisma.userSession.findMany({
      where: { userId: id },
      orderBy: { lastUsedAt: 'desc' },
      select: {
        id: true,
        userAgent: true,
        ipAddress: true,
        createdAt: true,
        lastUsedAt: true,
        expiresAt: true,
      },
    });
    return sessions.map((s) => ({ ...s, isCurrent: s.id === jti }));
  });

  // ── Sessions: revoke a session (not current) ───────────────
  app.delete(
    '/api/auth/sessions/:sessionId',
    {
      preHandler: [app.authenticate],
      config: { rateLimit: { max: 10, timeWindow: '1 minute' } },
      schema: { tags: ['auth'] },
    },
    async (req, reply) => {
      const { id, jti } = req.user;
      const { sessionId } = req.params as RouteParams;

      const session = await prisma.userSession.findUnique({ where: { id: sessionId } });
      if (!session) return reply.status(404).send({ error: 'Session not found' });
      if (session.userId !== id) return reply.status(403).send({ error: 'Not your session' });
      if (session.id === jti) return reply.status(400).send({ error: 'Cannot revoke current session' });

      await prisma.userSession.delete({ where: { id: sessionId } });
      return { ok: true };
    },
  );

  // ── Sessions: revoke all except current ────────────────────
  app.delete(
    '/api/auth/sessions',
    { preHandler: [app.authenticate], schema: { tags: ['auth'] } },
    async (req, reply) => {
      const parsed = deleteAllSessionsSchema.safeParse(req.query);
      if (!parsed.success) {
        return reply.status(400).send({ error: parsed.error.flatten() });
      }
      const { id, jti } = req.user;
      await prisma.userSession.deleteMany({
        where: { userId: id, id: { not: jti } },
      });
      return { ok: true };
    },
  );

  // ── Password: change ───────────────────────────────────────
  app.post(
    '/api/auth/change-password',
    {
      preHandler: [app.authenticate],
      config: { rateLimit: { max: 3, timeWindow: '5 minutes' } },
      schema: { tags: ['auth'] },
    },
    async (req, reply) => {
      const parsed = changePasswordSchema.safeParse(req.body);
      if (!parsed.success) {
        return reply.status(400).send({ error: parsed.error.flatten() });
      }

      const { currentPassword, newPassword } = parsed.data;
      const { id, jti } = req.user;

      const user = await prisma.user.findUnique({
        where: { id },
        select: { password: true },
      });
      if (!user) {
        return reply.status(404).send({ error: 'User not found' });
      }

      const valid = await bcrypt.compare(currentPassword, user.password);
      if (!valid) {
        return reply.status(400).send({ error: 'Current password is incorrect' });
      }

      const hash = await bcrypt.hash(newPassword, 10);

      await prisma.$transaction([
        prisma.user.update({ where: { id }, data: { password: hash } }),
        prisma.userSession.deleteMany({ where: { userId: id, id: { not: jti } } }),
      ]);

      return { ok: true };
    },
  );

  // ── Email verification ────────────────────────────────────
  app.get('/api/auth/verify-email', { schema: { tags: ['auth'] } }, async (req, reply) => {
    const { token } = z.object({ token: z.string().min(1) }).parse(req.query);
    if (!token) {
      return reply.redirect(`${BASE_URL}/login?verified=invalid`);
    }

    const record = await prisma.emailVerification.findUnique({
      where: { token },
    });

    if (!record || record.type !== 'email_verify' || record.expiresAt < new Date()) {
      return reply.redirect(`${BASE_URL}/login?verified=expired`);
    }

    await prisma.$transaction([
      prisma.user.update({ where: { id: record.userId }, data: { emailVerified: true } }),
      prisma.emailVerification.delete({ where: { id: record.id } }),
    ]);

    return reply.redirect(`${BASE_URL}/login?verified=true`);
  });

  app.post(
    '/api/auth/resend-verification',
    {
      preHandler: [app.authenticate],
      config: { rateLimit: { max: 3, timeWindow: '15 minutes' } },
      schema: { tags: ['auth'] },
    },
    async (req, reply) => {
      const { id } = req.user;
      const user = await prisma.user.findUnique({
        where: { id },
        select: { email: true, emailVerified: true },
      });
      if (!user) {
        return reply.status(404).send({ error: 'User not found' });
      }
      if (user.emailVerified) {
        return reply.status(400).send({ error: 'Email already verified' });
      }

      await prisma.emailVerification.deleteMany({
        where: { userId: id, type: 'email_verify' },
      });

      const verificationToken = generateToken();
      await prisma.emailVerification.create({
        data: {
          userId: id,
          token: verificationToken,
          type: 'email_verify',
          expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
        },
      });

      try {
        await sendVerificationEmail({ email: user.email }, verificationToken);
      } catch (e: unknown) {
        req.log.error(e, 'Failed to resend verification email');
      }

      return { message: 'Ссылка для подтверждения отправлена повторно' };
    },
  );

  // ── Password reset ────────────────────────────────────────
  app.post(
    '/api/auth/forgot-password',
    {
      config: { rateLimit: { max: 3, timeWindow: '15 minutes' } },
      schema: { tags: ['auth'] },
    },
    async (req, reply) => {
      const parsed = forgotPasswordSchema.safeParse(req.body);
      if (!parsed.success) {
        return reply.status(400).send({ error: parsed.error.flatten() });
      }

      const { email, captchaToken } = parsed.data;
      const config = await getPlatformConfig();
      if (config.turnstileSecretKey) {
        if (!captchaToken) {
          return reply.status(400).send({ error: 'Captcha token is required' });
        }
        const valid = await validateCaptcha(captchaToken, config.turnstileSecretKey);
        if (!valid) {
          return reply.status(400).send({ error: 'Captcha validation failed' });
        }
      }

      const user = await prisma.user.findUnique({
        where: { email },
        select: { id: true, email: true },
      });

      if (user) {
        await prisma.emailVerification.deleteMany({
          where: { userId: user.id, type: 'password_reset' },
        });

        const resetToken = generateToken();
        await prisma.emailVerification.create({
          data: {
            userId: user.id,
            token: resetToken,
            type: 'password_reset',
            expiresAt: new Date(Date.now() + 60 * 60 * 1000),
          },
        });

        try {
          await sendPasswordResetEmail({ email: user.email }, resetToken);
        } catch (e: unknown) {
          req.log.error(e, 'Failed to send password reset email');
        }
      }

      return { message: 'Если аккаунт существует, на email отправлена ссылка для сброса пароля' };
    },
  );

  app.post(
    '/api/auth/reset-password',
    {
      config: { rateLimit: { max: 3, timeWindow: '15 minutes' } },
      schema: { tags: ['auth'] },
    },
    async (req, reply) => {
      const parsed = resetPasswordSchema.safeParse(req.body);
      if (!parsed.success) {
        return reply.status(400).send({ error: parsed.error.flatten() });
      }

      const { token, newPassword } = parsed.data;

      const record = await prisma.emailVerification.findUnique({
        where: { token },
      });

      if (!record || record.type !== 'password_reset' || record.expiresAt < new Date()) {
        return reply.status(400).send({ error: 'Недействительный или истёкший токен' });
      }

      const hash = await bcrypt.hash(newPassword, 10);

      await prisma.$transaction([
        prisma.user.update({ where: { id: record.userId }, data: { password: hash } }),
        prisma.userSession.deleteMany({ where: { userId: record.userId } }),
        prisma.emailVerification.delete({ where: { id: record.id } }),
      ]);

      return { message: 'Пароль изменён. Войдите с новым паролем.' };
    },
  );

  // ── Seller info ──────────────────────────────────────────
  const sellerInfoSchema = z.object({
    legalStatus: z.enum(['individual', 'self_employed', 'entrepreneur']).optional(),
    legalName: z.string().min(1).max(200).optional(),
    inn: z
      .string()
      .regex(/^\d{10,12}$/, 'ИНН должен содержать 10 или 12 цифр')
      .optional(),
    legalAddress: z.string().min(1).max(500).optional(),
  });

  app.put(
    '/api/auth/seller-info',
    { preHandler: [app.authenticate], schema: { tags: ['auth'] } },
    async (req, reply) => {
      const parsed = sellerInfoSchema.safeParse(req.body);
      if (!parsed.success) {
        return reply.status(400).send({ error: parsed.error.flatten() });
      }

      const { id } = req.user;
      const data = parsed.data;

      const user = await prisma.user.update({
        where: { id },
        data,
        select: { legalStatus: true, legalName: true, inn: true, legalAddress: true },
      });

      // Regenerate legal docs for all servers owned by this user
      const servers = await prisma.server.findMany({
        where: { ownerId: id },
        select: { id: true, name: true, slug: true, customDomain: true },
      });

      if (servers.length > 0) {
        const settings = await prisma.platformSettings.findUnique({ where: { id: 'global' } });
        const platformDomain = settings?.platformDomain || 'example.com';

        const sellerData = {
          legalStatus: getStatusLabel(user.legalStatus),
          legalName: user.legalName || '[Ваше ФИО]',
          inn: user.inn || '[Ваш ИНН]',
          legalAddress: user.legalAddress || '[Ваш адрес]',
          shopUrl: '',
        };

        for (const server of servers) {
          sellerData.shopUrl = server.customDomain
              ? `https://${server.customDomain}`
              : `https://${server.slug}.${platformDomain}`;

          await Promise.all(
            STORE_DOCS.map(async (d) => {
              const doc = generateDocument(d.slug, sellerData, server.name);
              await prisma.serverLegalDocument.upsert({
                where: { serverId_slug: { serverId: server.id, slug: d.slug } },
                create: { serverId: server.id, slug: d.slug, title: doc.title, content: doc.content },
                update: { title: doc.title, content: doc.content },
              });
            }),
          );
        }
      }

      return { ok: true };
    },
  );
}
