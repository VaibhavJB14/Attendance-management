import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  const tenants = await prisma.tenant.findMany();
  if (tenants.length === 0) return;
  const tenant = tenants[0];

  console.log("Seeding Timetable and Teachers...");

  // 1. Create multiple teachers for different subjects
  const subjects = ['Mathematics', 'Science', 'English', 'History', 'Computer Science'];
  const teachers = [];

  for (let i = 0; i < subjects.length; i++) {
    const subject = subjects[i];
    const email = `teacher_${subject.toLowerCase().replace(' ', '_')}@demo.com`;
    
    let user = await prisma.user.findFirst({ where: { email } });
    if (!user) {
      const hashedPassword = await bcrypt.hash('admin123', 10);
      user = await prisma.user.create({
        data: {
          tenantId: tenant.id,
          email,
          hashedPassword,
          role: 'TEACHER',
          teacherProfile: {
            create: { subject }
          }
        }
      });
      console.log(`Created teacher for ${subject}: ${email}`);
    }
    
    // Ensure teacher profile exists
    const tp = await prisma.teacherProfile.findUnique({ where: { id: user.id } });
    if (!tp) {
      await prisma.teacherProfile.create({ data: { id: user.id, subject } });
    }
    teachers.push({ id: user.id, subject });
  }

  const classes = await prisma.schoolClass.findMany({ where: { tenantId: tenant.id } });
  
  // 2. Create Course Requirements and Timetables
  for (const cls of classes) {
    for (const t of teachers) {
      // Course Requirement
      const reqExists = await prisma.courseRequirement.findFirst({
        where: { tenantId: tenant.id, grade: cls.grade, section: cls.section, subject: t.subject }
      });
      if (!reqExists) {
        await prisma.courseRequirement.create({
          data: {
            tenantId: tenant.id,
            grade: cls.grade,
            section: cls.section,
            subject: t.subject,
            periodsPerWeek: 5,
            teacherId: t.id
          }
        });
      }
    }

    // Timetable Generation (Mon-Fri)
    // We'll give 5 periods a day: 
    // 09:00-10:00, 10:00-11:00, 11:30-12:30, 13:30-14:30, 14:30-15:30
    const timeSlots = [
      { start: '09:00', end: '10:00' },
      { start: '10:00', end: '11:00' },
      { start: '11:30', end: '12:30' },
      { start: '13:30', end: '14:30' },
      { start: '14:30', end: '15:30' }
    ];

    for (let day = 1; day <= 5; day++) {
      for (let period = 0; period < 5; period++) {
        const teacher = teachers[(period + day) % teachers.length]; // cycle through teachers
        const slot = timeSlots[period];

        const ttExists = await prisma.timetable.findFirst({
          where: {
            tenantId: tenant.id, grade: cls.grade, section: cls.section,
            dayOfWeek: day, startTime: slot.start
          }
        });

        if (!ttExists) {
          await prisma.timetable.create({
            data: {
              tenantId: tenant.id,
              grade: cls.grade,
              section: cls.section,
              dayOfWeek: day,
              startTime: slot.start,
              endTime: slot.end,
              subject: teacher.subject,
              teacherId: teacher.id
            }
          });
        }
      }
    }
  }

  console.log("Successfully seeded Timetables and Course Requirements for all sections!");
}

main().catch(console.error).finally(() => prisma.$disconnect());
