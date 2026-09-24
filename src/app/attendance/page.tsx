'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { checkIsHoliday } from '@/lib/holidays';

interface Student {
  id: string;
  firstName: string;
  lastName: string;
  grade: string;
  section: string;
}

interface UserSession {
  id: string;
  email: string;
  role: string;
  tenantId: string;
  tenantName: string;
  plan: string;
}

export default function Home() {
  const router = useRouter();
  const [session, setSession] = useState<UserSession | null>(null);
  
  // Filters
  const [grade, setGrade] = useState('');
  const [section, setSection] = useState('');
  const [sessionName, setSessionName] = useState('');
  const [schoolClasses, setSchoolClasses] = useState<any[]>([]);

  // Dynamic Class Options
  const uniqueGrades = Array.from(new Set(schoolClasses.map((c: any) => c.grade)));
  const getSectionsForGrade = (grade: string) => schoolClasses.filter((c: any) => c.grade === grade).map((c: any) => c.section);
  
  const [students, setStudents] = useState<Student[]>([]);
  const [attendanceState, setAttendanceState] = useState<Record<string, string>>({}); // { studentId: 'PRESENT' | 'ABSENT' }
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [isAttendanceLocked, setIsAttendanceLocked] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [smsLogs, setSmsLogs] = useState<string[]>([]);

  useEffect(() => {
    // Check Auth
    const stored = localStorage.getItem('session');
    if (!stored) {
      router.push('/login');
      return;
    }
    const user = JSON.parse(stored);
    
    // Wardens cannot access classroom attendance
    if (user.role === 'WARDEN') {
      router.push('/warden');
      return;
    }
    
    setSession(user);
    
    // Optionally default to the teacher's domain if they have one, 
    // but for now we just use the default state values.
  }, [router]);

  useEffect(() => {
    if (session) {
      fetch('/api/classes', {
        headers: { 'x-tenant-id': session.tenantId }
      })
      .then(res => res.json())
      .then(data => {
        if (data.classes) setSchoolClasses(data.classes);
      })
      .catch(console.error);
    }
  }, [session]);

  const [searchQuery, setSearchQuery] = useState('');
  
  const { isHoliday, name: holidayName } = checkIsHoliday();

  // Fetch Students based on Filters
  const fetchStudents = async () => {
    if (!session) return;
    setLoading(true);
    setError(null);
    setSuccessMsg(null);
    
    try {
      const response = await fetch(`/api/students?grade=${encodeURIComponent(grade)}&section=${encodeURIComponent(section)}`, {
        headers: { 'x-tenant-id': session.tenantId }
      });

      if (!response.ok) throw new Error('Failed to fetch students');

      const data = await response.json();
      setStudents(data.students);
      
      // Check if attendance already marked today
      let initialState: Record<string, string> = {};
      let locked = false;

      // Default all students to PRESENT
      data.students.forEach((student: any) => {
        initialState[student.id] = 'PRESENT';
      });

      const todayStr = new Date().toISOString().split('T')[0];
      const attRes = await fetch(`/api/attendance?date=${todayStr}&grade=${encodeURIComponent(grade)}&section=${encodeURIComponent(section)}&sessionName=${encodeURIComponent(sessionName)}`, {
        headers: { 'x-tenant-id': session.tenantId }
      });
      if (attRes.ok) {
        const attData = await attRes.json();
        if (attData.attendance && attData.attendance.length > 0) {
          locked = true;
          attData.attendance.forEach((att: any) => {
            initialState[att.studentId] = att.status;
          });
        }
      }

      setAttendanceState(initialState);
      setIsAttendanceLocked(locked);
      
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (session && grade && section && sessionName) {
      fetchStudents();
    } else {
      setStudents([]);
    }
  }, [session, grade, section, sessionName]);

  const handleStatusChange = (studentId: string, status: string) => {
    setAttendanceState(prev => ({
      ...prev,
      [studentId]: status
    }));
  };

  const submitAttendance = async () => {
    if (!session) return;
    
    if (Object.keys(attendanceState).length !== students.length) {
      setError('Please mark attendance for all students.');
      return;
    }

    setSubmitting(true);
    setError(null);
    setSuccessMsg(null);
    setSmsLogs([]);

    const records = Object.entries(attendanceState).map(([studentId, status]) => ({
      studentId,
      status
    }));

    try {
      const response = await fetch('/api/attendance', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-tenant-id': session.tenantId,
          'x-user-id': session.id
        },
        body: JSON.stringify({
          date: new Date().toISOString(),
          sessionName,
          records
        })
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Failed to submit attendance');
      
      setSuccessMsg(`Successfully saved attendance for ${records.length} students. Sent ${data.smsSentCount || 0} automated SMS notifications.`);
      if (data.smsLogs && data.smsLogs.length > 0) {
        setSmsLogs(data.smsLogs);
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('session');
    router.push('/login');
  };

  if (!session) return null; // Wait for redirect

  // Filter students based on search query
  const filteredStudents = students.filter(student => 
    `${student.firstName} ${student.lastName}`.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const currentHour = new Date().getHours();
  let isSessionActive = false;
  if (sessionName === "Morning (8-12)" && currentHour >= 8 && currentHour < 12) isSessionActive = true;
  else if (sessionName === "Afternoon (12-3)" && currentHour >= 12 && currentHour < 15) isSessionActive = true;
  else if (sessionName === "Evening (3-6)" && currentHour >= 15 && currentHour < 18) isSessionActive = true;

  return (
    <main className="min-h-screen bg-slate-50 text-slate-900 p-4 sm:p-8 font-sans selection:bg-indigo-500/30">
      <div className="max-w-6xl mx-auto space-y-8">
        
        {/* Navigation Header */}
        <div className="flex items-center justify-between">
          <Link href="/" className="flex items-center text-indigo-600 font-semibold hover:text-indigo-800 transition-colors">
            <svg className="w-5 h-5 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7"></path></svg>
            Back to Profile
          </Link>
        </div>

        {/* Header Section */}
        <header className="flex flex-col md:flex-row md:items-center justify-between gap-6 pb-6 border-b border-slate-200">
          <div>
            <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight text-slate-800">
              Attendance Dashboard
            </h1>
            <p className="mt-1 text-slate-500 text-base">
              {session.tenantName} | Logged in as <span className="font-semibold text-indigo-600">{session.email}</span>
            </p>
          </div>
          <div className="flex items-center gap-4">
            <div className="px-3 py-1.5 bg-emerald-50 rounded-full border border-emerald-200 flex items-center gap-2 shadow-sm">
              <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></div>
              <span className="text-xs font-semibold text-emerald-700 uppercase tracking-wider">{session.plan} Plan</span>
            </div>
            <button 
              onClick={handleLogout}
              className="px-4 py-1.5 text-sm font-medium text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-md transition-colors border border-transparent hover:border-slate-200"
            >
              Sign out
            </button>
          </div>
        </header>

        {/* Filters & Actions */}
        <div className="bg-white p-6 border border-slate-200 rounded-xl shadow-sm flex flex-col xl:flex-row xl:items-end justify-between gap-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 w-full xl:flex-1">
            <div className="w-full">
              <label className="block text-sm font-semibold text-slate-600 uppercase tracking-wider mb-2">Grade / Year</label>
              <select 
                value={grade} 
                onChange={(e) => setGrade(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 text-slate-800 text-base rounded-lg focus:ring-indigo-500 focus:border-indigo-500 block py-2.5 px-3"
              >
                <option value="">Select Grade</option>
                {uniqueGrades.length > 0 ? (
                  uniqueGrades.map((g: any) => <option key={g} value={g}>{g}</option>)
                ) : (
                  <option value="" disabled>No classes available</option>
                )}
              </select>
            </div>
            <div className="w-full">
              <label className="block text-sm font-semibold text-slate-600 uppercase tracking-wider mb-2">Session</label>
              <select 
                value={sessionName} 
                onChange={(e) => setSessionName(e.target.value)}
                className="w-full bg-indigo-50 border border-indigo-200 text-indigo-800 font-semibold text-base rounded-lg focus:ring-indigo-500 focus:border-indigo-500 block py-2.5 px-3"
              >
                <option value="">Select Session</option>
                <option value="Morning (8-12)">Morning (8-12)</option>
                <option value="Afternoon (12-3)">Afternoon (12-3)</option>
                <option value="Evening (3-6)">Evening (3-6)</option>
              </select>
            </div>
            <div className="w-full">
              <label className="block text-sm font-semibold text-slate-600 uppercase tracking-wider mb-2">Section</label>
              <select 
                value={section} 
                onChange={(e) => setSection(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 text-slate-800 text-base rounded-lg focus:ring-indigo-500 focus:border-indigo-500 block py-2.5 px-3"
              >
                <option value="">Select Section</option>
                {getSectionsForGrade(grade).length > 0 ? (
                  getSectionsForGrade(grade).map((s: any) => <option key={s} value={s}>{s}</option>)
                ) : (
                  <option value="" disabled>No sections available</option>
                )}
              </select>
            </div>
            <div className="w-full">
              <label className="block text-sm font-semibold text-slate-600 uppercase tracking-wider mb-2">Search Student</label>
              <input 
                type="text" 
                placeholder="Search by name..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 text-slate-800 text-base rounded-lg focus:ring-indigo-500 focus:border-indigo-500 block py-2.5 px-3 placeholder-slate-400"
              />
            </div>
          </div>
          
          <button 
            onClick={submitAttendance}
            disabled={submitting || loading || students.length === 0 || isAttendanceLocked || !isSessionActive || isHoliday}
            className="w-full xl:w-auto px-8 py-3 bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-400 text-white text-base font-semibold rounded-lg shadow-md transition-all active:scale-95 flex items-center justify-center gap-2 whitespace-nowrap"
          >
            {submitting ? 'Saving...' : isAttendanceLocked ? 'Attendance Locked' : !isSessionActive ? 'Session Inactive' : isHoliday ? 'Holiday' : 'Submit Attendance'}
          </button>
        </div>

        {/* Alerts */}
        {error && (
          <div className="p-4 bg-red-50 text-red-700 border border-red-200 rounded-xl text-sm font-medium">
            {error}
          </div>
        )}
        {successMsg && (
          <div className="p-4 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-xl text-sm font-medium">
            <p className="font-bold mb-1">{successMsg}</p>
            {smsLogs.length > 0 && (
              <ul className="mt-2 space-y-1 pl-4 list-disc text-xs opacity-90">
                {smsLogs.map((log, i) => <li key={i}>{log}</li>)}
              </ul>
            )}
          </div>
        )}
        {isAttendanceLocked && (
          <div className="p-4 bg-amber-50 text-amber-700 border border-amber-200 rounded-xl text-sm font-medium flex items-center gap-2">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"></path></svg>
            Attendance for this session has already been marked and is locked. It cannot be edited.
          </div>
        )}
        {!isAttendanceLocked && sessionName && !isSessionActive && !isHoliday && (
          <div className="p-4 bg-orange-50 text-orange-700 border border-orange-200 rounded-xl text-sm font-medium">
            This session is not currently active. You can only mark attendance during the scheduled hours.
          </div>
        )}

        {/* Student List */}
        <div className="bg-white border border-slate-200 rounded-2xl shadow-lg overflow-hidden relative">
          <div className="p-5 border-b border-slate-200 bg-slate-50 flex justify-between items-center">
            <h2 className="text-xl font-bold text-slate-800">Student Roster</h2>
            <span className="text-sm px-3 py-1 bg-indigo-100 text-indigo-700 font-semibold rounded-full border border-indigo-200">
              {filteredStudents.length} Students Found
            </span>
          </div>

          {loading ? (
            <div className="p-16 flex justify-center items-center space-x-2">
              <div className="w-2.5 h-2.5 bg-indigo-500 rounded-full animate-pulse"></div>
              <div className="w-2.5 h-2.5 bg-indigo-500 rounded-full animate-pulse delay-75"></div>
              <div className="w-2.5 h-2.5 bg-indigo-500 rounded-full animate-pulse delay-150"></div>
            </div>
          ) : isHoliday ? (
            <div className="bg-white rounded-2xl shadow-xl border border-rose-200 p-12 text-center overflow-hidden relative">
              <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-rose-400 to-orange-400"></div>
              <div className="w-20 h-20 bg-rose-100 rounded-full flex items-center justify-center mx-auto mb-6 shadow-sm">
                <svg className="w-10 h-10 text-rose-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 3v4M19 3v4M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"></path><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 11v4m-2-2h4"></path></svg>
              </div>
              <h2 className="text-3xl font-extrabold text-slate-800 mb-2">Today is a Holiday</h2>
              <p className="text-lg text-slate-500 mb-6 font-medium">Enjoy your {holidayName}! No attendance can be marked today.</p>
              <p className="text-sm text-slate-400">If you believe this is an error, please contact the System Administrator.</p>
            </div>
          ) : !(grade && section && sessionName) ? (
            <div className="p-16 text-center text-slate-500 text-sm">
              Please select a Grade, Session, and Section to view the student roster.
            </div>
          ) : filteredStudents.length === 0 ? (
            <div className="p-16 text-center text-slate-500 text-sm">
              No students found for the selected criteria.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50 text-slate-500 text-sm uppercase tracking-wider font-semibold border-b border-slate-200">
                    <th className="px-6 py-4">Student Name</th>
                    <th className="px-6 py-4 text-right">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredStudents.map((student) => {
                    const status = attendanceState[student.id];
                    return (
                      <tr 
                        key={student.id} 
                        className={`transition-colors duration-150 ${status === 'PRESENT' ? 'hover:bg-slate-50' : 'bg-red-50/40 hover:bg-red-50/80'}`}
                      >
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-4">
                            <div className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold text-white shadow-sm transition-colors ${status === 'PRESENT' ? 'bg-gradient-to-tr from-indigo-500 to-cyan-500' : 'bg-red-400'}`}>
                              {student.firstName[0]}
                            </div>
                            <span className="font-semibold text-lg text-slate-700">
                              {student.firstName} {student.lastName}
                            </span>
                          </div>
                        </td>
                        <td className="px-6 py-5 text-right">
                          <div className="flex justify-end">
                            <button
                              disabled={isAttendanceLocked}
                              onClick={() => handleStatusChange(student.id, status === 'PRESENT' ? 'ABSENT' : 'PRESENT')}
                              className={`px-6 py-2.5 rounded-xl font-bold text-sm tracking-widest uppercase transition-all border-2 w-32 ${
                                status === 'PRESENT' 
                                  ? 'bg-emerald-500 border-emerald-500 text-white shadow-md' 
                                  : status === 'ABSENT'
                                  ? 'bg-rose-500 border-rose-500 text-white shadow-md'
                                  : isAttendanceLocked ? 'bg-slate-100 border-slate-200 text-slate-400 cursor-not-allowed' : 'bg-white border-slate-200 text-slate-400 hover:border-slate-300'
                              }`}
                            >
                              {status === 'ABSENT' ? 'A' : 'P'}
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

      </div>
    </main>
  );
}
