'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

interface UserSession {
  id: string;
  email: string;
  role: string;
  tenantId: string;
}

export default function ReportsHub() {
  const router = useRouter();
  const [session, setSession] = useState<UserSession | null>(null);

  useEffect(() => {
    const stored = localStorage.getItem('session');
    if (!stored) {
      router.push('/login');
      return;
    }
    const parsed = JSON.parse(stored);
    if (parsed.role !== 'SYSTEM_ADMIN' && parsed.role !== 'SCHOOL_ADMIN') {
      router.push('/');
      return;
    }
    setSession(parsed);
  }, [router]);

  if (!session) return <div className="min-h-screen bg-slate-50 flex items-center justify-center"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div></div>;

  return (
    <div className="min-h-screen bg-slate-50/50 flex flex-col">
      <div className="flex-1 max-w-6xl mx-auto w-full p-6 md:p-8 mt-2 md:mt-6">
        
        {/* Navigation Header */}
        <div className="flex items-center justify-between mb-8">
          <Link href="/" className="flex items-center text-indigo-600 font-semibold hover:text-indigo-800 transition-colors">
            <svg className="w-5 h-5 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7"></path></svg>
            Back to Profile
          </Link>
        </div>

        {/* Large Header */}
        <div className="bg-white p-8 rounded-3xl shadow-xl border border-slate-200 relative overflow-hidden mb-12">
          <div className="absolute top-0 right-0 p-8 opacity-10 pointer-events-none">
             <svg className="w-48 h-48 text-indigo-600" fill="currentColor" viewBox="0 0 24 24"><path d="M12 22c1.1 0 2-.9 2-2h-4c0 1.1.9 2 2 2zm6-6v-5c0-3.07-1.63-5.64-4.5-6.32V4c0-.83-.67-1.5-1.5-1.5s-1.5.67-1.5 1.5v.68C7.64 5.36 6 7.92 6 11v5l-2 2v1h16v-1l-2-2zm-2 1H8v-6c0-2.48 1.51-4.5 4-4.5s4 2.02 4 4.5v6z"/></svg>
          </div>
          
          <div className="relative z-10">
            <h1 className="text-4xl font-extrabold text-slate-800 tracking-tight">
              Reports Hub
            </h1>
            <p className="mt-2 text-slate-500 text-lg">
              Manage school attendance, academic marks, and system notifications.
            </p>
          </div>
        </div>

        <div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            
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

            <Link href="/academic/marks" className="group">
              <div className="h-full bg-white p-8 rounded-3xl shadow-md border border-slate-200 hover:shadow-xl hover:border-blue-300 transition-all duration-300">
                <div className="w-14 h-14 bg-blue-100 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 group-hover:bg-blue-500 transition-all duration-300">
                  <svg className="w-7 h-7 text-blue-600 group-hover:text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"></path></svg>
                </div>
                <h2 className="text-2xl font-bold text-slate-800 mb-2">Academic Performance</h2>
                <p className="text-slate-500">Record exam scores and manage student marks.</p>
              </div>
            </Link>

            <Link href="/reports" className="group">
              <div className="h-full bg-white p-8 rounded-3xl shadow-md border border-slate-200 hover:shadow-xl hover:border-cyan-300 transition-all duration-300">
                <div className="w-14 h-14 bg-cyan-100 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 group-hover:bg-cyan-500 transition-all duration-300">
                  <svg className="w-7 h-7 text-cyan-600 group-hover:text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"></path></svg>
                </div>
                <h2 className="text-2xl font-bold text-slate-800 mb-2">Download Reports</h2>
                <p className="text-slate-500">Export attendance sheets and individual student marksheets to CSV.</p>
              </div>
            </Link>

            <Link href="/admin/notifications" className="group">
              <div className="h-full bg-white p-8 rounded-3xl shadow-md border border-slate-200 hover:shadow-xl hover:border-emerald-300 transition-all duration-300">
                <div className="w-14 h-14 bg-emerald-100 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 group-hover:bg-emerald-500 transition-all duration-300">
                  <svg className="w-7 h-7 text-emerald-600 group-hover:text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"></path></svg>
                </div>
                <h2 className="text-2xl font-bold text-slate-800 mb-2">Notification Hub</h2>
                <p className="text-slate-500">Monitor automated SMS & Email alerts.</p>
              </div>
            </Link>

            <Link href="/admin/excused-absences" className="group">
              <div className="h-full bg-white p-8 rounded-3xl shadow-md border border-slate-200 hover:shadow-xl hover:border-amber-300 transition-all duration-300">
                <div className="w-14 h-14 bg-amber-100 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 group-hover:bg-amber-500 transition-all duration-300">
                  <svg className="w-7 h-7 text-amber-600 group-hover:text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"></path></svg>
                </div>
                <h2 className="text-2xl font-bold text-slate-800 mb-2">Excused Absences</h2>
                <p className="text-slate-500">Manage pre-requested leave and suppress absence SMS alerts.</p>
              </div>
            </Link>
          </div>
        </div>

      </div>
    </div>
  );
}
