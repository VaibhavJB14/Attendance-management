import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  const tenants = await prisma.tenant.findMany();
  if (tenants.length === 0) {
    console.log("No tenants found.");
    return;
  }
  const tenant = tenants[0];
  
  // 1. Add School Classes
  const classes = [
    { grade: 'Year 1', section: 'Sec A' },
    { grade: 'Year 1', section: 'Sec B' },
    { grade: 'Year 1', section: 'Sec C' },
    { grade: 'Year 1', section: 'Sec D' },
    { grade: 'Year 2', section: 'Sec A' },
    { grade: 'Year 2', section: 'Sec B' },
    { grade: 'Year 2', section: 'Sec C' },
    { grade: 'Year 2', section: 'Sec D' },
    { grade: 'Year 3', section: 'Sec A' },
    { grade: 'Year 3', section: 'Sec B' },
    { grade: 'Year 4', section: 'Sec A' }
  ];

  for (const cls of classes) {
    const exists = await prisma.schoolClass.findFirst({
      where: { grade: cls.grade, section: cls.section, tenantId: tenant.id }
    });
    if (!exists) {
      await prisma.schoolClass.create({
        data: {
          tenantId: tenant.id,
          grade: cls.grade,
          section: cls.section
        }
      });
      console.log(`Created class: ${cls.grade} - ${cls.section}`);
    }
  }

  // 2. Add Attendance for today for a few students
  const today = new Date().toISOString().split('T')[0];
  const students = await prisma.student.findMany({ take: 10 });
  for (const s of students) {
    const attExists = await prisma.attendance.findFirst({
      where: { studentId: s.id, date: new Date(today) }
    });
    if (!attExists) {
      await prisma.attendance.create({
        data: {
          studentId: s.id,
          date: new Date(today),
          status: Math.random() > 0.8 ? 'ABSENT' : 'PRESENT',
          sessionName: 'Morning (8-12)',
          recordedBy: 'system'
        }
      });
    }
  }
  console.log("Added sample attendance.");

  // 3. Add sample Mark
  for (const s of students) {
    const markExists = await prisma.mark.findFirst({
      where: { studentId: s.id, subject: 'Math', examName: 'Midterm' }
    });
    if (!markExists) {
      await prisma.mark.create({
        data: {
          studentId: s.id,
          subject: 'Math',
          examName: 'Midterm',
          score: Math.floor(Math.random() * 40) + 60,
          maxScore: 100,
          examCategory: 'Competitive',
          syllabusCoverage: 'Chapter 1-5'
        }
      });
    }
  }
  console.log("Added sample marks.");

  // 4. Add sample ClassTeacher Assignment
  const teacher = await prisma.user.findFirst({ where: { role: 'TEACHER' }});
  if (teacher) {
    const assignExists = await prisma.classTeacherAssignment.findFirst({
      where: { teacherId: teacher.id }
    });
    if (!assignExists) {
      await prisma.classTeacherAssignment.create({
        data: {
          teacherId: teacher.id,
          tenantId: tenant.id,
          grade: 'Year 1',
          section: 'Sec A'
        }
      });
      console.log("Assigned Class Teacher.");
    }
  }
}

main().catch(console.error).finally(() => prisma.$disconnect());
