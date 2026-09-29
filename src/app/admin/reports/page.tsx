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
      setSession({
        id: '1',
        email: 'admin@system.com',
        role: 'SYSTEM_ADMIN',
        tenantId: '1',
      });
      return;
    }
    const parsed = JSON.parse(stored);
    if (parsed.role !== 'SYSTEM_ADMIN' && parsed.role !== 'SCHOOL_ADMIN') {
      router.push('/');
      return;
    }
    setSession(parsed);
  }, [router]);

  if (!session) return null;

  return (
    <div className="max-w-6xl mx-auto space-y-8 font-sans pl-0 md:pl-8 pb-12">
      {/* Header Banner matching app style */}
      <div className="relative overflow-hidden bg-gradient-to-r from-blue-50/90 via-indigo-50/80 to-blue-100/60 rounded-3xl p-8 border border-blue-100 flex flex-col md:flex-row items-center justify-between shadow-xs">
        <div className="space-y-2 max-w-xl z-10">
          <span className="text-xs font-bold uppercase tracking-wider text-indigo-600 bg-indigo-100/80 px-3 py-1 rounded-full inline-block">
            Reports & Analytics
          </span>
          <h1 className="text-3xl sm:text-4xl font-extrabold text-slate-900 tracking-tight">
            Reports Hub
          </h1>
          <p className="text-slate-600 text-sm sm:text-base font-medium">
            Manage school attendance, academic performance, absentees, and export reports.
          </p>
        </div>

        <div className="mt-6 md:mt-0 relative w-64 h-28 flex items-center justify-center">
          <div className="bg-white/80 backdrop-blur-xs rounded-2xl p-4 shadow-sm border border-blue-100 flex items-center gap-4 w-full">
            <div className="w-12 h-12 bg-indigo-600 rounded-xl flex items-center justify-center text-white shadow-sm">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
            </div>
            <div className="flex flex-col">
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Reports Center</span>
              <span className="text-sm font-extrabold text-indigo-600">5 Modules Active</span>
            </div>
          </div>
        </div>
      </div>

      {/* Grid of Report Modules */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {/* Module 1: Global Attendance */}
        <Link href="/admin/attendance" className="group">
          <div className="h-full bg-white p-6 rounded-2xl border border-rose-100 shadow-2xs hover:shadow-md hover:border-rose-300 transition-all duration-200 flex flex-col justify-between">
            <div>
              <div className="w-12 h-12 bg-rose-50 rounded-2xl flex items-center justify-center text-rose-500 mb-5 group-hover:scale-105 transition-transform">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
              </div>
              <h2 className="text-lg font-bold text-slate-900 mb-1.5">Global Attendance</h2>
              <p className="text-slate-500 text-xs leading-relaxed">
                View school-wide attendance metrics and the master student roster.
              </p>
            </div>
            <div className="mt-6 flex justify-end">
              <div className="w-8 h-8 rounded-full bg-rose-50 group-hover:bg-rose-500 text-rose-600 group-hover:text-white flex items-center justify-center transition-colors">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M14 5l7 7m0 0l-7 7m7-7H3" />
                </svg>
              </div>
            </div>
          </div>
        </Link>

        {/* Module 3: Academic Performance */}
        <Link href="/academic/marks" className="group">
          <div className="h-full bg-white p-6 rounded-2xl border border-blue-100 shadow-2xs hover:shadow-md hover:border-blue-300 transition-all duration-200 flex flex-col justify-between">
            <div>
              <div className="w-12 h-12 bg-blue-50 rounded-2xl flex items-center justify-center text-blue-500 mb-5 group-hover:scale-105 transition-transform">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                </svg>
              </div>
              <h2 className="text-lg font-bold text-slate-900 mb-1.5">Academic Performance</h2>
              <p className="text-slate-500 text-xs leading-relaxed">
                Record exam scores and manage student marks and grades.
              </p>
            </div>
            <div className="mt-6 flex justify-end">
              <div className="w-8 h-8 rounded-full bg-blue-50 group-hover:bg-blue-500 text-blue-600 group-hover:text-white flex items-center justify-center transition-colors">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M14 5l7 7m0 0l-7 7m7-7H3" />
                </svg>
              </div>
            </div>
          </div>
        </Link>

        {/* Module 4: Download Reports */}
        <Link href="/reports" className="group">
          <div className="h-full bg-white p-6 rounded-2xl border border-cyan-100 shadow-2xs hover:shadow-md hover:border-cyan-300 transition-all duration-200 flex flex-col justify-between">
            <div>
              <div className="w-12 h-12 bg-cyan-50 rounded-2xl flex items-center justify-center text-cyan-500 mb-5 group-hover:scale-105 transition-transform">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                </svg>
              </div>
              <h2 className="text-lg font-bold text-slate-900 mb-1.5">Download Reports</h2>
              <p className="text-slate-500 text-xs leading-relaxed">
                Export attendance sheets and student marksheets to CSV.
              </p>
            </div>
            <div className="mt-6 flex justify-end">
              <div className="w-8 h-8 rounded-full bg-cyan-50 group-hover:bg-cyan-500 text-cyan-600 group-hover:text-white flex items-center justify-center transition-colors">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M14 5l7 7m0 0l-7 7m7-7H3" />
                </svg>
              </div>
            </div>
          </div>
        </Link>

        {/* Module 5: Notification Hub */}
        <Link href="/admin/notifications" className="group">
          <div className="h-full bg-white p-6 rounded-2xl border border-emerald-100 shadow-2xs hover:shadow-md hover:border-emerald-300 transition-all duration-200 flex flex-col justify-between">
            <div>
              <div className="w-12 h-12 bg-emerald-50 rounded-2xl flex items-center justify-center text-emerald-500 mb-5 group-hover:scale-105 transition-transform">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                </svg>
              </div>
              <h2 className="text-lg font-bold text-slate-900 mb-1.5">Notification Hub</h2>
              <p className="text-slate-500 text-xs leading-relaxed">
                Monitor automated SMS & Email alerts dispatched to parents.
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

        {/* Module 6: Excused Absences */}
        <Link href="/admin/excused-absences" className="group">
          <div className="h-full bg-white p-6 rounded-2xl border border-amber-100 shadow-2xs hover:shadow-md hover:border-amber-300 transition-all duration-200 flex flex-col justify-between">
            <div>
              <div className="w-12 h-12 bg-amber-50 rounded-2xl flex items-center justify-center text-amber-500 mb-5 group-hover:scale-105 transition-transform">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                </svg>
              </div>
              <h2 className="text-lg font-bold text-slate-900 mb-1.5">Excused Absences</h2>
              <p className="text-slate-500 text-xs leading-relaxed">
                Manage pre-requested leave and suppress absence SMS alerts.
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
      </div>
    </div>
  );
}
