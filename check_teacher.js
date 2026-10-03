const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
async function main() {
  console.log(await prisma.teacherProfile.findUnique({ where: { id: '07972383-4b81-469b-ae32-e3ad44f2e85a' }, include: { user: true } }));
}
main().then(() => prisma.$disconnect());
