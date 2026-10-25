import { join } from 'node:path';

function getJwtSecret(): string {
  if (process.env.JWT_SECRET) return process.env.JWT_SECRET;
  if (process.env.NODE_ENV === 'production') {
    throw new Error('JWT_SECRET must be set in production');
  }
  return 'dev-secret-change-in-production';
}

function getCookieSecret(): string {
  if (process.env.COOKIE_SECRET) return process.env.COOKIE_SECRET;
  if (process.env.NODE_ENV === 'production') {
    throw new Error('COOKIE_SECRET must be set in production');
  }
  return 'dev-cookie-secret-change-in-production';
}

export const config = {
  port: Number(process.env.PORT) || 3001,
  jwtSecret: getJwtSecret(),
  cookieSecret: getCookieSecret(),
  uploadsDir: process.env.UPLOADS_DIR || join(process.cwd(), 'uploads'),
  sentryDsn: process.env.SENTRY_DSN || '',
  paymentWebhookSecret: process.env.PAYMENT_WEBHOOK_SECRET || '',
  paymentKeysEncryptionKey: process.env.PAYMENT_KEYS_ENCRYPTION_KEY || '',
};
