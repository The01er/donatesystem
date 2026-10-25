import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import fp from 'fastify-plugin';
import prisma from './prisma.js';
import { trackInterval } from '../lib/timers.js';

declare module 'fastify' {
  interface FastifyInstance {
    authenticate: (req: FastifyRequest, reply: FastifyReply) => Promise<void>;
  }
}

declare module '@fastify/jwt' {
  interface FastifyJWT {
    payload: { id: string; jti?: string };
    user: { id: string; jti?: string };
  }
}

const LAST_USED_TTL_MS = 5 * 60_000;
const lastUsedCache = new Map<string, number>();

function shouldUpdateLastUsed(jti: string): boolean {
  const last = lastUsedCache.get(jti);
  const now = Date.now();
  if (!last || now - last > LAST_USED_TTL_MS) {
    lastUsedCache.set(jti, now);
    return true;
  }
  return false;
}

trackInterval(() => {
  const now = Date.now();
  for (const [jti, ts] of lastUsedCache) {
    if (now - ts > LAST_USED_TTL_MS * 2) lastUsedCache.delete(jti);
  }
}, 60_000);

export default fp(async (app: FastifyInstance) => {
  app.decorate('authenticate', async (req: FastifyRequest, reply: FastifyReply) => {
    try {
      await req.jwtVerify();
    } catch {
      return reply.status(401).send({ error: 'Unauthorized' });
    }

    const { jti } = req.user;
    if (!jti) {
      return reply.status(401).send({ error: 'Legacy token — please re-login' });
    }

    const session = await prisma.userSession.findUnique({
      where: { id: jti },
      select: { id: true, expiresAt: true },
    });

    if (!session || session.expiresAt < new Date()) {
      return reply.status(401).send({ error: 'Session expired or revoked' });
    }

    if (shouldUpdateLastUsed(jti)) {
      prisma.userSession
        .update({
          where: { id: jti },
          data: { lastUsedAt: new Date() },
        })
        .catch((err) => {
          req.log.error({ err, jti }, 'Failed to update session lastUsedAt');
        });
    }

    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
      select: { bannedAt: true },
    });

    if (user?.bannedAt) {
      return reply.status(403).send({ error: 'Account is banned' });
    }
  });
});
