const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function main() {
  const tenant = await prisma.tenant.findFirst();
  if (!tenant) {
    console.log("No tenant found. Please run the main seed script first.");
    return;
  }

  const phone = "+19999999999";
  const rollNumber = "DEMO123";

  // Check if parent already exists
  let parentUser = await prisma.user.findFirst({
    where: { email: phone }
  });

  if (!parentUser) {
    const hashedPassword = await bcrypt.hash(rollNumber, 10);
    parentUser = await prisma.user.create({
      data: {
        tenantId: tenant.id,
        email: phone,
        hashedPassword,
        role: 'PARENT',
        parentProfile: {
          create: {}
        }
      }
    });
    console.log("Created Parent User:", phone);
  } else {
    console.log("Parent User already exists:", phone);
  }

  // Create Student
  let student = await prisma.student.findFirst({
    where: { rollNumber }
  });

  if (!student) {
    student = await prisma.student.create({
      data: {
        tenantId: tenant.id,
        firstName: "Demo",
        lastName: "Student",
        grade: "Year 2",
        section: "Sec A",
        enrollmentDate: new Date(),
        rollNumber: rollNumber,
        parentPhone: phone,
        parentId: parentUser.id
      }
    });
    console.log("Created Demo Student");
  } else {
    console.log("Demo Student already exists");
  }

  // Add Attendance
  const existingAtt = await prisma.attendance.findFirst({ where: { studentId: student.id } });
  if (!existingAtt) {
    const dates = [
      new Date(Date.now() - 86400000 * 1), // yesterday
      new Date(Date.now() - 86400000 * 2),
      new Date(Date.now() - 86400000 * 3),
      new Date(Date.now() - 86400000 * 4),
      new Date(Date.now() - 86400000 * 5),
    ];
    for (const d of dates) {
      await prisma.attendance.create({
        data: {
          studentId: student.id,
          date: d,
          sessionName: "Morning (8-12)",
          status: Math.random() > 0.2 ? 'PRESENT' : 'ABSENT',
          recordedBy: "demo-system"
        }
      });
    }
    console.log("Created Attendance");
  }

  // Add Marks
  const existingMarks = await prisma.mark.findFirst({ where: { studentId: student.id } });
  if (!existingMarks) {
    const subjects = ['Mathematics', 'Science', 'English', 'History'];
    for (const sub of subjects) {
      await prisma.mark.create({
        data: {
          studentId: student.id,
          subject: sub,
          score: Math.floor(Math.random() * 20) + 80, // 80-100
          maxScore: 100,
          examName: 'Midterm 2026',
        }
      });
    }
    console.log("Created Marks");
  }

  // Add Document
  const existingDoc = await prisma.document.findFirst({ where: { studentId: student.id } });
  if (!existingDoc) {
    await prisma.document.create({
      data: {
        tenantId: tenant.id,
        studentId: student.id,
        title: "Previous Year Marks Card",
        fileUrl: "/demo/marks-card.pdf", // dummy url
        uploadedBy: parentUser.id
      }
    });
    console.log("Created Document");
  }
}

main()
  .catch(e => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
