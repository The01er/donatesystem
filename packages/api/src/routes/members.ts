import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import prisma from '../plugins/prisma.js';

interface RouteParams {
  id: string;
  memberId: string;
  [key: string]: string;
}

const addMemberSchema = z.object({
  email: z.string().email(),
  role: z.enum(['admin', 'moderator']),
});

const updateRoleSchema = z.object({
  role: z.enum(['admin', 'moderator']),
});

export default async function memberRoutes(app: FastifyInstance) {
  // ─── List members ─────────────────────────────────────────

  app.get(
    '/api/servers/:id/members',
    { preHandler: [app.authenticate], schema: { tags: ['servers'] } },
    async (req, reply) => {
      const { id: userId } = req.user;
      const { id: serverId } = req.params as RouteParams;

      const member = await prisma.serverMember.findUnique({
        where: { serverId_userId: { serverId, userId } },
      });
      const server = await prisma.server.findUnique({ where: { id: serverId }, select: { ownerId: true } });
      if (!member && server?.ownerId !== userId) {
        return reply.status(403).send({ error: 'Access denied' });
      }

      return prisma.serverMember.findMany({
        where: { serverId },
        include: { user: { select: { id: true, email: true } } },
        orderBy: { joinedAt: 'asc' },
      });
    },
  );

  // ─── Add member ───────────────────────────────────────────

  app.post(
    '/api/servers/:id/members',
    { preHandler: [app.authenticate], schema: { tags: ['servers'] } },
    async (req, reply) => {
      const { id: userId } = req.user;
      const { id: serverId } = req.params as RouteParams;

      const parsed = addMemberSchema.safeParse(req.body);
      if (!parsed.success) return reply.status(400).send({ error: parsed.error.flatten() });

      // Only owner or admin can add
      const member = await prisma.serverMember.findUnique({
        where: { serverId_userId: { serverId, userId } },
      });
      const server = await prisma.server.findUnique({ where: { id: serverId }, select: { ownerId: true } });
      if (server?.ownerId !== userId && (!member || member.role !== 'admin')) {
        return reply.status(403).send({ error: 'Only owner or admin can add members' });
      }

      const targetUser = await prisma.user.findUnique({ where: { email: parsed.data.email } });
      if (!targetUser) {
        return reply.status(404).send({ error: 'User not found. They must register first.' });
      }

      const existing = await prisma.serverMember.findUnique({
        where: { serverId_userId: { serverId, userId: targetUser.id } },
      });
      if (existing) {
        return reply.status(409).send({ error: 'User is already a member' });
      }

      const newMember = await prisma.serverMember.create({
        data: { serverId, userId: targetUser.id, role: parsed.data.role },
        include: { user: { select: { id: true, email: true } } },
      });

      return newMember;
    },
  );

  // ─── Update role ──────────────────────────────────────────

  app.put(
    '/api/servers/:id/members/:memberId',
    { preHandler: [app.authenticate], schema: { tags: ['servers'] } },
    async (req, reply) => {
      const { id: userId } = req.user;
      const { id: serverId, memberId } = req.params as RouteParams;

      const parsed = updateRoleSchema.safeParse(req.body);
      if (!parsed.success) return reply.status(400).send({ error: parsed.error.flatten() });

      const server = await prisma.server.findUnique({ where: { id: serverId }, select: { ownerId: true } });
      if (server?.ownerId !== userId) {
        return reply.status(403).send({ error: 'Only owner can change roles' });
      }

      const targetMember = await prisma.serverMember.findUnique({ where: { id: memberId } });
      if (!targetMember || targetMember.serverId !== serverId) {
        return reply.status(404).send({ error: 'Member not found' });
      }
      if (targetMember.role === 'owner') {
        return reply.status(400).send({ error: 'Cannot change owner role' });
      }

      return prisma.serverMember.update({
        where: { id: memberId },
        data: { role: parsed.data.role },
        include: { user: { select: { id: true, email: true } } },
      });
    },
  );

  // ─── Remove member ────────────────────────────────────────

  app.delete(
    '/api/servers/:id/members/:memberId',
    { preHandler: [app.authenticate], schema: { tags: ['servers'] } },
    async (req, reply) => {
      const { id: userId } = req.user;
      const { id: serverId, memberId } = req.params as RouteParams;

      const server = await prisma.server.findUnique({ where: { id: serverId }, select: { ownerId: true } });
      const requester = await prisma.serverMember.findUnique({
        where: { serverId_userId: { serverId, userId } },
      });
      if (server?.ownerId !== userId && (!requester || requester.role !== 'admin')) {
        return reply.status(403).send({ error: 'Only owner or admin can remove members' });
      }

      const targetMember = await prisma.serverMember.findUnique({ where: { id: memberId } });
      if (!targetMember || targetMember.serverId !== serverId) {
        return reply.status(404).send({ error: 'Member not found' });
      }
      if (targetMember.role === 'owner') {
        return reply.status(400).send({ error: 'Cannot remove the owner' });
      }

      await prisma.serverMember.delete({ where: { id: memberId } });
      return { ok: true };
    },
  );
}
