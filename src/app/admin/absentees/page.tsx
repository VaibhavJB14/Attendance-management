'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

interface Student {
  id: string;
  firstName: string;
  lastName: string;
  grade: string;
  section: string;
  isHosteler: boolean;
  hostelName: string | null;
}

interface UserSession {
  id: string;
  email: string;
  role: string;
  tenantId: string;
}

export default function AbsenteesList() {
  const router = useRouter();
  const [session, setSession] = useState<UserSession | null>(null);
  
  const [absentStudents, setAbsentStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const stored = localStorage.getItem('session');
    if (!stored) {
      router.push('/login');
      return;
    }
    const user = JSON.parse(stored);
    if (user.role !== 'SYSTEM_ADMIN' && user.role !== 'SCHOOL_ADMIN') {
      router.push('/');
      return;
    }
    setSession(user);

    const fetchData = async () => {
      setLoading(true);
      try {
        // 1. Fetch all students
        const stuRes = await fetch('/api/students', {
          headers: { 'x-tenant-id': user.tenantId }
        });
        
        let allStudents: Student[] = [];
        if (stuRes.ok) {
          const stuData = await stuRes.json();
          allStudents = stuData.students;
        }

        // 2. Fetch today's attendance map
        const today = new Date().toISOString().split('T')[0];
        const attRes = await fetch(`/api/attendance?date=${today}`, {
          headers: { 'x-tenant-id': user.tenantId }
        });
        
        let absentStudentIds = new Set<string>();
        
        if (attRes.ok) {
          const attData = await attRes.json();
          attData.attendance.forEach((r: any) => {
            if (r.status === 'ABSENT') {
              absentStudentIds.add(r.studentId);
            }
          });
        }
        
        // Filter students to only those who are absent
        const filtered = allStudents.filter(s => absentStudentIds.has(s.id));
        setAbsentStudents(filtered);

      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [router]);

  if (!session) return null;

  return (
    <main className="min-h-screen bg-slate-50 text-slate-900 p-8 font-sans">
      <div className="max-w-6xl mx-auto space-y-8 mt-10">
        
        {/* Navigation Header */}
        <div className="flex items-center justify-between">
          <Link href="/admin" className="flex items-center text-violet-600 font-semibold hover:text-violet-800 transition-colors">
            <svg className="w-5 h-5 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7"></path></svg>
            Back to Admin Hub
          </Link>
          <div className="px-4 py-1.5 bg-violet-100 text-violet-800 rounded-full text-xs font-bold uppercase tracking-wider border border-violet-200 shadow-sm flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-violet-500 animate-pulse"></div>
            System Admin
          </div>
        </div>

        {/* Header */}
        <div>
          <h1 className="text-4xl font-extrabold text-slate-800 tracking-tight">
            Today's Absentees
          </h1>
          <p className="mt-2 text-slate-500 text-lg">
            List of all students marked as absent today.
          </p>
        </div>

        {loading ? (
          <div className="p-16 flex justify-center items-center space-x-2">
            <div className="w-3 h-3 bg-violet-500 rounded-full animate-bounce"></div>
            <div className="w-3 h-3 bg-violet-500 rounded-full animate-bounce [animation-delay:-0.15s]"></div>
            <div className="w-3 h-3 bg-violet-500 rounded-full animate-bounce [animation-delay:-0.3s]"></div>
          </div>
        ) : (
          <>
            <div className="bg-white p-6 rounded-2xl shadow-md border border-slate-200 w-max mb-6">
              <p className="text-sm font-semibold text-slate-500 uppercase tracking-wider">Total Absentees</p>
              <p className="text-4xl font-black text-rose-600 mt-2">{absentStudents.length}</p>
            </div>

            {/* Global Master List */}
            <div className="bg-white rounded-2xl shadow-xl border border-slate-200 overflow-hidden">
              <div className="p-6 border-b border-slate-200 bg-slate-50 flex justify-between items-center">
                <div>
                  <h2 className="text-xl font-bold text-slate-800">Absentees Roster</h2>
                  <p className="text-sm text-slate-500 mt-1">Students who are not present today.</p>
                </div>
              </div>
              
              {absentStudents.length === 0 ? (
                <div className="p-12 text-center text-slate-500 font-medium">
                  No absentees recorded today. Everyone is present or attendance is pending.
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-slate-100 text-slate-600 text-xs uppercase tracking-wider font-semibold border-b border-slate-200">
                        <th className="px-6 py-4">Student Name</th>
                        <th className="px-6 py-4">Class</th>
                        <th className="px-6 py-4">Type</th>
                        <th className="px-6 py-4 text-right">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {absentStudents.map((student) => {
                        return (
                        <tr key={student.id} className="hover:bg-slate-50 transition-colors">
                          <td className="px-6 py-4 font-semibold text-slate-800">
                            <div className="flex items-center gap-3">
                              <div className="w-8 h-8 rounded-full bg-violet-100 text-violet-600 flex items-center justify-center text-xs font-bold border border-violet-200">
                                {student.firstName[0]}
                              </div>
                              {student.firstName} {student.lastName}
                            </div>
                          </td>
                          <td className="px-6 py-4 font-medium text-slate-600">{student.grade} - {student.section}</td>
                          <td className="px-6 py-4">
                            {student.isHosteler ? (
                              <span className="px-2.5 py-1 bg-amber-100 text-amber-800 rounded-md text-xs font-bold uppercase tracking-wider border border-amber-200">
                                Hosteler
                              </span>
                            ) : (
                              <span className="px-2.5 py-1 bg-slate-100 text-slate-600 rounded-md text-xs font-bold uppercase tracking-wider border border-slate-200">
                                Day Scholar
                              </span>
                            )}
                          </td>
                          <td className="px-6 py-4 text-right">
                            <span className="text-rose-600 font-bold text-sm">ABSENT</span>
                          </td>
                        </tr>
                      )})}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </>
        )}

      </div>
    </main>
  );
}
