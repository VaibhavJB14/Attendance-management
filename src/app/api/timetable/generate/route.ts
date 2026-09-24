export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getSession } from '@/lib/auth';
import { requirePlan } from '@/lib/featureGuard';

export async function POST(request: Request) {
  try {
    const session = await getSession();
    if (!session?.tenantId || (session.role !== 'SYSTEM_ADMIN' && session.role !== 'SCHOOL_ADMIN')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const tenantId = session.tenantId;
    await requirePlan(tenantId, 'PRO');
    const body = await request.json().catch(() => ({}));
    const { grade, section } = body;
    
    if (!grade || !section) {
      return NextResponse.json({ error: 'Grade and section are required' }, { status: 400 });
    }

    // 1. Fetch dynamic timeslots for this tenant
    const timeslots = await prisma.timeslot.findMany({
      where: { tenantId },
      orderBy: { startTime: 'asc' }
    });
    
    if (timeslots.length === 0) {
      return NextResponse.json({ error: 'Please set up Timetable Slots first in the settings tab.' }, { status: 400 });
    }
    
    const PERIODS = timeslots.map(ts => ({ start: ts.startTime, end: ts.endTime }));
    const DAYS = [1, 2, 3, 4, 5];

    // 2. Clear existing timetable ONLY for this specific grade and section
    await prisma.timetable.deleteMany({
      where: { tenantId, grade, section }
    });

    // 3. Fetch requirements ONLY for this grade and section
    const requirements = await prisma.courseRequirement.findMany({
      where: { tenantId, grade, section },
      orderBy: { periodsPerWeek: 'desc' } // Schedule hardest constraints first
    });

    // We will keep an in-memory ledger of teacher assignments to prevent double-booking
    // Map of "Day_StartTime" -> Set of teacherIds busy at that time
    const teacherBusyMap = new Map<string, Set<string>>();

    // Load existing timetables from OTHER sections to prevent teacher overlap
    const existingTimetables = await prisma.timetable.findMany({
      where: { tenantId } // (The current section's timetable was already deleted)
    });

    for (const tt of existingTimetables) {
      const timeKey = `${tt.dayOfWeek}_${tt.startTime}`;
      if (!teacherBusyMap.has(timeKey)) {
        teacherBusyMap.set(timeKey, new Set());
      }
      teacherBusyMap.get(timeKey)!.add(tt.teacherId);
    }

    // Map of "TeacherId_Day" -> Set of Period Indices assigned
    const teacherPeriodsMap = new Map<string, Set<number>>();

    // Keep track of assignments to push to DB
    const newTimetables: any[] = [];

    // 3. Scheduling Algorithm (Greedy approach)
    for (const req of requirements) {
      let periodsAssigned = 0;

      let attempts = 0;
      const subjectPeriodsPerDay = new Map<number, number>();

      while (periodsAssigned < req.periodsPerWeek && attempts < 50) {
        attempts++;

        // Shuffle days to prevent Monday bias
        const shuffledDays = [...DAYS].sort(() => Math.random() - 0.5);

        for (const day of shuffledDays) {
          if (periodsAssigned >= req.periodsPerWeek) break;

          const isLab = req.subject.toLowerCase().includes('lab');
          const maxPeriodsForThisDay = isLab ? 2 : Math.ceil(req.periodsPerWeek / DAYS.length);
          
          if ((subjectPeriodsPerDay.get(day) || 0) >= maxPeriodsForThisDay) continue;

          // Shuffle periods to prevent vertical striping (e.g. Math always at 9am)
          const shuffledPeriodIndices = Array.from({ length: PERIODS.length }, (_, i) => i).sort(() => Math.random() - 0.5);

          for (const periodIndex of shuffledPeriodIndices) {
            if (periodsAssigned >= req.periodsPerWeek) break;
            if ((subjectPeriodsPerDay.get(day) || 0) >= maxPeriodsForThisDay) break;

            const period = PERIODS[periodIndex];
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
              (testSet.has(2) && testSet.has(3) && testSet.has(4)) ||
              (testSet.has(3) && testSet.has(4) && testSet.has(5)) ||
              (testSet.has(4) && testSet.has(5) && testSet.has(6)) ||
              (testSet.has(5) && testSet.has(6) && testSet.has(7)) ||
              (testSet.has(6) && testSet.has(7) && testSet.has(8));

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
                subjectPeriodsPerDay.set(day, (subjectPeriodsPerDay.get(day) || 0) + 1);

                if (!isLab) {
                  break; // Force spread across days for normal subjects
                }
              }
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
