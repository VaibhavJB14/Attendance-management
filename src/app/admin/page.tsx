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

export default function AdminHub() {
  const router = useRouter();
  const [session, setSession] = useState<UserSession | null>(null);

  useEffect(() => {
    const stored = localStorage.getItem('session');
    if (!stored) {
      router.push('/login');
      return;
    }
    const user = JSON.parse(stored);
    
    // Kick out non-admins
    if (user.role !== 'SYSTEM_ADMIN' && user.role !== 'SCHOOL_ADMIN') {
      router.push('/');
      return;
    }
    setSession(user);
  }, [router]);

  if (!session) return null;

  return (
    <main className="min-h-screen bg-slate-50 text-slate-900 p-8 font-sans">
      <div className="max-w-6xl mx-auto space-y-10 mt-10">
        
        {/* Welcome Banner */}
        <div className="bg-white p-8 rounded-3xl shadow-xl border border-slate-200 relative overflow-hidden">
          <div className="absolute top-0 right-0 p-8 opacity-10 pointer-events-none">
             <svg className="w-48 h-48 text-rose-600" fill="currentColor" viewBox="0 0 24 24"><path d="M12 1L3 5v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V5l-9-4zm0 10.99h7c-.53 4.12-3.28 7.79-7 8.94V12H5V6.3l7-3.11v8.8z"/></svg>
          </div>
          
          <div className="relative z-10 flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
            <div>
              <h1 className="text-4xl font-extrabold text-slate-800 tracking-tight">
                Admin Command Center
              </h1>
              <p className="mt-2 text-slate-500 text-lg">
                Manage your institution's data and view global operations.
              </p>
            </div>
          </div>
        </div>

        {/* Action Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          
          <Link href="/admin/data" className="group">
            <div className="h-full bg-white p-8 rounded-3xl shadow-md border border-slate-200 hover:shadow-xl hover:border-amber-300 transition-all duration-300">
              <div className="w-14 h-14 bg-amber-100 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 group-hover:bg-amber-500 transition-all duration-300">
                <svg className="w-7 h-7 text-amber-600 group-hover:text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z"></path></svg>
              </div>
              <h2 className="text-2xl font-bold text-slate-800 mb-2">Add Staff/Students</h2>
              <p className="text-slate-500">Add or manage students, teachers, and hostel wardens.</p>
            </div>
          </Link>

          <Link href="/admin/attendance" className="group">
            <div className="h-full bg-white p-8 rounded-3xl shadow-md border border-slate-200 hover:shadow-xl hover:border-rose-300 transition-all duration-300">
              <div className="w-14 h-14 bg-rose-100 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 group-hover:bg-rose-500 transition-all duration-300">
                <svg className="w-7 h-7 text-rose-600 group-hover:text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"></path></svg>
              </div>
              <h2 className="text-2xl font-bold text-slate-800 mb-2">Global Attendance</h2>
              <p className="text-slate-500">View school-wide attendance metrics and the master student roster.</p>
            </div>
          </Link>

          <Link href="/admin/absentees" className="group">
            <div className="h-full bg-white p-8 rounded-3xl shadow-md border border-slate-200 hover:shadow-xl hover:border-violet-300 transition-all duration-300">
              <div className="w-14 h-14 bg-violet-100 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 group-hover:bg-violet-500 transition-all duration-300">
                <svg className="w-7 h-7 text-violet-600 group-hover:text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z"></path></svg>
              </div>
              <h2 className="text-2xl font-bold text-slate-800 mb-2">Absentees List</h2>
              <p className="text-slate-500">View students marked as absent.</p>
            </div>
          </Link>

          {session.plan !== 'BASIC' && (
            <>
              <Link href="/admin/notifications" className="group">
                <div className="h-full bg-white p-8 rounded-3xl shadow-md border border-slate-200 hover:shadow-xl hover:border-emerald-300 transition-all duration-300">
                  <div className="w-14 h-14 bg-emerald-100 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 group-hover:bg-emerald-500 transition-all duration-300">
                    <svg className="w-7 h-7 text-emerald-600 group-hover:text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"></path></svg>
                  </div>
                  <h2 className="text-2xl font-bold text-slate-800 mb-2">Notification Hub</h2>
                  <p className="text-slate-500">Monitor automated SMS & Email alerts.</p>
                </div>
              </Link>
              <Link href="/admin/timetable" className="group">
                <div className="h-full bg-white p-8 rounded-3xl shadow-md border border-slate-200 hover:shadow-xl hover:border-indigo-300 transition-all duration-300">
                  <div className="w-14 h-14 bg-indigo-100 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 group-hover:bg-indigo-500 transition-all duration-300">
                    <svg className="w-7 h-7 text-indigo-600 group-hover:text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"></path></svg>
                  </div>
                  <h2 className="text-2xl font-bold text-slate-800 mb-2">Smart Timetable</h2>
                  <p className="text-slate-500">Auto-generate schedules and resolve conflicts.</p>
                </div>
              </Link>
              <Link href="/admin/exams" className="group">
                <div className="h-full bg-white p-8 rounded-3xl shadow-md border border-slate-200 hover:shadow-xl hover:border-cyan-300 transition-all duration-300">
                  <div className="w-14 h-14 bg-cyan-100 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 group-hover:bg-cyan-500 transition-all duration-300">
                    <svg className="w-7 h-7 text-cyan-600 group-hover:text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"></path></svg>
                  </div>
                  <h2 className="text-2xl font-bold text-slate-800 mb-2">Exam Seating</h2>
                  <p className="text-slate-500">Auto-generate exam seating arrangements.</p>
                </div>
              </Link>
            </>
          )}

        </div>

      </div>
    </main>
  );
}
