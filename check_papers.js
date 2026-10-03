const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
async function main() {
  console.log(await prisma.questionPaperRequest.findMany());
}
main().then(() => prisma.$disconnect());
