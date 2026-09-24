import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  const tenants = await prisma.tenant.findMany();
  if (tenants.length === 0) return;
  const tenant = tenants[0];

  const periods = [
    { start: '09:00', end: '09:45' },
    { start: '09:45', end: '10:30' },
    { start: '10:45', end: '11:30' },
    { start: '11:30', end: '12:15' },
    { start: '13:00', end: '13:45' },
    { start: '13:45', end: '14:30' },
    { start: '14:45', end: '15:30' },
    { start: '15:30', end: '16:15' },
    { start: '16:15', end: '17:00' }
  ];

  console.log("Seeding initial timeslots...");
  for (const p of periods) {
    const exists = await prisma.timeslot.findFirst({
      where: { tenantId: tenant.id, startTime: p.start, endTime: p.end }
    });
    if (!exists) {
      await prisma.timeslot.create({
        data: {
          tenantId: tenant.id,
          startTime: p.start,
          endTime: p.end
        }
      });
    }
  }
  console.log("Timeslots seeded!");
}

main().catch(console.error).finally(() => prisma.$disconnect());
