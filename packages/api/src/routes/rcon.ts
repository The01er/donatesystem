import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import prisma from '../plugins/prisma.js';
import { encryptSecret } from '../lib/crypto.js';
import { getAdapter } from '../adapters/registry.js';
import { invalidateShopCache } from '../plugins/cache.js';

const rconConfigSchema = z.object({
  host: z.string().min(1).max(255),
  port: z.number().int().min(1).max(65535).default(25575),
  password: z.string().min(1).max(500),
});

interface RouteParams {
  id: string;
}

export default async function rconRoutes(app: FastifyInstance) {
  app.addHook('preHandler', app.authenticate);

  app.get<{ Params: RouteParams }>('/api/servers/:id/rcon', async (req, reply) => {
    const { id } = req.params;
    const server = await prisma.server.findUnique({
      where: { id },
      select: { ownerId: true, rconHost: true, rconPort: true, rconPassword: true },
    });
    if (!server) return reply.status(404).send({ error: 'Server not found' });
    if (server.ownerId !== req.user!.id) return reply.status(403).send({ error: 'Access denied' });

    return {
      host: server.rconHost || '',
      port: server.rconPort || 25575,
      hasPassword: !!server.rconPassword,
    };
  });

  app.put<{ Params: RouteParams; Body: { host: string; port: number; password: string } }>(
    '/api/servers/:id/rcon',
    { config: { rateLimit: { max: 10, timeWindow: '1 minute' } } },
    async (req, reply) => {
      const { id } = req.params;
      const parsed = rconConfigSchema.safeParse(req.body);
      if (!parsed.success) return reply.status(400).send({ error: parsed.error.flatten() });

      const server = await prisma.server.findUnique({ where: { id }, select: { ownerId: true } });
      if (!server) return reply.status(404).send({ error: 'Server not found' });
      if (server.ownerId !== req.user!.id) return reply.status(403).send({ error: 'Access denied' });

      const encrypted = encryptSecret(parsed.data.password);

      await prisma.server.update({
        where: { id },
        data: {
          rconHost: parsed.data.host,
          rconPort: parsed.data.port,
          rconPassword: encrypted,
        },
      });
      invalidateShopCache(id);

      return { ok: true };
    },
  );

  app.post<{ Params: RouteParams }>('/api/servers/:id/rcon/test', {
    config: { rateLimit: { max: 5, timeWindow: '5 minutes' } },
  }, async (req, reply) => {
    const { id } = req.params;
    const server = await prisma.server.findUnique({
      where: { id },
      select: { gameType: true, ownerId: true, rconHost: true, rconPort: true, rconPassword: true },
    });
    if (!server) return reply.status(404).send({ error: 'Server not found' });
    if (server.ownerId !== req.user!.id) return reply.status(403).send({ error: 'Access denied' });

    const adapter = getAdapter(server.gameType || 'minecraft');
    const result = await adapter.testConnection(server);
    return result;
  });
}
