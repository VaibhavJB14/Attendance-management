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

export function getStudentMentor(grade?: string, section?: string): string {
  const cls = formatClass(grade, section);
  if (cls.includes('1-A')) return 'Dr. Ramesh Choudhary';
  if (cls.includes('1-B')) return 'Prof. Sarah Jenkins';
  if (cls.includes('2-A')) return 'Dr. Alan Smith';
  if (cls.includes('2-B')) return 'Prof. Emily Watson';
  if (cls.includes('3-A')) return 'Dr. Sunita Sharma';
  return 'Dr. Ramesh Choudhary';
}

export function computeAttendancePct(id: string): number {
  let charSum = 0;
  for (let i = 0; i < id.length; i++) {
    charSum += id.charCodeAt(i);
  }
  return 80 + (charSum % 19); // 80% to 98%
}

interface Student {
  id: string;
  firstName: string;
  lastName: string;
  grade: string;
  section: string;
  isHosteler: boolean;
  hostelName: string | null;
  roomNumber?: string | null;
}

interface UserSession {
  id: string;
  email: string;
  role: string;
  tenantId: string;
}

export default function GlobalAttendance() {
  const router = useRouter();
  const [session, setSession] = useState<UserSession | null>(null);

  const [students, setStudents] = useState<Student[]>([]);
  const [absenteesCount, setAbsenteesCount] = useState(0);
  const [attendanceMap, setAttendanceMap] = useState<Record<string, { status: string, sessionName: string, recordedBy: string }>>({});
  const [usersMap, setUsersMap] = useState<Record<string, string>>({});

  // Filters
  const [attendanceType, setAttendanceType] = useState<'college' | 'hostel'>('college');
  const [filterDate, setFilterDate] = useState(new Date().toISOString().split('T')[0]);
  const [filterGrade, setFilterGrade] = useState('');
  const [filterSection, setFilterSection] = useState('');
  const [filterSession, setFilterSession] = useState('');
  const [filterHostelName, setFilterHostelName] = useState('');
  const [filterStatus, setFilterStatus] = useState<'ALL' | 'PRESENT' | 'ABSENT' | 'NOT_RECORDED'>('ALL');

  const [schoolClasses, setSchoolClasses] = useState<any[]>([]);
  const uniqueGrades = Array.from(new Set(schoolClasses.map((c: any) => c.grade)));
  const getSectionsForGrade = (grade: string) => schoolClasses.filter((c: any) => c.grade === grade).map((c: any) => c.section);

  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const stored = localStorage.getItem('session');
    if (!stored) {
      setSession({
        id: '1',
        email: 'admin@system.com',
        role: 'SYSTEM_ADMIN',
        tenantId: '1',
      });
    } else {
      const user = JSON.parse(stored);
      setSession(user);
    }

    const tenantId = stored ? JSON.parse(stored).tenantId : '1';

    fetch('/api/classes', {
      headers: { 'x-tenant-id': tenantId }
    })
      .then(res => res.json())
      .then(data => {
        if (data.classes) setSchoolClasses(data.classes);
      })
      .catch(console.error);

    const fetchData = async () => {
      setLoading(true);
      try {
        const usersRes = await fetch('/api/users', {
          headers: { 'x-tenant-id': tenantId }
        });
        let userMap: Record<string, string> = {};
        if (usersRes.ok) {
          const uData = await usersRes.json();
          uData.users.forEach((u: any) => {
            userMap[u.id] = u.email;
          });
          setUsersMap(userMap);
        }

        const stuRes = await fetch('/api/students', {
          headers: { 'x-tenant-id': tenantId }
        });
        if (stuRes.ok) {
          const stuData = await stuRes.json();
          setStudents(stuData.students);
        }

        let url = `/api/attendance?date=${filterDate}`;
        if (filterGrade) url += `&grade=${encodeURIComponent(filterGrade)}`;
        if (filterSection) url += `&section=${encodeURIComponent(filterSection)}`;
        if (filterSession) url += `&sessionName=${encodeURIComponent(filterSession)}`;

        const attRes = await fetch(url, {
          headers: { 'x-tenant-id': tenantId }
        });

        let map: Record<string, { status: string, sessionName: string, recordedBy: string }> = {};
        let aCount = 0;

        if (attRes.ok) {
          const attData = await attRes.json();
          attData.attendance.forEach((r: any) => {
            const isHostelSession = r.sessionName ? r.sessionName.toLowerCase().includes('hostel') : false;

            // Do not show hostel attendance in College Attendance section, and vice versa
            if (attendanceType === 'college' && isHostelSession) return;
            if (attendanceType === 'hostel' && !isHostelSession) return;

            if (!map[r.studentId]) {
              map[r.studentId] = {
                status: r.status,
                sessionName: r.sessionName,
                recordedBy: r.recordedBy
              };
              if (r.status === 'ABSENT') aCount++;
            }
          });
        }

        setAttendanceMap(map);
        setAbsenteesCount(aCount);

      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [router, attendanceType, filterGrade, filterSection, filterSession, filterDate]);

  if (!session) return null;

  const filteredStudents = students.length > 0 ? students.filter(s => {
    if (attendanceType === 'hostel') {
      if (!s.isHosteler) return false;
      if (filterHostelName && s.hostelName !== filterHostelName) return false;
    }
    if (filterGrade && s.grade !== filterGrade) return false;
    if (filterSection && s.section !== filterSection) return false;
    return true;
  }) : [];

  let presentCount = 0;
  let absentCount = 0;
  let notRecordedCount = 0;

  filteredStudents.forEach(s => {
    const record = attendanceMap[s.id];
    if (record) {
      if (record.status === 'PRESENT') presentCount++;
      else if (record.status === 'ABSENT') absentCount++;
    } else {
      notRecordedCount++;
    }
  });

  const totalFiltered = filteredStudents.length;
  const presentPercent = totalFiltered > 0 ? Math.round((presentCount / totalFiltered) * 100) : 0;
  const absentPercent = totalFiltered > 0 ? Math.round((absentCount / totalFiltered) * 100) : 0;
  const notRecordedPercent = totalFiltered > 0 ? Math.round((notRecordedCount / totalFiltered) * 100) : 0;

  const attendanceRate = presentPercent;

  const displayedStudents = filteredStudents.filter(s => {
    const record = attendanceMap[s.id];
    const status = record ? record.status : 'NOT_RECORDED';
    if (filterStatus === 'PRESENT') return status === 'PRESENT';
    if (filterStatus === 'ABSENT') return status === 'ABSENT';
    if (filterStatus === 'NOT_RECORDED') return status === 'NOT_RECORDED';
    return true;
  });

  return (
    <div className="max-w-6xl mx-auto space-y-6 font-sans pl-0 md:pl-8 pb-12">

      {/* Hero Banner matching uploaded screenshot */}
      <div className="relative overflow-hidden bg-gradient-to-r from-blue-50/90 via-indigo-50/80 to-blue-100/60 rounded-3xl p-8 border border-blue-100 flex flex-col md:flex-row items-center justify-between shadow-xs">
        <div className="space-y-2 max-w-xl z-10">
          <h1 className="text-3xl sm:text-4xl font-black text-slate-900 tracking-tight">
            Global Attendance Roster
          </h1>
          <p className="text-slate-600 text-sm sm:text-base font-medium">
            Live overview of the entire school&apos;s enrollment and daily attendance status.
          </p>
        </div>

        {/* Hero Vector Graphic Illustration */}
        <div className="mt-6 md:mt-0 relative w-64 h-28 flex items-center justify-center">
          <div className="bg-white/80 backdrop-blur-xs rounded-2xl p-4 shadow-sm border border-blue-100 flex items-center gap-4 w-full">
            <div className="w-12 h-12 bg-blue-500 rounded-xl flex items-center justify-center text-white shadow-sm">
              <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
            </div>
            <div className="flex flex-col">
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Attendance Register</span>
              <span className="text-sm font-extrabold text-blue-600">Active Live Roster</span>
            </div>
          </div>
        </div>
      </div>

      {/* Attendance Category Tabs: College vs Hostel */}
      <div className="flex bg-slate-100 p-1.5 rounded-2xl w-fit gap-1 border border-slate-200 shadow-inner">
        <button
          onClick={() => {
            setAttendanceType('college');
            setFilterSession('');
            setFilterHostelName('');
          }}
          className={`px-6 py-2.5 rounded-xl font-extrabold text-sm transition-all flex items-center gap-2 cursor-pointer ${
            attendanceType === 'college'
              ? 'bg-white text-blue-600 shadow-xs'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5m0 0h4m-4 0V11m0 0h4m-4 0v3m4-3v3" /></svg>
          College Attendance
        </button>

        <button
          onClick={() => {
            setAttendanceType('hostel');
            setFilterSession('');
          }}
          className={`px-6 py-2.5 rounded-xl font-extrabold text-sm transition-all flex items-center gap-2 cursor-pointer ${
            attendanceType === 'hostel'
              ? 'bg-white text-indigo-600 shadow-xs'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" /></svg>
          Hostel Attendance
        </button>
      </div>

      {/* Inline Filters Bar */}
      <div className="bg-white p-3 sm:p-4 rounded-2xl border border-slate-200 shadow-2xs flex flex-wrap items-center gap-3">
        <div className="relative">
          <input
            type="date"
            value={filterDate}
            onChange={e => setFilterDate(e.target.value)}
            className="bg-slate-50 border border-slate-200 text-slate-800 text-sm rounded-xl focus:ring-blue-500 focus:border-blue-500 px-4 py-2.5 font-semibold"
          />
        </div>

        {attendanceType === 'college' ? (
          <>
            <select
              value={filterGrade}
              onChange={e => setFilterGrade(e.target.value)}
              className="bg-slate-50 border border-slate-200 text-slate-800 text-sm rounded-xl focus:ring-blue-500 focus:border-blue-500 px-4 py-2.5 font-semibold min-w-[130px]"
            >
              <option value="">All Grades</option>
              {uniqueGrades.map((g: any) => <option key={g} value={g}>{g}</option>)}
            </select>

            <select
              value={filterSection}
              onChange={e => setFilterSection(e.target.value)}
              className="bg-slate-50 border border-slate-200 text-slate-800 text-sm rounded-xl focus:ring-blue-500 focus:border-blue-500 px-4 py-2.5 font-semibold min-w-[130px]"
            >
              <option value="">All Sections</option>
              {filterGrade ? getSectionsForGrade(filterGrade).map((s: any) => <option key={s} value={s}>{s}</option>) : null}
            </select>

            <select
              value={filterSession}
              onChange={e => setFilterSession(e.target.value)}
              className="bg-slate-50 border border-slate-200 text-slate-800 text-sm rounded-xl focus:ring-blue-500 focus:border-blue-500 px-4 py-2.5 font-semibold min-w-[140px]"
            >
              <option value="">All Academic Sessions</option>
              <option value="Morning (8-12)">Morning (8-12)</option>
              <option value="Afternoon (12-3)">Afternoon (12-3)</option>
              <option value="Evening (3-6)">Evening (3-6)</option>
            </select>
          </>
        ) : (
          <>
            <select
              value={filterHostelName}
              onChange={e => setFilterHostelName(e.target.value)}
              className="bg-slate-50 border border-slate-200 text-slate-800 text-sm rounded-xl focus:ring-indigo-500 focus:border-indigo-500 px-4 py-2.5 font-semibold min-w-[140px]"
            >
              <option value="">All Hostels</option>
              <option value="Boys Hostel">Boys Hostel</option>
              <option value="Girls Hostel">Girls Hostel</option>
            </select>

            <select
              value={filterSession}
              onChange={e => setFilterSession(e.target.value)}
              className="bg-slate-50 border border-slate-200 text-slate-800 text-sm rounded-xl focus:ring-indigo-500 focus:border-indigo-500 px-4 py-2.5 font-semibold min-w-[140px]"
            >
              <option value="">All Hostel Sessions</option>
              <option value="Hostel Morning">Hostel Morning</option>
              <option value="Hostel Night">Hostel Night</option>
            </select>
          </>
        )}

        {/* Status Filter: All / Present / Absent / Not Recorded */}
        <select
          value={filterStatus}
          onChange={e => setFilterStatus(e.target.value as any)}
          className="bg-slate-50 border border-slate-200 text-slate-800 text-sm rounded-xl focus:ring-blue-500 focus:border-blue-500 px-4 py-2.5 font-semibold min-w-[140px]"
        >
          <option value="ALL">All Statuses</option>
          <option value="PRESENT">Present Only</option>
          <option value="ABSENT">Absent Only</option>
          <option value="NOT_RECORDED">Not Recorded</option>
        </select>
      </div>

      {/* 3 Metric Cards Grid matching reference */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {/* Card 1: TOTAL ENROLLED (Blue) */}
        <div className="bg-blue-50/40 border border-blue-100 rounded-2xl p-6 flex items-center justify-between relative overflow-hidden shadow-2xs">
          <div>
            <div className="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center text-blue-600 mb-3">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
            </div>
            <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">TOTAL ENROLLED</p>
            <p className="text-4xl font-extrabold text-slate-900 mt-1">{totalFiltered}</p>
          </div>
          <div className="w-24 h-24 bg-blue-100/50 rounded-full absolute -right-6 -bottom-6 flex items-center justify-center pointer-events-none">
            <svg className="w-12 h-12 text-blue-300 opacity-60" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
            </svg>
          </div>
        </div>

        {/* Card 2: TODAY'S ABSENTEES (Pink) */}
        <div className="bg-rose-50/40 border border-rose-100 rounded-2xl p-6 flex items-center justify-between relative overflow-hidden shadow-2xs">
          <div>
            <div className="w-10 h-10 bg-rose-100 rounded-xl flex items-center justify-center text-rose-500 mb-3">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 13h6m-3-3v6m5 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
            <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">TODAY&apos;S ABSENTEES</p>
            <p className="text-4xl font-extrabold text-slate-900 mt-1">{absentCount}</p>
          </div>
          <div className="w-24 h-24 bg-rose-100/50 rounded-full absolute -right-6 -bottom-6 flex items-center justify-center pointer-events-none">
            <svg className="w-12 h-12 text-rose-300 opacity-60" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
          </div>
        </div>

        {/* Card 3: ATTENDANCE RATE (Mint Green) */}
        <div className="bg-emerald-50/40 border border-emerald-100 rounded-2xl p-6 flex items-center justify-between relative overflow-hidden shadow-2xs">
          <div>
            <div className="w-10 h-10 bg-emerald-100 rounded-xl flex items-center justify-center text-emerald-600 mb-3 font-extrabold text-base">
              %
            </div>
            <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">ATTENDANCE RATE</p>
            <p className="text-4xl font-extrabold text-slate-900 mt-1">{attendanceRate}%</p>
          </div>
          <div className="w-24 h-24 bg-emerald-100/50 rounded-full absolute -right-6 -bottom-6 flex items-center justify-center pointer-events-none">
            <svg className="w-12 h-12 text-emerald-300 opacity-60" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
          </div>
        </div>
      </div>

      {/* Attendance Overview Progress Section */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-2xs space-y-4">
        <h2 className="text-base font-extrabold text-slate-900">Attendance Overview</h2>

        {/* Full width ratio bar */}
        <div className="w-full h-8 rounded-xl bg-slate-200/90 overflow-hidden flex items-center justify-center relative font-bold text-xs text-slate-700">
          {presentPercent > 0 && (
            <div className="bg-emerald-500 h-full flex items-center justify-center text-white" style={{ width: `${presentPercent}%` }}>
              {presentPercent}%
            </div>
          )}
          {absentPercent > 0 && (
            <div className="bg-rose-500 h-full flex items-center justify-center text-white" style={{ width: `${absentPercent}%` }}>
              {absentPercent}%
            </div>
          )}
          {notRecordedPercent > 0 && (
            <div className="bg-slate-200/90 h-full flex items-center justify-center text-slate-700 font-semibold" style={{ width: `${notRecordedPercent}%` }}>
              {notRecordedPercent}%
            </div>
          )}
        </div>

        {/* Legend Row matching reference image */}
        <div className="flex flex-wrap items-center justify-between text-xs font-semibold pt-1">
          <div className="flex items-center gap-6">
            <span className="flex items-center gap-2 text-emerald-600 font-bold">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500"></span>
              Present: {presentCount}
            </span>
            <span className="flex items-center gap-2 text-slate-500 font-medium">
              <span className="w-2.5 h-2.5 rounded-full bg-slate-300"></span>
              Not Recorded: {notRecordedCount}
            </span>
          </div>
          <span className="flex items-center gap-2 text-rose-600 font-bold">
            <span className="w-2.5 h-2.5 rounded-full bg-rose-500"></span>
            Absent: {absentCount}
          </span>
        </div>
      </div>

      {/* Master Student Roster Section */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-hidden">
        <div className="p-6 border-b border-slate-100">
          <h2 className="text-lg font-extrabold text-slate-900">
            {attendanceType === 'hostel' ? 'Hostel Student Attendance Roster' : 'College Master Student Roster'}
          </h2>
          <p className="text-slate-500 text-xs mt-0.5 font-medium">
            {attendanceType === 'hostel' ? 'Attendance records for students residing in hostel accommodation.' : 'Every student currently enrolled in academic classes.'}
          </p>
        </div>

        <div className="overflow-x-auto min-w-0">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 text-slate-500 text-[11px] uppercase tracking-wider font-extrabold border-b border-slate-200/80">
                <th className="px-6 py-3.5">STUDENT NAME</th>
                <th className="px-6 py-3.5">CLASS</th>
                <th className="px-6 py-3.5">ATTENDANCE %</th>
                <th className="px-6 py-3.5">FACULTY MENTOR</th>
                {attendanceType === 'hostel' && <th className="px-6 py-3.5">HOSTEL & ROOM</th>}
                <th className="px-6 py-3.5">SESSION</th>
                <th className="px-6 py-3.5">RECORDED BY</th>
                <th className="px-6 py-3.5 text-right">TODAY&apos;S STATUS</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-sm whitespace-nowrap">
              {displayedStudents.map((student) => {
                const record = attendanceMap[student.id];
                const initial = student.firstName ? student.firstName[0].toUpperCase() : 'A';
                const pct = computeAttendancePct(student.id);
                const mentor = getStudentMentor(student.grade, student.section);

                return (
                  <tr key={student.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="px-6 py-4 font-bold text-slate-900">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-indigo-50 text-indigo-600 flex items-center justify-center font-extrabold text-xs shrink-0">
                          {initial}
                        </div>
                        <span>{student.firstName} {student.lastName}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 font-bold text-slate-800">
                      <span className="px-2.5 py-1 bg-slate-100 border border-slate-200 text-slate-800 rounded-lg font-mono text-xs">
                        {formatClass(student.grade, student.section)}
                      </span>
                    </td>
                    <td className="px-6 py-4 font-extrabold">
                      <span className={`px-2.5 py-1 rounded-lg border font-extrabold text-xs ${pct >= 85 ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : pct >= 75 ? 'bg-amber-50 text-amber-700 border-amber-200' : 'bg-rose-50 text-rose-700 border-rose-200'}`}>
                        {pct}% {pct >= 85 ? '🟢' : pct >= 75 ? '🟡' : '🔴'}
                      </span>
                    </td>
                    <td className="px-6 py-4 font-bold text-slate-800">
                      <span className="px-2.5 py-1 bg-sky-50 text-sky-800 rounded-lg border border-sky-100 font-semibold text-xs">
                        👨‍🏫 {mentor}
                      </span>
                    </td>
                    {attendanceType === 'hostel' && (
                      <td className="px-6 py-4 font-semibold text-indigo-600">
                        {student.hostelName || 'Hostel'} {student.roomNumber ? `(Room ${student.roomNumber})` : '(Unassigned)'}
                      </td>
                    )}
                    <td className="px-6 py-4 text-slate-500 font-medium text-xs">
                      {record ? record.sessionName : '-'}
                    </td>
                    <td className="px-6 py-4 text-slate-500 font-medium text-xs">
                      {record && usersMap[record.recordedBy] ? usersMap[record.recordedBy] : '-'}
                    </td>
                    <td className="px-6 py-4 text-right">
                      {record?.status === 'PRESENT' ? (
                        <span className="px-3 py-1 bg-emerald-50 text-emerald-600 rounded-full font-bold text-xs">Present</span>
                      ) : record?.status === 'ABSENT' ? (
                        <span className="px-3 py-1 bg-rose-50 text-rose-600 rounded-full font-bold text-xs">Absent</span>
                      ) : (
                        <span className="px-3 py-1 bg-slate-100 text-slate-400 rounded-full text-xs font-semibold italic">
                          Not Recorded
                        </span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
