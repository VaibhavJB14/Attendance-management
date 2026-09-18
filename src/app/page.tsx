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
        
        {/* Modern Hero Banner */}
        <div className="relative overflow-hidden rounded-3xl bg-white shadow-xl shadow-slate-200/50 border border-slate-100 p-8 md:p-12 flex flex-col md:flex-row items-center justify-between gap-8">
          <div className="absolute top-0 right-0 w-72 h-72 bg-indigo-50 rounded-full blur-3xl -mr-24 -mt-24 opacity-60"></div>
          <div className="absolute bottom-0 left-0 w-72 h-72 bg-blue-50 rounded-full blur-3xl -ml-24 -mb-24 opacity-60"></div>
          
          <div className="relative z-10 max-w-2xl">
            <h1 className="text-4xl md:text-5xl font-extrabold text-slate-800 tracking-tight leading-tight mb-4">
              Welcome back to <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-600 to-blue-500">{session.tenantName}</span>
            </h1>
            <p className="text-lg text-slate-500 mb-8 leading-relaxed">
              Manage your student attendance, generate comprehensive reports, and oversee daily school operations all from your central command hub.
            </p>
            <div className="hidden items-center gap-2">
              <span className="flex h-3 w-3 relative">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500"></span>
              </span>
              <span className="text-sm font-semibold text-slate-600">Plan Status: <span className="text-emerald-600 uppercase tracking-wide">{session.plan}</span></span>
            </div>
          </div>

          <div className="relative z-10 hidden lg:block opacity-80">
            <svg className="w-48 h-48 text-indigo-100" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 4c1.93 0 3.5 1.57 3.5 3.5S13.93 13 12 13s-3.5-1.57-3.5-3.5S10.07 6 12 6zm0 14c-2.03 0-4.43-.82-6.14-2.88C7.55 15.8 9.68 15 12 15s4.45.8 6.14 2.12C16.43 19.18 14.03 20 12 20z"/></svg>
          </div>
        </div>

        {/* Action Grid */}
        <div>
          <h2 className="text-2xl font-bold text-slate-800 mb-6 flex items-center gap-2">
            <svg className="w-6 h-6 text-indigo-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z"></path></svg>
            Quick Actions
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            
            {session.role === 'SYSTEM_ADMIN' && (
              <Link href="/admin" className="group">
                <div className="h-full bg-white p-8 rounded-3xl shadow-sm border border-slate-200 hover:shadow-xl hover:border-rose-300 transition-all duration-300 relative overflow-hidden">
                  <div className="absolute top-0 right-0 p-4 opacity-5 pointer-events-none">
                     <svg className="w-24 h-24 text-rose-600" fill="currentColor" viewBox="0 0 24 24"><path d="M12 1L3 5v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V5l-9-4zm0 10.99h7c-.53 4.12-3.28 7.79-7 8.94V12H5V6.3l7-3.11v8.8z"/></svg>
                  </div>
                  <div className="w-14 h-14 bg-rose-50 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 group-hover:bg-rose-600 transition-all duration-300 relative z-10">
                    <svg className="w-7 h-7 text-rose-600 group-hover:text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4"></path></svg>
                  </div>
                  <h2 className="text-2xl font-bold text-slate-800 mb-2 relative z-10">Admin Panel</h2>
                  <p className="text-slate-500 relative z-10">Global oversight of school attendance and statistics.</p>
                </div>
              </Link>
            )}

            {(session.role === 'TEACHER' || session.role === 'WARDEN') && (
              <Link href={session.role === 'WARDEN' ? "/warden" : "/attendance"} className="group">
                <div className="h-full bg-white p-8 rounded-3xl shadow-sm border border-slate-200 hover:shadow-xl hover:border-indigo-300 transition-all duration-300">
                  <div className="w-14 h-14 bg-indigo-50 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 group-hover:bg-indigo-600 transition-all duration-300">
                    <svg className="w-7 h-7 text-indigo-600 group-hover:text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
                  </div>
                  <h2 className="text-2xl font-bold text-slate-800 mb-2">{session.role === 'WARDEN' ? 'Warden Dashboard' : 'Mark Attendance'}</h2>
                  <p className="text-slate-500">{session.role === 'WARDEN' ? 'Record nightly attendance for hostelers by room.' : 'Record daily attendance for your designated grades and sections.'}</p>
                </div>
              </Link>
            )}

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
            
            {(session.role === 'TEACHER' || session.role === 'SYSTEM_ADMIN' || session.role === 'SCHOOL_ADMIN') && (
              <Link href="/academic/marks" className="group">
                <div className="h-full bg-white p-8 rounded-3xl shadow-sm border border-slate-200 hover:shadow-xl hover:border-violet-300 transition-all duration-300">
                  <div className="w-14 h-14 bg-violet-50 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 group-hover:bg-violet-600 transition-all duration-300">
                    <svg className="w-7 h-7 text-violet-600 group-hover:text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"></path></svg>
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
      </div>
    </main>
  );
}
