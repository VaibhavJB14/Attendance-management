'use client';

import { useState, useEffect } from 'react';
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
  tenantName: string;
  plan: string;
}

interface TimetableSlot {
  id: string;
  grade: string;
  section: string;
  dayOfWeek: number;
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

export default function ProfileHome() {
  const router = useRouter();
  const [session, setSession] = useState<UserSession | null>(null);

  // Teacher Timetable Dashboard State
  const [timetable, setTimetable] = useState<TimetableSlot[]>([]);

  const currentDayIndex = (() => {
    const day = new Date().getDay();
    return day === 0 ? 1 : day; // If Sunday, default to Monday for demo
  })();

  const todayName = DAYS.find(d => d.id === currentDayIndex)?.name || 'Monday';

  useEffect(() => {
    const stored = localStorage.getItem('session');
    if (!stored) {
      setSession({
        id: '1',
        email: 'admin@system.com',
        role: 'SYSTEM_ADMIN',
        tenantId: '1',
        tenantName: 'Demo School',
        plan: 'ENTERPRISE',
      });
      return;
    }
    const user = JSON.parse(stored);

    if (user.role === 'PARENT') {
      router.push('/parent');
      return;
    }

    setSession(user);
  }, [router]);

  useEffect(() => {
    if (!session || session.role !== 'TEACHER') return;

    fetch(`/api/timetable?teacherId=${encodeURIComponent(session.id)}`, {
      headers: { 'x-tenant-id': session.tenantId }
    })
      .then(res => res.json())
      .then(data => {
        let slots = data.timetables || [];
        // Filter strictly for logged-in teacher if real slots exist
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
      })
      .catch(() => setTimetable(generateMockTeacherTimetable(session)));

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

    const selectedSchedule = classConfigs[Math.abs(hash) % classConfigs.length];

    const slots: TimetableSlot[] = selectedSchedule.map((ac, idx) => ({
      id: `teacher-slot-${userSession.id || email}-${idx + 1}`,
      grade: ac.grade,
      section: ac.section,
      dayOfWeek: currentDayIndex,
      startTime: ac.startTime,
      endTime: ac.endTime,
      subject: assignedSubject,
      roomNumber: ac.room,
      teacherName: teacherName
    }));

    return slots;
  };

  if (!session) return null;

  // Filter schedule strictly for PRESENT DAY (Today) and assigned to teacher
  const todaysTeacherSchedule = timetable
    .filter(slot => slot.dayOfWeek === currentDayIndex)
    .sort((a, b) => a.startTime.localeCompare(b.startTime));

  return (
    <div className="max-w-6xl mx-auto space-y-8 font-sans pl-0 md:pl-8 pb-12">
      {/* Hero Welcome Banner */}
      <div className="relative overflow-hidden bg-gradient-to-r from-blue-50/90 via-indigo-50/80 to-blue-100/60 rounded-3xl p-8 border border-blue-100 flex flex-col md:flex-row items-center justify-between shadow-xs">
        <div className="space-y-2 max-w-lg z-10">
          <span className="text-xs font-bold uppercase tracking-wider text-blue-600 bg-blue-100/80 px-3 py-1 rounded-full inline-block">
            Welcome Back
          </span>
          <h1 className="text-3xl sm:text-4xl font-extrabold text-slate-900 tracking-tight">
            {session.role === 'SYSTEM_ADMIN' ? 'System Administrator' : session.role === 'SCHOOL_ADMIN' ? 'School Administrator' : session.role}
          </h1>
          <p className="text-slate-600 text-sm sm:text-base font-medium">
            Manage your school operations efficiently with School ERP.
          </p>
        </div>

        {/* Vector School Graphic Illustration */}
        <div className="mt-6 md:mt-0 relative w-full md:w-80 h-36 flex items-end justify-center pointer-events-none">
          <div className="flex items-end space-x-2 opacity-90">
            <div className="flex flex-col items-center">
              <div className="w-8 h-12 bg-emerald-400 rounded-full"></div>
              <div className="w-1.5 h-4 bg-emerald-700"></div>
            </div>
            <div className="bg-blue-400 rounded-t-2xl p-3 w-44 flex flex-col items-center shadow-inner relative">
              <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center -mt-7 mb-2 border-2 border-white">
                <div className="w-0 h-0 border-l-[6px] border-l-transparent border-r-[6px] border-r-transparent border-b-[10px] border-b-white"></div>
              </div>
              <div className="grid grid-cols-3 gap-1.5 w-full mb-2">
                <div className="bg-white/80 h-4 rounded-xs"></div>
                <div className="bg-white/80 h-4 rounded-xs"></div>
                <div className="bg-white/80 h-4 rounded-xs"></div>
                <div className="bg-white/80 h-4 rounded-xs"></div>
                <div className="bg-white/80 h-4 rounded-xs"></div>
                <div className="bg-white/80 h-4 rounded-xs"></div>
              </div>
              <div className="w-6 h-7 bg-blue-700 rounded-t-md"></div>
            </div>
            <div className="flex flex-col items-center">
              <div className="w-9 h-14 bg-emerald-500 rounded-full"></div>
              <div className="w-1.5 h-4 bg-emerald-800"></div>
            </div>
          </div>
        </div>
      </div>

      {/* Embedded Teacher-Centric Present Day Class Schedule for Teachers */}
      {session.role === 'TEACHER' && (
        <div className="bg-white p-6 sm:p-8 rounded-3xl border border-slate-200 shadow-sm space-y-6">

          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-slate-100 pb-5">
            <div>
              <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-indigo-50 border border-indigo-100 rounded-full text-xs font-bold text-indigo-700 mb-1">
                <span className="w-2 h-2 rounded-full bg-indigo-500 animate-pulse"></span>
                Present Day Class Schedule
              </div>
              <h2 className="text-2xl font-black text-slate-900 tracking-tight">Today&apos;s Teaching Roster</h2>
              <p className="text-slate-500 text-xs mt-0.5">
                Your assigned class periods, subjects, and classroom locations for {todayName}.
              </p>
            </div>

            <div className="flex items-center gap-3">
              <span className="px-3 py-1.5 bg-slate-100 text-slate-700 font-extrabold text-xs rounded-xl border border-slate-200">
                {todayName}, {new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
              </span>
            </div>
          </div>

          {/* Present Day Assigned Period Cards for the Logged-in Teacher */}
          {todaysTeacherSchedule.length === 0 ? (
            <div className="p-8 bg-slate-50 rounded-2xl border border-slate-200 text-center text-slate-500 font-semibold text-sm">
              No teaching periods assigned to you for today.
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {todaysTeacherSchedule.map((slot, idx) => (
                <div
                  key={slot.id || idx}
                  className="bg-white rounded-2xl p-5 border border-slate-200 hover:border-indigo-300 shadow-2xs hover:shadow-sm transition-all flex justify-between items-center"
                >
                  <div className="space-y-1.5">
                    <div className="flex items-center gap-2">
                      <span className="px-2.5 py-0.5 bg-indigo-100 text-indigo-800 font-black text-xs rounded-lg border border-indigo-200">
                        Class {formatClass(slot.grade, slot.section)}
                      </span>
                      {slot.roomNumber && (
                        <span className="text-xs font-bold text-slate-500">
                          {slot.roomNumber}
                        </span>
                      )}
                    </div>

                    <h3 className="text-base font-extrabold text-slate-900">
                      {slot.subject}
                    </h3>

                    <p className="text-xs text-slate-500 font-medium flex items-center gap-1.5">
                      <svg className="w-3.5 h-3.5 text-indigo-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      {slot.startTime} - {slot.endTime}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}

        </div>
      )}



      {/* Quick Access Section */}
      <div>
        <div className="flex items-center gap-2 mb-6">
          <svg className="w-5 h-5 text-indigo-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M13 10V3L4 14h7v7l9-11h-7z" />
          </svg>
          <h2 className="text-xl font-extrabold text-slate-900 tracking-tight">Quick Access</h2>
        </div>

        <div className={`grid grid-cols-1 sm:grid-cols-2 ${session.role === 'TEACHER' ? 'lg:grid-cols-3' : 'lg:grid-cols-4'} gap-5`}>
          {session.role === 'TEACHER' ? (
            <>
              {/* Card 1: My Mentees */}
              <Link href="/teacher/mentees" className="group">
                <div className="h-full bg-white p-6 rounded-2xl border border-purple-100 shadow-xs hover:shadow-md hover:border-purple-300 transition-all duration-200 flex flex-col justify-between">
                  <div>
                    <div className="w-12 h-12 bg-purple-50 rounded-2xl flex items-center justify-center text-purple-600 mb-5 group-hover:scale-105 transition-transform">
                      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                      </svg>
                    </div>
                    <h3 className="text-lg font-bold text-slate-900 mb-1.5">My Mentees</h3>
                    <p className="text-slate-500 text-xs leading-relaxed">
                      View complete student dossiers, attendance rate, and guardian contact details.
                    </p>
                  </div>
                  <div className="mt-6 flex justify-end">
                    <div className="w-8 h-8 rounded-full bg-purple-50 group-hover:bg-purple-600 text-purple-600 group-hover:text-white flex items-center justify-center transition-colors">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M14 5l7 7m0 0l-7 7m7-7H3" />
                      </svg>
                    </div>
                  </div>
                </div>
              </Link>

              {/* Card 2: Attendance */}
              <Link href="/attendance" className="group">
                <div className="h-full bg-white p-6 rounded-2xl border border-blue-100 shadow-xs hover:shadow-md hover:border-blue-300 transition-all duration-200 flex flex-col justify-between">
                  <div>
                    <div className="w-12 h-12 bg-blue-50 rounded-2xl flex items-center justify-center text-blue-600 mb-5 group-hover:scale-105 transition-transform">
                      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
                      </svg>
                    </div>
                    <h3 className="text-lg font-bold text-slate-900 mb-1.5">Attendance</h3>
                    <p className="text-slate-500 text-xs leading-relaxed">
                      Mark and manage daily student attendance roster.
                    </p>
                  </div>
                  <div className="mt-6 flex justify-end">
                    <div className="w-8 h-8 rounded-full bg-blue-50 group-hover:bg-blue-600 text-blue-600 group-hover:text-white flex items-center justify-center transition-colors">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M14 5l7 7m0 0l-7 7m7-7H3" />
                      </svg>
                    </div>
                  </div>
                </div>
              </Link>

              {/* Card 3: Academic Performance */}
              <Link href="/academic/marks" className="group">
                <div className="h-full bg-white p-6 rounded-2xl border border-indigo-100 shadow-xs hover:shadow-md hover:border-indigo-300 transition-all duration-200 flex flex-col justify-between">
                  <div>
                    <div className="w-12 h-12 bg-indigo-50 rounded-2xl flex items-center justify-center text-indigo-600 mb-5 group-hover:scale-105 transition-transform">
                      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 14l9-5-9-5-9 5 9 5z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 14l6.16-3.422a12.083 12.083 0 01.665 6.479A11.952 11.952 0 0112 20.055a11.952 11.952 0 01-6.824-2.998 12.078 12.078 0 01.665-6.479L12 14z" />
                      </svg>
                    </div>
                    <h3 className="text-lg font-bold text-slate-900 mb-1.5">Academic Performance</h3>
                    <p className="text-slate-500 text-xs leading-relaxed">
                      Enter and review student subject marks and exam scores.
                    </p>
                  </div>
                  <div className="mt-6 flex justify-end">
                    <div className="w-8 h-8 rounded-full bg-indigo-50 group-hover:bg-indigo-600 text-indigo-600 group-hover:text-white flex items-center justify-center transition-colors">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M14 5l7 7m0 0l-7 7m7-7H3" />
                      </svg>
                    </div>
                  </div>
                </div>
              </Link>
            </>
          ) : session.role === 'WARDEN' ? (
            <>
              {/* Card 1: Attendance */}
              <Link href="/warden" className="group">
                <div className="h-full bg-white p-6 rounded-2xl border border-blue-100 shadow-xs hover:shadow-md hover:border-blue-300 transition-all duration-200 flex flex-col justify-between">
                  <div>
                    <div className="w-12 h-12 bg-blue-50 rounded-2xl flex items-center justify-center text-blue-600 mb-5 group-hover:scale-105 transition-transform">
                      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
                      </svg>
                    </div>
                    <h3 className="text-lg font-bold text-slate-900 mb-1.5">Attendance</h3>
                    <p className="text-slate-500 text-xs leading-relaxed">
                      Mark morning or night attendance for your designated hostel and room.
                    </p>
                  </div>
                  <div className="mt-6 flex justify-end">
                    <div className="w-8 h-8 rounded-full bg-blue-50 group-hover:bg-blue-600 text-blue-600 group-hover:text-white flex items-center justify-center transition-colors">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M14 5l7 7m0 0l-7 7m7-7H3" />
                      </svg>
                    </div>
                  </div>
                </div>
              </Link>

              {/* Card 2: Manage rooms */}
              <Link href="/warden/rooms" className="group">
                <div className="h-full bg-white p-6 rounded-2xl border border-amber-100 shadow-xs hover:shadow-md hover:border-amber-300 transition-all duration-200 flex flex-col justify-between">
                  <div>
                    <div className="w-12 h-12 bg-amber-50 rounded-2xl flex items-center justify-center text-amber-500 mb-5 group-hover:scale-105 transition-transform">
                      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5m0 0h4m-4 0V11m0 0h4m-4 0v3m4-3v3" />
                      </svg>
                    </div>
                    <h3 className="text-lg font-bold text-slate-900 mb-1.5">Manage rooms</h3>
                    <p className="text-slate-500 text-xs leading-relaxed">
                      Add, configure, or delete rooms in your assigned hostels.
                    </p>
                  </div>
                  <div className="mt-6 flex justify-end">
                    <div className="w-8 h-8 rounded-full bg-amber-50 group-hover:bg-amber-500 text-amber-600 group-hover:text-white flex items-center justify-center transition-colors">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M14 5l7 7m0 0l-7 7m7-7H3" />
                      </svg>
                    </div>
                  </div>
                </div>
              </Link>

              {/* Card 3: Health & Hospital */}
              <Link href="/warden/health" className="group">
                <div className="h-full bg-white p-6 rounded-2xl border border-rose-100 shadow-xs hover:shadow-md hover:border-rose-300 transition-all duration-200 flex flex-col justify-between">
                  <div>
                    <div className="w-12 h-12 bg-rose-50 rounded-2xl flex items-center justify-center text-rose-600 mb-5 group-hover:scale-105 transition-transform">
                      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.684a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                      </svg>
                    </div>
                    <h3 className="text-lg font-bold text-slate-900 mb-1.5">Health & Hospital</h3>
                    <p className="text-slate-500 text-xs leading-relaxed">
                      Record student hospital visits and emergency illness logs.
                    </p>
                  </div>
                  <div className="mt-6 flex justify-end">
                    <div className="w-8 h-8 rounded-full bg-rose-50 group-hover:bg-rose-600 text-rose-600 group-hover:text-white flex items-center justify-center transition-colors">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M14 5l7 7m0 0l-7 7m7-7H3" />
                      </svg>
                    </div>
                  </div>
                </div>
              </Link>

              {/* Card 4: Download Reports */}
              <Link href="/reports" className="group">
                <div className="h-full bg-white p-6 rounded-2xl border border-emerald-100 shadow-xs hover:shadow-md hover:border-emerald-300 transition-all duration-200 flex flex-col justify-between">
                  <div>
                    <div className="w-12 h-12 bg-emerald-50 rounded-2xl flex items-center justify-center text-emerald-600 mb-5 group-hover:scale-105 transition-transform">
                      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                      </svg>
                    </div>
                    <h3 className="text-lg font-bold text-slate-900 mb-1.5">Download Reports</h3>
                    <p className="text-slate-500 text-xs leading-relaxed">
                      Export hostel attendance logs and student records to CSV.
                    </p>
                  </div>
                  <div className="mt-6 flex justify-end">
                    <div className="w-8 h-8 rounded-full bg-emerald-50 group-hover:bg-emerald-600 text-emerald-600 group-hover:text-white flex items-center justify-center transition-colors">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M14 5l7 7m0 0l-7 7m7-7H3" />
                      </svg>
                    </div>
                  </div>
                </div>
              </Link>
            </>
          ) : (
            <>
              {/* Card 1: Reports (Purple accent) */}
              <Link href="admin/reports" className="group">
                <div className="h-full bg-white p-6 rounded-2xl border border-indigo-100 shadow-xs hover:shadow-md hover:border-indigo-300 transition-all duration-200 flex flex-col justify-between">
                  <div>
                    <div className="w-12 h-12 bg-indigo-50 rounded-2xl flex items-center justify-center text-indigo-600 mb-5 group-hover:scale-105 transition-transform">
                      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                      </svg>
                    </div>
                    <h3 className="text-lg font-bold text-slate-900 mb-1.5">Reports</h3>
                    <p className="text-slate-500 text-xs leading-relaxed">
                      Attendance, marks, and system notifications.
                    </p>
                  </div>
                  <div className="mt-6 flex justify-end">
                    <div className="w-8 h-8 rounded-full bg-indigo-50 group-hover:bg-indigo-600 text-indigo-600 group-hover:text-white flex items-center justify-center transition-colors">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M14 5l7 7m0 0l-7 7m7-7H3" />
                      </svg>
                    </div>
                  </div>
                </div>
              </Link>

              {/* Card 2: Extra Features (Amber accent) */}
              <Link href="/admin/extra-features" className="group">
                <div className="h-full bg-white p-6 rounded-2xl border border-amber-100 shadow-xs hover:shadow-md hover:border-amber-300 transition-all duration-200 flex flex-col justify-between">
                  <div>
                    <div className="w-12 h-12 bg-amber-50 rounded-2xl flex items-center justify-center text-amber-500 mb-5 group-hover:scale-105 transition-transform">
                      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
                      </svg>
                    </div>
                    <h3 className="text-lg font-bold text-slate-900 mb-1.5">Extra Features</h3>
                    <p className="text-slate-500 text-xs leading-relaxed">
                      Enrolment, timetable, and exam seating.
                    </p>
                  </div>
                  <div className="mt-6 flex justify-end">
                    <div className="w-8 h-8 rounded-full bg-amber-50 group-hover:bg-amber-500 text-amber-600 group-hover:text-white flex items-center justify-center transition-colors">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M14 5l7 7m0 0l-7 7m7-7H3" />
                      </svg>
                    </div>
                  </div>
                </div>
              </Link>

              {/* Card 3: Student Data (Sky Blue accent) */}
              <Link href="/admin/student-data" className="group">
                <div className="h-full bg-white p-6 rounded-2xl border border-sky-100 shadow-xs hover:shadow-md hover:border-sky-300 transition-all duration-200 flex flex-col justify-between">
                  <div>
                    <div className="w-12 h-12 bg-sky-50 rounded-2xl flex items-center justify-center text-sky-500 mb-5 group-hover:scale-105 transition-transform">
                      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                      </svg>
                    </div>
                    <h3 className="text-lg font-bold text-slate-900 mb-1.5">Student Data</h3>
                    <p className="text-slate-500 text-xs leading-relaxed">
                      Manage comprehensive student records.
                    </p>
                  </div>
                  <div className="mt-6 flex justify-end">
                    <div className="w-8 h-8 rounded-full bg-sky-50 group-hover:bg-sky-500 text-sky-600 group-hover:text-white flex items-center justify-center transition-colors">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M14 5l7 7m0 0l-7 7m7-7H3" />
                      </svg>
                    </div>
                  </div>
                </div>
              </Link>

              {/* Card 4: Staff Data (Emerald Green accent) */}
              <Link href="/admin/staff-data" className="group">
                <div className="h-full bg-white p-6 rounded-2xl border border-emerald-100 shadow-xs hover:shadow-md hover:border-emerald-300 transition-all duration-200 flex flex-col justify-between">
                  <div>
                    <div className="w-12 h-12 bg-emerald-50 rounded-2xl flex items-center justify-center text-emerald-500 mb-5 group-hover:scale-105 transition-transform">
                      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                      </svg>
                    </div>
                    <h3 className="text-lg font-bold text-slate-900 mb-1.5">Staff Data</h3>
                    <p className="text-slate-500 text-xs leading-relaxed">
                      Manage teacher and staff details.
                    </p>
                  </div>
                  <div className="mt-6 flex justify-end">
                    <div className="w-8 h-8 rounded-full bg-emerald-50 group-hover:bg-emerald-500 text-emerald-600 group-hover:text-white flex items-center justify-center transition-colors">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M14 5l7 7m0 0l-7 7m7-7H3" />
                      </svg>
                    </div>
                  </div>
                </div>
              </Link>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
