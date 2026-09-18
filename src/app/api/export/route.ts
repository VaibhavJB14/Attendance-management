import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getSession } from '@/lib/auth';
import { requirePlan } from '@/lib/featureGuard';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const queryTenantId = searchParams.get('tenantId');
    const studentId = searchParams.get('studentId');
    const hostelName = searchParams.get('hostelName');

    const grade = searchParams.get('grade');
    const section = searchParams.get('section');
    const timeframe = searchParams.get('timeframe');
    const month = searchParams.get('month');
    const year = searchParams.get('year');

    const session = await getSession();
    if (!session?.tenantId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const tenantId = session.tenantId;

    // Verify Plan
    await requirePlan(tenantId, 'BASIC');

    let dateFilter = {};
    const now = new Date();
    
    if (timeframe === 'last_week') {
      const lastWeek = new Date();
      lastWeek.setDate(now.getDate() - 7);
      dateFilter = { gte: lastWeek };
    } else if (timeframe === 'last_month') {
      const lastMonth = new Date();
      lastMonth.setDate(now.getDate() - 30);
      dateFilter = { gte: lastMonth };
    } else if (timeframe === 'specific_month' && month && year) {
      const startOfMonth = new Date(parseInt(year), parseInt(month) - 1, 1);
      const endOfMonth = new Date(parseInt(year), parseInt(month), 0, 23, 59, 59);
      dateFilter = { gte: startOfMonth, lte: endOfMonth };
    } else if (timeframe === 'whole_year') {
      const lastYear = new Date();
      lastYear.setFullYear(now.getFullYear() - 1);
      dateFilter = { gte: lastYear };
    }

    let attendanceRecords: any[];

    if (studentId) {
      // Export single student
      attendanceRecords = await prisma.attendance.findMany({
        where: {
          studentId: studentId,
          student: { tenantId },
          ...(Object.keys(dateFilter).length > 0 ? { date: dateFilter } : {})
        },
        include: {
          student: true
        },
        orderBy: { date: 'desc' }
      });
    } else {
      let studentFilter: any = { tenantId };
      if (hostelName) {
        studentFilter.hostelName = hostelName;
        studentFilter.isHosteler = true;
      }
      if (grade) studentFilter.grade = grade;
      if (section) studentFilter.section = section;

      // Export all students (optionally filtered by hostel, grade, section)
      attendanceRecords = await prisma.attendance.findMany({
        where: {
          student: studentFilter,
          ...(Object.keys(dateFilter).length > 0 ? { date: dateFilter } : {})
        },
        include: {
          student: true
        },
        orderBy: [
          { student: { grade: 'asc' } },
          { student: { section: 'asc' } },
          { student: { firstName: 'asc' } },
          { date: 'desc' }
        ]
      });
    }

    // Generate CSV
    const headers = ['Date', 'Student ID', 'First Name', 'Last Name', 'Grade', 'Section', 'Room', 'Status'];
    const rows = attendanceRecords.map(record => [
      record.date.toISOString().split('T')[0], // YYYY-MM-DD
      record.student.id,
      record.student.firstName,
      record.student.lastName,
      record.student.grade,
      record.student.section,
      record.student.roomNumber || '-',
      record.status
    ]);

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
    ].join('\n');

    // Return as downloadable file
    let fileName = 'attendance_all_students.csv';
    if (studentId) {
      fileName = `attendance_${studentId}.csv`;
    } else if (hostelName) {
      fileName = `attendance_${hostelName.replace(/\s+/g, '_').toLowerCase()}.csv`;
    }

    return new NextResponse(csvContent, {
      headers: {
        'Content-Type': 'text/csv',
        'Content-Disposition': `attachment; filename="${fileName}"`
      }
    });

  } catch (error: any) {
    console.error('Export Error:', error);
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}
