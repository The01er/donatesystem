import prisma from '../plugins/prisma.js';

export async function getServerMemberRole(userId: string, serverId: string) {
  const member = await prisma.serverMember.findUnique({
    where: { serverId_userId: { serverId, userId } },
  });
  return member?.role || null;
}
