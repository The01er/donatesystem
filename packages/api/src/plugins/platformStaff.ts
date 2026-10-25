import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import fp from 'fastify-plugin';
import prisma from './prisma.js';

declare module 'fastify' {
  interface FastifyInstance {
    authStaff: (req: FastifyRequest, reply: FastifyReply) => Promise<void>;
  }
  interface FastifyRequest {
    staffMember?: { id: string; userId: string; role: string };
    pluginToken?: { server: { id: string; name: string; slug: string; blockedAt: Date | null } };
  }
}

export default fp(async (app: FastifyInstance) => {
  app.decorate('authStaff', async (req: FastifyRequest, reply: FastifyReply) => {
    const { id: userId } = req.user;

    const staff = await prisma.platformStaff.findUnique({
      where: { userId },
    });

    if (!staff || !staff.isActive) {
      return reply.status(403).send({ error: 'Access denied — not a platform staff member' });
    }

    req.staffMember = { id: staff.id, userId: staff.userId, role: staff.role };
  });
});
