import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getSession } from '@/lib/auth';
import { requirePlan } from '@/lib/featureGuard';

// Standard college timeslots: 5 periods a day, Monday to Friday (1-5)
const DAYS = [1, 2, 3, 4, 5]; 
const PERIODS = [
  { start: "09:00", end: "10:00" },
  { start: "10:00", end: "11:00" },
  { start: "11:30", end: "12:30" }, // After break
  { start: "13:30", end: "14:30" }, // After lunch
  { start: "14:30", end: "15:30" },
];

export async function POST(request: Request) {
  try {
    const session = await getSession();
    if (!session?.tenantId || (session.role !== 'SYSTEM_ADMIN' && session.role !== 'SCHOOL_ADMIN')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const tenantId = session.tenantId;
    await requirePlan(tenantId, 'PRO');

    // 1. Clear existing timetable for this tenant to regenerate from scratch
    // In a real app, you might only regenerate for a specific grade/section, but we do full reset here for simplicity.
    await prisma.timetable.deleteMany({
      where: { tenantId }
    });

    // 2. Fetch all requirements for the tenant
    const requirements = await prisma.courseRequirement.findMany({
      where: { tenantId },
      orderBy: { periodsPerWeek: 'desc' } // Schedule hardest constraints first
    });

    // We will keep an in-memory ledger of teacher assignments to prevent double-booking
    // Map of "Day_StartTime" -> Set of teacherIds busy at that time
    const teacherBusyMap = new Map<string, Set<string>>();

    // Map of "TeacherId_Day" -> Set of Period Indices assigned
    const teacherPeriodsMap = new Map<string, Set<number>>();

    // Keep track of assignments to push to DB
    const newTimetables: any[] = [];

    // 3. Scheduling Algorithm (Greedy approach)
    for (const req of requirements) {
      let periodsAssigned = 0;

      // Try to assign the required number of periods
      for (const day of DAYS) {
        if (periodsAssigned >= req.periodsPerWeek) break;

        for (let periodIndex = 0; periodIndex < PERIODS.length; periodIndex++) {
          const period = PERIODS[periodIndex];
          if (periodsAssigned >= req.periodsPerWeek) break;

          const timeKey = `${day}_${period.start}`;
          
          if (!teacherBusyMap.has(timeKey)) {
            teacherBusyMap.set(timeKey, new Set());
          }

          const busyTeachers = teacherBusyMap.get(timeKey)!;

          const teacherDayKey = `${req.teacherId}_${day}`;
          if (!teacherPeriodsMap.has(teacherDayKey)) {
            teacherPeriodsMap.set(teacherDayKey, new Set());
          }
          const teacherPeriods = teacherPeriodsMap.get(teacherDayKey)!;

          // Check if adding this periodIndex would create 3 consecutive periods
          const testSet = new Set(teacherPeriods);
          testSet.add(periodIndex);
          const wouldHaveThreeConsecutive = 
            (testSet.has(0) && testSet.has(1) && testSet.has(2)) ||
            (testSet.has(1) && testSet.has(2) && testSet.has(3)) ||
            (testSet.has(2) && testSet.has(3) && testSet.has(4));

          if (wouldHaveThreeConsecutive) {
            continue; // Skip this period, it violates the 2-consecutive max rule
          }

          // Check if this teacher is already teaching another section at this exact time
          if (!busyTeachers.has(req.teacherId)) {
            
            // Check if this specific grade & section already has a class at this time
            const classHasClass = newTimetables.some(
              t => t.grade === req.grade && t.section === req.section && t.dayOfWeek === day && t.startTime === period.start
            );

            if (!classHasClass) {
              // Valid slot! Assign it.
              busyTeachers.add(req.teacherId);
              teacherPeriods.add(periodIndex);
              newTimetables.push({
                tenantId,
                grade: req.grade,
                section: req.section,
                dayOfWeek: day,
                startTime: period.start,
                endTime: period.end,
                subject: req.subject,
                teacherId: req.teacherId
              });
              periodsAssigned++;
            }
          }
        }
      }

      if (periodsAssigned < req.periodsPerWeek) {
        console.warn(`Could not fulfill requirement for ${req.grade} ${req.section} ${req.subject}. Wanted ${req.periodsPerWeek}, got ${periodsAssigned}. Schedule is too tight!`);
      }
    }

    // 4. Save to Database
    if (newTimetables.length > 0) {
      await prisma.timetable.createMany({
        data: newTimetables
      });
    }

    return NextResponse.json({ 
      success: true, 
      generatedCount: newTimetables.length,
      message: `Successfully generated ${newTimetables.length} timetable slots.`
    });

  } catch (error: any) {
    console.error('API Error:', error);
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}
