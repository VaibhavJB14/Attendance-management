'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

interface UserSession {
  id: string;
  email: string;
  role: string;
  tenantId: string;
  tenantName: string;
  plan: string;
}

export default function ProfileHome() {
  const router = useRouter();
  const [session, setSession] = useState<UserSession | null>(null);

  useEffect(() => {
    const stored = localStorage.getItem('session');
    if (!stored) {
      router.push('/login');
      return;
    }
    const user = JSON.parse(stored);
    
    // Redirect PARENT role to their specific portal
    if (user.role === 'PARENT') {
      router.push('/parent');
      return;
    }
    
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setSession(user);
  }, [router]);

  const handleLogout = () => {
    localStorage.removeItem('session');
    router.push('/login');
  };

  if (!session) return null;

  return (
    <main className="font-sans flex flex-col">
      {/* Main Content */}
      <div className="flex-1 max-w-6xl mx-auto w-full p-6 md:p-8 space-y-12 mt-2 md:mt-6">
        
        {/* Admin Dashboard - 4 Category Cards */}
        <div>
          {(session.role === 'SYSTEM_ADMIN' || session.role === 'SCHOOL_ADMIN') && (
            <>
              <h2 className="text-2xl font-bold text-slate-800 mb-6 flex items-center gap-2">
                <svg className="w-6 h-6 text-indigo-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z"></path></svg>
                Admin Dashboard
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              
              <Link href="/admin/reports" className="group">
                <div className="h-full bg-white p-8 rounded-3xl shadow-sm border border-slate-200 hover:shadow-xl hover:border-indigo-300 transition-all duration-300">
                  <div className="w-14 h-14 bg-indigo-50 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 group-hover:bg-indigo-600 transition-all duration-300">
                    <svg className="w-7 h-7 text-indigo-600 group-hover:text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"></path></svg>
                  </div>
                  <h2 className="text-2xl font-bold text-slate-800 mb-2">Reports</h2>
                  <p className="text-slate-500 text-sm">Attendance, marks, and system notifications.</p>
                </div>
              </Link>

              <Link href="/admin/extra-features" className="group">
                <div className="h-full bg-white p-8 rounded-3xl shadow-sm border border-slate-200 hover:shadow-xl hover:border-amber-300 transition-all duration-300">
                  <div className="w-14 h-14 bg-amber-50 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 group-hover:bg-amber-600 transition-all duration-300">
                    <svg className="w-7 h-7 text-amber-600 group-hover:text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z"></path></svg>
                  </div>
                  <h2 className="text-2xl font-bold text-slate-800 mb-2">Extra Features</h2>
                  <p className="text-slate-500 text-sm">Enrollment, timetable, and exam seating.</p>
                </div>
              </Link>

              <Link href="/admin/student-data" className="group">
                <div className="h-full bg-white p-8 rounded-3xl shadow-sm border border-slate-200 hover:shadow-xl hover:border-sky-300 transition-all duration-300">
                  <div className="w-14 h-14 bg-sky-50 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 group-hover:bg-sky-600 transition-all duration-300">
                    <svg className="w-7 h-7 text-sky-600 group-hover:text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z"></path></svg>
                  </div>
                  <h2 className="text-2xl font-bold text-slate-800 mb-2">Student Data</h2>
                  <p className="text-slate-500 text-sm">Manage comprehensive student records.</p>
                </div>
              </Link>

              <Link href="/admin/staff-data" className="group">
                <div className="h-full bg-white p-8 rounded-3xl shadow-sm border border-slate-200 hover:shadow-xl hover:border-emerald-300 transition-all duration-300">
                  <div className="w-14 h-14 bg-emerald-50 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 group-hover:bg-emerald-600 transition-all duration-300">
                    <svg className="w-7 h-7 text-emerald-600 group-hover:text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"></path></svg>
                  </div>
                  <h2 className="text-2xl font-bold text-slate-800 mb-2">Staff Data</h2>
                  <p className="text-slate-500 text-sm">Manage teacher and staff details.</p>
                </div>
              </Link>

            </div>
            </>
          )}

          {/* Teacher / Warden specific roles section */}
          {(session.role === 'TEACHER' || session.role === 'WARDEN') && (
            <div className="mt-8">
              <h2 className="text-2xl font-bold text-slate-800 mb-6 flex items-center gap-2 border-b border-slate-200 pb-2">
                <svg className="w-6 h-6 text-indigo-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z"></path></svg>
                Daily Actions
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                <Link href={session.role === 'WARDEN' ? "/warden" : "/attendance"} className="group">
                  <div className="h-full bg-white p-8 rounded-3xl shadow-sm border border-slate-200 hover:shadow-xl hover:border-indigo-300 transition-all duration-300">
                    <div className="w-14 h-14 bg-indigo-50 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 group-hover:bg-indigo-600 transition-all duration-300">
                      <svg className="w-7 h-7 text-indigo-600 group-hover:text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
                    </div>
                    <h2 className="text-2xl font-bold text-slate-800 mb-2">{session.role === 'WARDEN' ? 'Warden Dashboard' : 'Mark Attendance'}</h2>
                    <p className="text-slate-500">{session.role === 'WARDEN' ? 'Record nightly attendance for hostelers by room.' : 'Record daily attendance for your designated grades and sections.'}</p>
                  </div>
                </Link>

                {session.role === 'WARDEN' && (
                  <Link href="/warden/rooms" className="group">
                    <div className="h-full bg-white p-8 rounded-3xl shadow-sm border border-slate-200 hover:shadow-xl hover:border-amber-300 transition-all duration-300 relative overflow-hidden">
                      <div className="w-14 h-14 bg-amber-50 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 group-hover:bg-amber-500 transition-all duration-300 relative z-10">
                        <svg className="w-7 h-7 text-amber-600 group-hover:text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"></path></svg>
                      </div>
                      <h2 className="text-2xl font-bold text-slate-800 mb-2 relative z-10">Manage Rooms</h2>
                      <p className="text-slate-500 relative z-10">Add or delete hostel rooms and configure capacities.</p>
                    </div>
                  </Link>
                )}

                {session.role === 'TEACHER' && (
                  <Link href="/academic/marks" className="group">
                    <div className="h-full bg-white p-8 rounded-3xl shadow-sm border border-slate-200 hover:shadow-xl hover:border-blue-300 transition-all duration-300">
                      <div className="w-14 h-14 bg-blue-50 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 group-hover:bg-blue-600 transition-all duration-300">
                        <svg className="w-7 h-7 text-blue-600 group-hover:text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"></path></svg>
                      </div>
                      <h2 className="text-2xl font-bold text-slate-800 mb-2">Academic Performance</h2>
                      <p className="text-slate-500">Record exam scores and manage student marks.</p>
                    </div>
                  </Link>
                )}

                <Link href="/reports" className="group">
                  <div className="h-full bg-white p-8 rounded-3xl shadow-sm border border-slate-200 hover:shadow-xl hover:border-cyan-300 transition-all duration-300">
                    <div className="w-14 h-14 bg-cyan-50 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 group-hover:bg-cyan-600 transition-all duration-300">
                      <svg className="w-7 h-7 text-cyan-600 group-hover:text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"></path></svg>
                    </div>
                    <h2 className="text-2xl font-bold text-slate-800 mb-2">Download Reports</h2>
                    <p className="text-slate-500">Export attendance sheets and individual student marksheets to CSV.</p>
                  </div>
                </Link>
              </div>
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
