'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

interface UserSession {
  id: string;
  email: string;
  role: string;
  tenantId: string;
}

interface Student {
  id: string;
  firstName: string;
  lastName: string;
  grade: string;
  section: string;
  rollNumber: string | null;
}

interface ExcusedAbsence {
  id: string;
  studentId: string;
  date: string;
  reason: string | null;
  student: {
    firstName: string;
    lastName: string;
    rollNumber: string | null;
    grade: string;
    section: string;
  };
}

export default function ExcusedAbsencesPage() {
  const router = useRouter();
  const [session, setSession] = useState<UserSession | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Form State
  const [date, setDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [searchQuery, setSearchQuery] = useState('');
  const [students, setStudents] = useState<Student[]>([]);
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
  const [reason, setReason] = useState('');
  const [submitting, setSubmitting] = useState(false);
  
  // List State
  const [absences, setAbsences] = useState<ExcusedAbsence[]>([]);

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
    setLoading(false);
  }, [router]);

  useEffect(() => {
    if (session) {
      fetchStudents();
    }
  }, [session]);

  useEffect(() => {
    if (session && date) {
      fetchAbsences();
    }
  }, [session, date]);

  const fetchStudents = async () => {
    try {
      const res = await fetch('/api/students', {
        headers: { 'x-tenant-id': session!.tenantId }
      });
      if (res.ok) {
        const data = await res.json();
        setStudents(data.students);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const fetchAbsences = async () => {
    try {
      const res = await fetch(`/api/excused-absences?date=${date}`, {
        headers: { 'x-tenant-id': session!.tenantId }
      });
      if (res.ok) {
        const data = await res.json();
        setAbsences(data.absences);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleGrantPermission = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedStudent || !date) return;

    setSubmitting(true);
    setError(null);

    try {
      const res = await fetch('/api/excused-absences', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-tenant-id': session!.tenantId
        },
        body: JSON.stringify({
          studentId: selectedStudent.id,
          date,
          reason
        })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to grant permission');
      
      setReason('');
      setSelectedStudent(null);
      setSearchQuery('');
      fetchAbsences();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleRevoke = async (id: string) => {
    if (!confirm('Are you sure you want to revoke this excused absence?')) return;
    try {
      const res = await fetch(`/api/excused-absences?id=${id}`, {
        method: 'DELETE',
        headers: { 'x-tenant-id': session!.tenantId }
      });
      if (res.ok) {
        fetchAbsences();
      } else {
        const data = await res.json();
        alert(data.error || 'Failed to revoke');
      }
    } catch (err) {
      console.error(err);
    }
  };

  const filteredStudents = searchQuery.length > 2 
    ? students.filter(s => 
        `${s.firstName} ${s.lastName} ${s.rollNumber || ''}`.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : [];

  if (loading) return <div className="min-h-screen bg-slate-50 flex items-center justify-center"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-amber-600"></div></div>;

  return (
    <div className="min-h-screen bg-slate-50/50 flex flex-col">
      <div className="flex-1 max-w-6xl mx-auto w-full p-6 md:p-8 mt-2 md:mt-6">
        
        {/* Navigation Header */}
        <div className="flex items-center justify-between mb-8">
          <Link href="/admin/reports" className="flex items-center text-amber-600 font-semibold hover:text-amber-800 transition-colors">
            <svg className="w-5 h-5 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7"></path></svg>
            Back to Reports Hub
          </Link>
        </div>

        {/* Large Header */}
        <div className="bg-white p-8 rounded-3xl shadow-xl border border-slate-200 relative overflow-hidden mb-8">
          <div className="absolute top-0 right-0 p-8 opacity-10 pointer-events-none">
             <svg className="w-48 h-48 text-amber-600" fill="currentColor" viewBox="0 0 24 24"><path d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"/></svg>
          </div>
          
          <div className="relative z-10">
            <h1 className="text-4xl font-extrabold text-slate-800 tracking-tight">
              Excused Absences
            </h1>
            <p className="mt-2 text-slate-500 text-lg max-w-2xl">
              Grant permission for a student to be absent. If a student is marked absent by a teacher on an excused date, the automated SMS alert to parents will be suppressed.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* Grant Permission Form */}
          <div className="lg:col-span-1">
            <div className="bg-white p-6 rounded-3xl shadow-md border border-slate-200">
              <h2 className="text-xl font-bold text-slate-800 mb-6">Grant Permission</h2>
              
              <form onSubmit={handleGrantPermission} className="space-y-5">
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1">Date</label>
                  <input
                    type="date"
                    required
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-300 text-slate-900 rounded-lg p-2.5 focus:ring-amber-500 focus:border-amber-500"
                  />
                </div>

                <div className="relative">
                  <label className="block text-sm font-semibold text-slate-700 mb-1">Search Student</label>
                  <input
                    type="text"
                    placeholder="Type name or roll number..."
                    value={searchQuery}
                    onChange={(e) => {
                      setSearchQuery(e.target.value);
                      setSelectedStudent(null);
                    }}
                    className="w-full bg-slate-50 border border-slate-300 text-slate-900 rounded-lg p-2.5 focus:ring-amber-500 focus:border-amber-500"
                  />
                  
                  {searchQuery.length > 2 && !selectedStudent && (
                    <div className="absolute z-10 mt-1 w-full bg-white shadow-xl border border-slate-200 rounded-lg max-h-60 overflow-auto">
                      {filteredStudents.length > 0 ? (
                        <ul className="divide-y divide-slate-100">
                          {filteredStudents.map(student => (
                            <li 
                              key={student.id} 
                              onClick={() => {
                                setSelectedStudent(student);
                                setSearchQuery(`${student.firstName} ${student.lastName}`);
                              }}
                              className="p-3 hover:bg-amber-50 cursor-pointer flex justify-between items-center"
                            >
                              <div>
                                <p className="font-semibold text-slate-800">{student.firstName} {student.lastName}</p>
                                <p className="text-xs text-slate-500">{student.grade} - {student.section}</p>
                              </div>
                              <span className="text-xs font-mono bg-slate-100 px-2 py-1 rounded text-slate-600">
                                {student.rollNumber || 'No Roll'}
                              </span>
                            </li>
                          ))}
                        </ul>
                      ) : (
                        <div className="p-4 text-center text-slate-500 text-sm">No students found</div>
                      )}
                    </div>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1">Reason (Optional)</label>
                  <input
                    type="text"
                    placeholder="e.g. Medical, Family event..."
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-300 text-slate-900 rounded-lg p-2.5 focus:ring-amber-500 focus:border-amber-500"
                  />
                </div>

                {error && <div className="text-red-600 text-sm font-medium p-3 bg-red-50 rounded-lg border border-red-200">{error}</div>}

                <button
                  type="submit"
                  disabled={!selectedStudent || submitting}
                  className="w-full bg-amber-500 hover:bg-amber-600 disabled:opacity-50 text-white font-bold py-3 px-4 rounded-xl shadow-md transition-all flex items-center justify-center gap-2"
                >
                  {submitting ? 'Processing...' : 'Grant Permission'}
                </button>
              </form>
            </div>
          </div>

          {/* List of Permissions */}
          <div className="lg:col-span-2">
            <div className="bg-white p-6 rounded-3xl shadow-md border border-slate-200 h-full">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-xl font-bold text-slate-800">Excused Absences on {new Date(date).toLocaleDateString()}</h2>
                <span className="bg-amber-100 text-amber-800 text-xs font-bold px-3 py-1 rounded-full">
                  {absences.length} Records
                </span>
              </div>

              {absences.length === 0 ? (
                <div className="text-center py-16 bg-slate-50 rounded-2xl border border-dashed border-slate-300">
                  <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4 text-slate-400">
                    <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path></svg>
                  </div>
                  <h3 className="text-lg font-bold text-slate-700">No Excused Absences</h3>
                  <p className="text-slate-500 mt-1 max-w-sm mx-auto">There are no approved leave requests for the selected date.</p>
                </div>
              ) : (
                <div className="overflow-x-auto rounded-xl border border-slate-200">
                  <table className="w-full text-left">
                    <thead className="bg-slate-50 text-slate-600 text-sm uppercase font-semibold">
                      <tr>
                        <th className="px-6 py-4">Student</th>
                        <th className="px-6 py-4">Class</th>
                        <th className="px-6 py-4">Reason</th>
                        <th className="px-6 py-4 text-right">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {absences.map((absence) => (
                        <tr key={absence.id} className="hover:bg-slate-50 transition-colors">
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-3">
                              <div className="w-8 h-8 rounded-full bg-amber-100 text-amber-600 flex items-center justify-center text-xs font-bold">
                                {absence.student.firstName[0]}
                              </div>
                              <div>
                                <p className="font-semibold text-slate-800">{absence.student.firstName} {absence.student.lastName}</p>
                                <p className="text-xs text-slate-500">{absence.student.rollNumber || 'No Roll No'}</p>
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-800">
                              {absence.student.grade} - {absence.student.section}
                            </span>
                          </td>
                          <td className="px-6 py-4 text-sm text-slate-600">
                            {absence.reason || <span className="text-slate-400 italic">No reason provided</span>}
                          </td>
                          <td className="px-6 py-4 text-right">
                            <button
                              onClick={() => handleRevoke(absence.id)}
                              className="text-red-500 hover:text-red-700 hover:bg-red-50 p-2 rounded-lg transition-colors"
                              title="Revoke Permission"
                            >
                              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path></svg>
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
          
        </div>
      </div>
    </div>
  );
}
