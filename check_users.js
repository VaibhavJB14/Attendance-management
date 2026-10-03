const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
async function main() {
  console.log(await prisma.user.findMany({ select: { email: true, role: true, tenantId: true } }));
}
main().then(() => prisma.$disconnect());
