import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const email = process.argv[2];
  const role = (process.argv[3] || 'SUPER_ADMIN').toUpperCase();

  if (!email) {
    console.log('Usage: npx tsx scripts/make-admin.ts <email> [role]');
    console.log('Roles: SUPER_ADMIN, ADMIN, SUPPORT, FINANCE');
    console.log('Example: npx tsx scripts/make-admin.ts admin@example.com');
    process.exit(1);
  }

  const user = await prisma.user.findUnique({ where: { email } });

  if (!user) {
    console.error(`User not found: ${email}`);
    console.log('Register first via POST /api/auth/register');
    process.exit(1);
  }

  const existing = await prisma.platformStaff.findUnique({ where: { userId: user.id } });

  if (existing) {
    await prisma.platformStaff.update({
      where: { userId: user.id },
      data: { role: role as any, isActive: true },
    });
    console.log(`Updated: ${email} role = ${role} (was ${existing.role})`);
  } else {
    await prisma.platformStaff.create({
      data: { userId: user.id, role: role as any },
    });
    console.log(`Created: ${email} role = ${role}`);
  }

  await prisma.$disconnect();
}

main();
