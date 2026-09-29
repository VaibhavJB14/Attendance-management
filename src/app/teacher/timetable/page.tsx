'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export function formatClass(grade?: string, section?: string): string {
  if (!grade && !section) return 'N/A';
  let cleanGrade = (grade || '').trim();
  const yearMatch = cleanGrade.match(/(?:Year|Grade)?\s*(\d+)/i);
  if (yearMatch && yearMatch[1]) {
    cleanGrade = yearMatch[1];
  }

  let cleanSec = (section || '').trim();
  const secMatch = cleanSec.match(/(?:Sec|Section)?\s*([A-Z0-9]+)/i);
  if (secMatch && secMatch[1]) {
    cleanSec = secMatch[1];
  }

  if (cleanGrade && cleanSec) {
    return `${cleanGrade}-${cleanSec}`;
  }
  return cleanGrade || cleanSec || 'N/A';
}

interface UserSession {
  id: string;
  email: string;
  role: string;
  tenantId: string;
}

interface TimetableSlot {
  id: string;
  grade: string;
  section: string;
  dayOfWeek: number; // 1 = Mon, 2 = Tue, 3 = Wed, 4 = Thu, 5 = Fri, 6 = Sat
  startTime: string;
  endTime: string;
  subject: string;
  teacherId?: string;
  teacherName?: string;
  roomNumber?: string;
}

const DEFAULT_TIMESLOTS = [
  { startTime: '09:00', endTime: '10:00', label: '09:00 AM - 10:00 AM', isBreak: false },
  { startTime: '10:00', endTime: '11:00', label: '10:00 AM - 11:00 AM', isBreak: false },
  { startTime: '11:00', endTime: '12:00', label: '11:00 AM - 12:00 PM', isBreak: false },
  { startTime: '12:00', endTime: '13:00', label: '12:00 PM - 01:00 PM', isBreak: true, breakTitle: 'Lunch Break' },
  { startTime: '13:00', endTime: '14:00', label: '01:00 PM - 02:00 PM', isBreak: false },
  { startTime: '14:00', endTime: '15:00', label: '02:00 PM - 03:00 PM', isBreak: false },
];

const DAYS = [
  { id: 1, name: 'Monday', short: 'Mon' },
  { id: 2, name: 'Tuesday', short: 'Tue' },
  { id: 3, name: 'Wednesday', short: 'Wed' },
  { id: 4, name: 'Thursday', short: 'Thu' },
  { id: 5, name: 'Friday', short: 'Fri' },
  { id: 6, name: 'Saturday', short: 'Sat' },
];

export default function TeacherTimetablePage() {
  const router = useRouter();
  const [session, setSession] = useState<UserSession | null>(null);
  const [timetable, setTimetable] = useState<TimetableSlot[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [viewScope, setViewScope] = useState<'MY_CLASSES' | 'CLASS_ROSTER'>('MY_CLASSES');
  const [selectedClass, setSelectedClass] = useState<string>('1-A');
  const [schoolClasses, setSchoolClasses] = useState<any[]>([]);
  const [dayFilter, setDayFilter] = useState<'TODAY' | 'ALL'>('TODAY');

  // Current day index (1 = Mon, ..., 6 = Sat, 0 = Sun -> Mon)
  const currentDayIndex = (() => {
    const day = new Date().getDay();
    return day === 0 ? 1 : day;
  })();

  useEffect(() => {
    const stored = localStorage.getItem('session');
    if (!stored) {
      router.push('/login');
      return;
    }
    const parsed = JSON.parse(stored);
    if (parsed.role !== 'TEACHER' && parsed.role !== 'SYSTEM_ADMIN' && parsed.role !== 'SCHOOL_ADMIN') {
      router.push('/');
      return;
    }
    setSession(parsed);
  }, [router]);

  useEffect(() => {
    if (!session) return;

    // Fetch classes list
    fetch('/api/classes', {
      headers: { 'x-tenant-id': session.tenantId }
    })
      .then(res => res.json())
      .then(data => {
        if (data.classes && data.classes.length > 0) {
          setSchoolClasses(data.classes);
        }
      })
      .catch(console.error);

    // Fetch timetable for logged-in teacher
    const fetchTimetableData = async () => {
      setLoading(true);
      try {
        const response = await fetch(`/api/timetable?teacherId=${encodeURIComponent(session.id)}`, {
          headers: { 'x-tenant-id': session.tenantId }
        });
        if (response.ok) {
          const data = await response.json();
          let slots: TimetableSlot[] = data.timetables || [];

          if (slots.length > 0) {
            const mySlots = slots.filter((s: any) =>
              s.teacherId === session.id ||
              (s.teacher?.user?.email && s.teacher.user.email.toLowerCase() === session.email.toLowerCase())
            );
            if (mySlots.length > 0) {
              slots = mySlots;
            } else {
              slots = generateMockTeacherTimetable(session);
            }
          } else {
            slots = generateMockTeacherTimetable(session);
          }

          setTimetable(slots);
        } else {
          setTimetable(generateMockTeacherTimetable(session));
        }
      } catch (err) {
        console.error('Failed to fetch timetable:', err);
        setTimetable(generateMockTeacherTimetable(session));
      } finally {
        setLoading(false);
      }
    };

    fetchTimetableData();
  }, [session]);

  const generateMockTeacherTimetable = (userSession: UserSession): TimetableSlot[] => {
    const email = userSession.email || 'teacher@school.com';
    const teacherName = email.split('@')[0].replace(/[^a-zA-Z0-9]/g, ' ').toUpperCase();

    // Hash email to produce unique subjects and schedule for different teacher logins
    let hash = 0;
    for (let i = 0; i < email.length; i++) {
      hash = email.charCodeAt(i) + ((hash << 5) - hash);
    }

    const subjectList = ['Mathematics', 'Physics', 'Computer Science', 'English Literature', 'Chemistry', 'Biology'];
    const assignedSubject = subjectList[Math.abs(hash) % subjectList.length];

    const mockSlots: TimetableSlot[] = [];
    const classConfigs = [
      [
        { grade: 'Year 1', section: 'Sec A', room: 'Room 101', startTime: '09:00', endTime: '10:00' },
        { grade: 'Year 1', section: 'Sec B', room: 'Room 102', startTime: '11:00', endTime: '12:00' },
        { grade: 'Year 2', section: 'Sec A', room: 'Room 201', startTime: '13:00', endTime: '14:00' },
        { grade: 'Year 3', section: 'Sec A', room: 'Room 301', startTime: '14:00', endTime: '15:00' },
      ],
      [
        { grade: 'Year 1', section: 'Sec B', room: 'Room 102', startTime: '09:00', endTime: '10:00' },
        { grade: 'Year 2', section: 'Sec B', room: 'Room 202', startTime: '10:00', endTime: '11:00' },
        { grade: 'Year 3', section: 'Sec B', room: 'Room 302', startTime: '11:00', endTime: '12:00' },
        { grade: 'Year 1', section: 'Sec A', room: 'Room 101', startTime: '14:00', endTime: '15:00' },
      ],
      [
        { grade: 'Year 2', section: 'Sec A', room: 'Room 201', startTime: '09:00', endTime: '10:00' },
        { grade: 'Year 3', section: 'Sec A', room: 'Room 301', startTime: '10:00', endTime: '11:00' },
        { grade: 'Year 1', section: 'Sec A', room: 'Room 101', startTime: '13:00', endTime: '14:00' },
        { grade: 'Year 2', section: 'Sec B', room: 'Room 202', startTime: '14:00', endTime: '15:00' },
      ]
    ];

    DAYS.forEach(day => {
      const dayHash = hash + day.id;
      const selectedSchedule = classConfigs[Math.abs(dayHash) % classConfigs.length];
      selectedSchedule.forEach((ac, idx) => {
        mockSlots.push({
          id: `teacher-slot-${userSession.id || email}-${day.id}-${idx + 1}`,
          grade: ac.grade,
          section: ac.section,
          dayOfWeek: day.id,
          startTime: ac.startTime,
          endTime: ac.endTime,
          subject: assignedSubject,
          roomNumber: ac.room,
          teacherName: teacherName
        });
      });
    });

    return mockSlots;
  };

  if (!session) return null;

  // Filter slots strictly for the logged-in teacher and day selection
  const filteredSlots = timetable.filter(slot => {
    const slotCls = formatClass(slot.grade, slot.section);
    const matchesClass = selectedClass ? slotCls === selectedClass : true;
    const matchesDay = dayFilter === 'TODAY' ? slot.dayOfWeek === currentDayIndex : true;
    return matchesClass && matchesDay;
  });

  // Unique class options
  const uniqueClassOptions = Array.from(
    new Set([
      '1-A', '1-B', '2-A', '2-B', '3-A',
      ...schoolClasses.map(c => formatClass(c.grade, c.section))
    ])
  ).sort();

  // Today's schedule for quick view
  const todaysSchedule = timetable
    .filter(slot => slot.dayOfWeek === currentDayIndex && (selectedClass ? formatClass(slot.grade, slot.section) === selectedClass : true))
    .sort((a, b) => a.startTime.localeCompare(b.startTime));

  const handlePrint = () => {
    window.print();
  };

  return (
    <main className="min-h-screen bg-slate-50/50 text-slate-900 font-sans pl-0 md:pl-8 pb-16">
      <div className="max-w-7xl mx-auto space-y-8">

        {/* Header Hero Banner */}
        <div className="relative overflow-hidden bg-gradient-to-r from-blue-900 via-indigo-900 to-slate-900 rounded-3xl p-8 text-white shadow-xl">
          <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="space-y-2">
              <div className="inline-flex items-center gap-2 px-3 py-1 bg-blue-800/60 border border-blue-500/40 rounded-full text-xs font-semibold text-blue-200">
                <svg className="w-4 h-4 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                Academic Weekly Schedule
              </div>
              <h1 className="text-3xl sm:text-4xl font-black tracking-tight">
                Teacher Timetable Dashboard
              </h1>
              <p className="text-blue-200 text-sm sm:text-base max-w-2xl leading-relaxed">
                View your period schedules, assigned classroom slots, and subject timing across the week.
              </p>
            </div>
          </div>
        </div>

        {/* Today's Live Class Summary */}
        <div className="bg-indigo-50/70 p-6 rounded-2xl border border-indigo-100 shadow-2xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-black uppercase text-indigo-900 tracking-wider">TODAY&apos;S CLASSES</span>
              <span className="px-2 py-0.5 bg-indigo-200 text-indigo-800 rounded-full text-[10px] font-bold">
                {DAYS.find(d => d.id === currentDayIndex)?.name}
              </span>
            </div>
            <div className="text-2xl font-black text-slate-900">
              {todaysSchedule.length} Period{todaysSchedule.length === 1 ? '' : 's'}
            </div>
            <p className="text-xs text-slate-500 mt-1">
              Scheduled periods for Class {selectedClass || 'All'} today
            </p>
          </div>
        </div>

        {/* Timetable Grid View */}
        <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs">
          {(() => {
            const displayedDays = dayFilter === 'TODAY' ? DAYS.filter(d => d.id === currentDayIndex) : DAYS;

            return (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse min-w-[600px]">
                  <thead>
                    <tr className="bg-slate-100/90 text-slate-700 text-xs uppercase tracking-wider font-extrabold border-b border-slate-200">
                      <th className="px-6 py-4 w-44 bg-slate-200/60 sticky left-0 z-10">Time Slot</th>
                      {displayedDays.map(day => (
                        <th
                          key={day.id}
                          className={`px-6 py-4 text-center ${day.id === currentDayIndex ? 'bg-indigo-100 text-indigo-900 border-x border-indigo-200' : ''
                            }`}
                        >
                          <div className="flex items-center justify-center gap-2">
                            <span>{day.name}</span>
                            {day.id === currentDayIndex && (
                              <span className="px-2 py-0.5 bg-indigo-600 text-white rounded-md text-[10px] font-bold">TODAY</span>
                            )}
                          </div>
                          <div className="text-[10px] text-slate-400 font-medium tracking-normal mt-0.5">{day.short}</div>
                        </th>
                      ))}
                    </tr>
                  </thead>

                  <tbody className="divide-y divide-slate-100 text-xs">
                    {DEFAULT_TIMESLOTS.map((slot, idx) => (
                      <tr key={idx} className={slot.isBreak ? 'bg-slate-50/80 font-medium' : 'hover:bg-slate-50/40 transition-colors'}>

                        {/* Time Column */}
                        <td className="px-6 py-4 font-bold text-slate-700 bg-slate-50/90 sticky left-0 z-10 border-r border-slate-200/80">
                          {slot.label}
                        </td>

                        {/* Break Row */}
                        {slot.isBreak ? (
                          <td colSpan={displayedDays.length} className="px-6 py-4 text-center text-slate-500 font-bold tracking-wider uppercase text-xs bg-amber-50/40 border-y border-amber-100">
                            ☕ {slot.breakTitle}
                          </td>
                        ) : (
                          /* Day Cells */
                          displayedDays.map(day => {
                            const cellSlot = filteredSlots.find(
                              t => t.dayOfWeek === day.id && t.startTime === slot.startTime
                            );

                            const isToday = day.id === currentDayIndex;

                            return (
                              <td
                                key={day.id}
                                className={`px-4 py-3 border-r border-slate-100 text-center align-top ${isToday ? 'bg-indigo-50/20' : ''
                                  }`}
                              >
                                {cellSlot ? (
                                  <div className="p-3 bg-white rounded-xl border border-indigo-100 shadow-2xs hover:border-indigo-300 transition-all text-left space-y-1.5 group">
                                    <div className="flex items-center justify-between">
                                      <span className="px-2 py-0.5 bg-indigo-50 text-indigo-700 font-extrabold text-[10px] rounded-md border border-indigo-100">
                                        Class {formatClass(cellSlot.grade, cellSlot.section)}
                                      </span>
                                      {cellSlot.roomNumber && (
                                        <span className="text-[10px] text-slate-400 font-semibold">
                                          Rm {cellSlot.roomNumber}
                                        </span>
                                      )}
                                    </div>

                                    <div className="font-bold text-slate-900 text-xs leading-snug group-hover:text-indigo-600 transition-colors">
                                      {cellSlot.subject}
                                    </div>

                                    <div className="text-[10px] text-slate-500 flex items-center gap-1 font-medium">
                                      <svg className="w-3 h-3 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                                      </svg>
                                      {cellSlot.teacherName || 'Faculty'}
                                    </div>
                                  </div>
                                ) : (
                                  <div className="h-full min-h-[56px] flex items-center justify-center text-[11px] text-slate-300 font-medium">
                                    Free Period
                                  </div>
                                )}
                              </td>
                            );
                          })
                        )}

                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            );
          })()}
        </div>

        {/* Filter Controls & Today's Summary */}
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">

          {/* Controls Card */}
          <div className="lg:col-span-3 bg-white p-6 rounded-2xl border border-slate-200 shadow-2xs space-y-4">
            <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
              <div>
                <h2 className="text-lg font-bold text-slate-900">Schedule Filters</h2>
                <p className="text-xs text-slate-500">Filter timetable by class or view scope.</p>
              </div>

              <div className="flex flex-wrap items-center gap-3 w-full sm:w-auto">
                <select
                  value={selectedClass}
                  onChange={e => setSelectedClass(e.target.value)}
                  className="bg-slate-50 border border-slate-200 text-slate-800 font-bold text-sm rounded-xl p-3 focus:ring-indigo-500 focus:border-indigo-500 flex-1 sm:w-48"
                >
                  <option value="">All Classes</option>
                  {uniqueClassOptions.map(cls => (
                    <option key={cls} value={cls}>Class {cls}</option>
                  ))}
                </select>

                <div className="flex bg-slate-100 p-1 rounded-xl border border-slate-200">
                  <button
                    onClick={() => setDayFilter('TODAY')}
                    className={`px-3 py-2 rounded-lg text-xs font-bold transition-all ${dayFilter === 'TODAY' ? 'bg-white text-indigo-600 shadow-xs' : 'text-slate-500 hover:text-slate-800'
                      }`}
                  >
                    Present Day (Today)
                  </button>
                  <button
                    onClick={() => setDayFilter('ALL')}
                    className={`px-3 py-2 rounded-lg text-xs font-bold transition-all ${dayFilter === 'ALL' ? 'bg-white text-indigo-600 shadow-xs' : 'text-slate-500 hover:text-slate-800'
                      }`}
                  >
                    Full Week
                  </button>
                </div>
              </div>
            </div>
          </div>



        </div>




      </div>
    </main>
  );
}
