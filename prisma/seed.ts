import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

const mockData = {
  students: {
      'Year 1': {
          'Sec A': [
              { rollNo: '101', name: 'Alex Johnson' },
              { rollNo: '102', name: 'Maria Garcia' },
              { rollNo: '103', name: 'James Smith' },
              { rollNo: '104', name: 'Emily Clark' },
              { rollNo: '105', name: 'Michael Brown' },
              { rollNo: '106', name: 'Samantha Davis' },
              { rollNo: '107', name: 'William Miller' },
              { rollNo: '108', name: 'Olivia Wilson' }
          ],
          'Sec B': [
              { rollNo: '121', name: 'Liam Moore' },
              { rollNo: '122', name: 'Sophia Taylor' },
              { rollNo: '123', name: 'Benjamin Anderson' },
              { rollNo: '124', name: 'Isabella Thomas' },
              { rollNo: '125', name: 'Lucas Jackson' }
          ],
          'Sec C': [
              { rollNo: '141', name: 'Mason White' },
              { rollNo: '142', name: 'Mia Harris' },
              { rollNo: '143', name: 'Ethan Martin' }
          ],
          'Sec D': [
              { rollNo: '161', name: 'Alexander Thompson' },
              { rollNo: '162', name: 'Charlotte Garcia' }
          ]
      },
      'Year 2': {
          'Sec A': [
              { rollNo: '201', name: 'Linda Martinez' },
              { rollNo: '202', name: 'David Lee' },
              { rollNo: '203', name: 'Sarah Connor' },
              { rollNo: '204', name: 'Daniel Rodriguez' }
          ],
          'Sec B': [
              { rollNo: '221', name: 'Matthew Lewis' },
              { rollNo: '222', name: 'Chloe Walker' },
              { rollNo: '223', name: 'Joseph Hall' }
          ],
          'Sec C': [
              { rollNo: '241', name: 'John Doe' },
              { rollNo: '242', name: 'Grace Allen' },
              { rollNo: '243', name: 'Samuel Young' }
          ],
          'Sec D': [
              { rollNo: '261', name: 'Jane Smith' },
              { rollNo: '262', name: 'Anthony King' },
              { rollNo: '263', name: 'Lily Wright' }
          ]
      }
  },
  users: [
      { username: 'admin', email: 'admin@system.com', password: 'admin123', role: 'SYSTEM_ADMIN', name: 'System Admin' },
      { username: 'teacher1', email: 'teacher1@demo.com', password: 'admin123', role: 'TEACHER', name: 'Mr. Smith', domain: 'Year 1 - Sec A' },
      { username: 'warden', email: 'warden@system.com', password: 'admin123', role: 'WARDEN', name: 'Warden Patel', domain: 'Boys Hostel' },
      { username: 'parent', email: 'parent@demo.com', password: 'admin123', role: 'PARENT', name: 'Parent Demo', domain: 'Parent Portal' }
  ]
};

async function main() {
  console.log('Starting DB Seed...');

  // 1. Create Default Tenant
  const tenant = await prisma.tenant.create({
    data: {
      name: 'Demo School',
      domain: 'demo.com',
      plan: 'ADVANCE',
    },
  });

  console.log(`Created Tenant: ${tenant.name} (${tenant.id})`);

  // 2. Create Users
  for (const u of mockData.users) {
    const hashedPassword = await bcrypt.hash(u.password, 10);
    const userData: any = {
      tenantId: tenant.id,
      email: u.email,
      hashedPassword,
      role: u.role,
    };

    if (u.role === 'TEACHER') {
      userData.teacherProfile = {
        create: {}
      };
    }

    await prisma.user.create({
      data: userData,
    });
  }

  console.log('Created Users.');

  // 3. Create Students and link the first one to the Parent
  let studentCount = 0;
  let firstStudentId: string | null = null;

  for (const [grade, sections] of Object.entries(mockData.students)) {
    for (const [section, students] of Object.entries(sections)) {
      for (const student of students) {
        const parts = student.name.split(' ');
        const firstName = parts[0];
        const lastName = parts.slice(1).join(' ') || 'N/A';

        const createdStudent = await prisma.student.create({
          data: {
            tenantId: tenant.id,
            firstName,
            lastName,
            grade,
            section,
            enrollmentDate: new Date(),
          },
        });
        
        if (!firstStudentId) {
          firstStudentId = createdStudent.id;
        }
        
        studentCount++;
      }
    }
  }

  // Find the Parent user and link the first student
  const parentUser = await prisma.user.findFirst({ where: { role: 'PARENT' } });
  if (parentUser && firstStudentId) {
    await prisma.parentProfile.create({
      data: {
        id: parentUser.id,
        students: {
          connect: { id: firstStudentId }
        }
      }
    });
    console.log(`Linked Student to Parent Demo.`);
  }

  console.log(`Created ${studentCount} Students.`);

  // 4. Create SchoolClasses based on mockData
  let classCount = 0;
  for (const [grade, sections] of Object.entries(mockData.students)) {
    for (const section of Object.keys(sections)) {
      await prisma.schoolClass.create({
        data: {
          tenantId: tenant.id,
          grade,
          section,
        }
      });
      classCount++;
    }
  }
  console.log(`Created ${classCount} SchoolClasses.`);

  console.log('Seeding Complete!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
