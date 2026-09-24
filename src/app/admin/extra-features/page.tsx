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

export default function ExtraFeaturesHub() {
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
             <svg className="w-48 h-48 text-amber-600" fill="currentColor" viewBox="0 0 24 24"><path d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z"/></svg>
          </div>
          
          <div className="relative z-10">
            <h1 className="text-4xl font-extrabold text-slate-800 tracking-tight">
              Extra Features
            </h1>
            <p className="mt-2 text-slate-500 text-lg">
              Manage student enrollment, class timetables, and exam seating.
            </p>
          </div>
        </div>

        <div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            
            <Link href="/admin/data" className="group">
              <div className="h-full bg-white p-8 rounded-3xl shadow-md border border-slate-200 hover:shadow-xl hover:border-amber-300 transition-all duration-300">
                <div className="w-14 h-14 bg-amber-100 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 group-hover:bg-amber-500 transition-all duration-300">
                  <svg className="w-7 h-7 text-amber-600 group-hover:text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z"></path></svg>
                </div>
                <h2 className="text-2xl font-bold text-slate-800 mb-2">Enrollment Students</h2>
                <p className="text-slate-500">Manage admission & users.</p>
              </div>
            </Link>

            <Link href="/admin/timetable" className="group">
              <div className="h-full bg-white p-8 rounded-3xl shadow-md border border-slate-200 hover:shadow-xl hover:border-indigo-300 transition-all duration-300">
                <div className="w-14 h-14 bg-indigo-100 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 group-hover:bg-indigo-500 transition-all duration-300">
                  <svg className="w-7 h-7 text-indigo-600 group-hover:text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"></path></svg>
                </div>
                <h2 className="text-2xl font-bold text-slate-800 mb-2">Time Table</h2>
                <p className="text-slate-500">Auto-generate schedules.</p>
              </div>
            </Link>

            <Link href="/admin/exams" className="group">
              <div className="h-full bg-white p-8 rounded-3xl shadow-md border border-slate-200 hover:shadow-xl hover:border-fuchsia-300 transition-all duration-300">
                <div className="w-14 h-14 bg-fuchsia-100 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 group-hover:bg-fuchsia-500 transition-all duration-300">
                  <svg className="w-7 h-7 text-fuchsia-600 group-hover:text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"></path></svg>
                </div>
                <h2 className="text-2xl font-bold text-slate-800 mb-2">Exam Seating</h2>
                <p className="text-slate-500">Generate seating plan.</p>
              </div>
            </Link>

          </div>
        </div>

      </div>
    </div>
  );
}
