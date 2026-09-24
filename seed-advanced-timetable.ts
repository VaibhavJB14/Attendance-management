import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  const tenants = await prisma.tenant.findMany();
  if (tenants.length === 0) return;
  const tenant = tenants[0];

  console.log("Wiping existing timetables and course requirements...");
  await prisma.timetable.deleteMany({ where: { tenantId: tenant.id } });
  await prisma.courseRequirement.deleteMany({ where: { tenantId: tenant.id } });

  console.log("Setting up Teachers & Subjects...");
  const subjects = [
    'Mathematics', 'Physics', 'Chemistry', 'Biology', 
    'English', 'Computer Science', 'Physics Lab', 
    'Chemistry Lab', 'Computer Lab', 'PE', 'Library'
  ];

  const teachers: any[] = [];
  for (const subject of subjects) {
    const email = `teacher_${subject.toLowerCase().replace(/ /g, '_')}@demo.com`;
    let user = await prisma.user.findFirst({ where: { email } });
    if (!user) {
      const hashedPassword = await bcrypt.hash('admin123', 10);
      user = await prisma.user.create({
        data: {
          tenantId: tenant.id,
          email,
          hashedPassword,
          role: 'TEACHER',
          teacherProfile: { create: { subject } }
        }
      });
    }
    
    let tp = await prisma.teacherProfile.findUnique({ where: { id: user.id } });
    if (!tp) {
      tp = await prisma.teacherProfile.create({ data: { id: user.id, subject } });
    }
    teachers.push({ id: user.id, subject, email });
  }

  // Time Slots (9:00 AM to 5:00 PM, 45 mins each, with breaks)
  // P1: 09:00-09:45
  // P2: 09:45-10:30
  // Break: 10:30-10:45
  // P3: 10:45-11:30
  // P4: 11:30-12:15
  // Lunch: 12:15-13:00
  // P5: 13:00-13:45
  // P6: 13:45-14:30
  // Break: 14:30-14:45
  // P7: 14:45-15:30
  // P8: 15:30-16:15
  // P9: 16:15-17:00
  const timeSlots = [
    { start: '09:00', end: '09:45' },
    { start: '09:45', end: '10:30' },
    // BREAK
    { start: '10:45', end: '11:30' },
    { start: '11:30', end: '12:15' },
    // LUNCH
    { start: '13:00', end: '13:45' },
    { start: '13:45', end: '14:30' },
    // BREAK
    { start: '14:45', end: '15:30' },
    { start: '15:30', end: '16:15' },
    { start: '16:15', end: '17:00' }
  ];

  const classes = await prisma.schoolClass.findMany({ where: { tenantId: tenant.id } });

  console.log("Generating Timetable...");

  for (const cls of classes) {
    // Add core requirements
    for (const sub of ['Mathematics', 'Physics', 'Chemistry', 'English', 'Computer Science']) {
      const t = teachers.find(t => t.subject === sub);
      if (t) {
        await prisma.courseRequirement.create({
          data: {
            tenantId: tenant.id, grade: cls.grade, section: cls.section,
            subject: sub, periodsPerWeek: 5, teacherId: t.id
          }
        });
      }
    }
    // Add Lab/Extra requirements
    for (const sub of ['Physics Lab', 'Chemistry Lab', 'Computer Lab', 'PE', 'Library']) {
      const t = teachers.find(t => t.subject === sub);
      if (t) {
        await prisma.courseRequirement.create({
          data: {
            tenantId: tenant.id, grade: cls.grade, section: cls.section,
            subject: sub, periodsPerWeek: 2, teacherId: t.id
          }
        });
      }
    }

    // Generate Timetable grid
    for (let day = 1; day <= 5; day++) {
      for (let period = 0; period < 9; period++) {
        const slot = timeSlots[period];
        
        let assignedTeacher;
        
        // Let's add Labs in the afternoon (periods 4, 5) which act as consecutive blocks
        if (period === 4 || period === 5) {
            const labs = ['Physics Lab', 'Chemistry Lab', 'Computer Lab'];
            const labSub = labs[(day + cls.grade.length + cls.section.length) % labs.length];
            assignedTeacher = teachers.find(t => t.subject === labSub);
        } else if (period === 6 || period === 7) {
            const extras = ['PE', 'Library', 'Biology'];
            const extraSub = extras[(day + period) % extras.length];
            assignedTeacher = teachers.find(t => t.subject === extraSub) || teachers[0];
        } else {
            // Morning classes
            const core = ['Mathematics', 'Physics', 'Chemistry', 'English', 'Computer Science'];
            const coreSub = core[(day + period + cls.section.charCodeAt(0)) % core.length];
            assignedTeacher = teachers.find(t => t.subject === coreSub);
        }

        if (assignedTeacher) {
          await prisma.timetable.create({
            data: {
              tenantId: tenant.id,
              grade: cls.grade,
              section: cls.section,
              dayOfWeek: day,
              startTime: slot.start,
              endTime: slot.end,
              subject: assignedTeacher.subject,
              teacherId: assignedTeacher.id
            }
          });
        }
      }
    }
  }

  console.log("Advanced Timetable seeded successfully!");
}

main().catch(console.error).finally(() => prisma.$disconnect());
