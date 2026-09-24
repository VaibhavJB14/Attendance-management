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
  isHosteler?: boolean;
  hostelName?: string;
  roomNumber?: string;
}

interface UserSession {
  id: string;
  email: string;
  role: string;
  tenantId: string;
}

export default function Reports() {
  const router = useRouter();
  const [session, setSession] = useState<UserSession | null>(null);
  const [students, setStudents] = useState<Student[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(false);

  // Filters
  const [filterGrade, setFilterGrade] = useState('');
  const [filterSection, setFilterSection] = useState('');
  const [filterTimeframe, setFilterTimeframe] = useState('all');
  const [filterMonth, setFilterMonth] = useState((new Date().getMonth() + 1).toString());
  const [filterYear, setFilterYear] = useState(new Date().getFullYear().toString());

  const [schoolClasses, setSchoolClasses] = useState<any[]>([]);
  const uniqueGrades = Array.from(new Set(schoolClasses.map((c: any) => c.grade)));
  const getSectionsForGrade = (grade: string) => schoolClasses.filter((c: any) => c.grade === grade).map((c: any) => c.section);

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

  useEffect(() => {
    const stored = localStorage.getItem('session');
    if (!stored) {
      router.push('/login');
      return;
    }
    const user = JSON.parse(stored);
    
    // Wardens can access, but will see a different view
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setSession(user);

    const fetchStudents = async () => {
      setLoading(true);
      try {
        const url = user.role === 'WARDEN' ? `/api/students?isHosteler=true` : `/api/students`;
        const response = await fetch(url, {
          headers: { 'x-tenant-id': user.tenantId }
        });
        if (response.ok) {
          const data = await response.json();
          setStudents(data.students);
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchStudents();
  }, [router]);

  const buildQueryParams = () => {
    let params = `tenantId=${session?.tenantId}`;
    if (filterGrade) params += `&grade=${encodeURIComponent(filterGrade)}`;
    if (filterSection) params += `&section=${encodeURIComponent(filterSection)}`;
    if (filterTimeframe !== 'all') {
      params += `&timeframe=${encodeURIComponent(filterTimeframe)}`;
      if (filterTimeframe === 'specific_month') {
        params += `&month=${encodeURIComponent(filterMonth)}&year=${encodeURIComponent(filterYear)}`;
      }
    }
    return params;
  };

  const downloadAll = async () => {
    if (!session) return;
    window.open(`/api/export?${buildQueryParams()}`, '_blank');
  };

  const downloadStudent = async (studentId: string) => {
    if (!session) return;
    window.open(`/api/export?${buildQueryParams()}&studentId=${studentId}`, '_blank');
  };

  const downloadHostel = async (hostel: string) => {
    if (!session) return;
    window.open(`/api/export?${buildQueryParams()}&hostelName=${encodeURIComponent(hostel)}`, '_blank');
  };

  if (!session) return null;

  const filteredStudents = students.filter(student => {
    const matchesSearch = `${student.firstName} ${student.lastName}`.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesGrade = filterGrade ? student.grade === filterGrade : true;
    const matchesSection = filterSection ? student.section === filterSection : true;
    return matchesSearch && matchesGrade && matchesSection;
  });

  return (
    <main className="min-h-screen bg-slate-50 text-slate-900 p-8 font-sans">
      <div className="max-w-6xl mx-auto space-y-8 mt-10">
        
        {/* Navigation Header */}
        <div className="flex items-center justify-between">
          {(session?.role === 'SYSTEM_ADMIN' || session?.role === 'SCHOOL_ADMIN') ? (
            <Link href="/admin/reports" className="flex items-center text-indigo-600 font-semibold hover:text-indigo-800 transition-colors">
              <svg className="w-5 h-5 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7"></path></svg>
              Back to Reports Hub
            </Link>
          ) : (
            <Link href="/" className="flex items-center text-indigo-600 font-semibold hover:text-indigo-800 transition-colors">
              <svg className="w-5 h-5 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7"></path></svg>
              Back to Dashboard
            </Link>
          )}
          <button 
            onClick={downloadAll}
            className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-xl shadow-md transition-all active:scale-95 flex items-center gap-2"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"></path></svg>
            {session?.role === 'WARDEN' ? 'Export All Hostelers' : 'Export All Students'}
          </button>
        </div>

        <div className="bg-white p-8 rounded-3xl shadow-xl border border-slate-200">
          <h1 className="text-3xl font-extrabold text-slate-800 tracking-tight mb-6">
            Download Attendance Reports
          </h1>
          
          <div className="mb-6 space-y-4">
            <div className="flex flex-col md:flex-row gap-4">
              <input 
                type="text" 
                placeholder="Search specific student to download their record..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="flex-1 bg-slate-50 border border-slate-200 text-slate-800 rounded-xl focus:ring-indigo-500 focus:border-indigo-500 p-3 placeholder-slate-400 shadow-inner"
              />
              {session.role !== 'WARDEN' && (
                <>
                  <select 
                    value={filterGrade}
                    onChange={e => setFilterGrade(e.target.value)}
                    className="bg-slate-50 border border-slate-200 text-slate-700 text-sm rounded-xl focus:ring-indigo-500 focus:border-indigo-500 p-3"
                  >
                    <option value="">All Grades</option>
                    {uniqueGrades.map((g: any) => <option key={g} value={g}>{g}</option>)}
                  </select>
                  <select 
                    value={filterSection}
                    onChange={e => setFilterSection(e.target.value)}
                    className="bg-slate-50 border border-slate-200 text-slate-700 text-sm rounded-xl focus:ring-indigo-500 focus:border-indigo-500 p-3"
                  >
                    <option value="">All Sections</option>
                    {filterGrade ? getSectionsForGrade(filterGrade).map((s: any) => <option key={s} value={s}>{s}</option>) : <option value="" disabled>Select Grade First</option>}
                  </select>
                </>
              )}
            </div>
            
            <div className="flex flex-col md:flex-row gap-4 items-center bg-indigo-50 p-4 rounded-xl border border-indigo-100">
              <div className="font-semibold text-indigo-900 text-sm">Timeframe:</div>
              <select 
                value={filterTimeframe}
                onChange={e => setFilterTimeframe(e.target.value)}
                className="bg-white border border-indigo-200 text-indigo-700 text-sm rounded-lg focus:ring-indigo-500 focus:border-indigo-500 p-2"
              >
                <option value="all">All Time</option>
                <option value="last_week">Last 7 Days</option>
                <option value="last_month">Last 30 Days</option>
                <option value="specific_month">Specific Month</option>
                <option value="whole_year">Whole Academy Year (Last 365 Days)</option>
              </select>

              {filterTimeframe === 'specific_month' && (
                <div className="flex gap-2">
                  <select 
                    value={filterMonth}
                    onChange={e => setFilterMonth(e.target.value)}
                    className="bg-white border border-indigo-200 text-indigo-700 text-sm rounded-lg focus:ring-indigo-500 focus:border-indigo-500 p-2"
                  >
                    {Array.from({length: 12}, (_, i) => i + 1).map(m => (
                      <option key={m} value={m.toString()}>{new Date(2000, m - 1).toLocaleString('default', { month: 'long' })}</option>
                    ))}
                  </select>
                  <select 
                    value={filterYear}
                    onChange={e => setFilterYear(e.target.value)}
                    className="bg-white border border-indigo-200 text-indigo-700 text-sm rounded-lg focus:ring-indigo-500 focus:border-indigo-500 p-2"
                  >
                    {Array.from({length: 5}, (_, i) => new Date().getFullYear() - i).map(y => (
                      <option key={y} value={y.toString()}>{y}</option>
                    ))}
                  </select>
                </div>
              )}
            </div>
          </div>

          <div className="overflow-hidden rounded-xl border border-slate-200 bg-slate-50">
            {loading ? (
               <div className="p-12 text-center text-slate-500 font-medium">Loading students...</div>
            ) : filteredStudents.length === 0 ? (
               <div className="p-12 text-center text-slate-500 font-medium">No students found.</div>
            ) : session.role === 'WARDEN' ? (
              <div className="space-y-8 p-4">
                {/* Boys Hostel Table */}
                <div>
                  <div className="flex justify-between items-center mb-4 px-2">
                    <h3 className="text-xl font-bold text-slate-800 flex items-center gap-2">
                      <span className="w-3 h-3 rounded-full bg-indigo-500"></span>
                      Boys Hostel ({filteredStudents.filter(s => s.hostelName === 'Boys Hostel').length})
                    </h3>
                    <button 
                      onClick={() => downloadHostel('Boys Hostel')}
                      className="px-3 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-bold text-xs rounded-lg border border-indigo-200 transition-colors inline-flex items-center gap-2"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"></path></svg>
                      Download Boys CSV
                    </button>
                  </div>
                  <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="bg-slate-100 text-slate-600 text-xs uppercase tracking-wider font-semibold border-b border-slate-200">
                          <th className="px-6 py-4">Student</th>
                          <th className="px-6 py-4">Room</th>
                          <th className="px-6 py-4">Class</th>
                          <th className="px-6 py-4 text-right">Action</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {filteredStudents.filter(s => s.hostelName === 'Boys Hostel').length === 0 ? (
                          <tr><td colSpan={4} className="px-6 py-8 text-center text-slate-500">No students found in Boys Hostel.</td></tr>
                        ) : filteredStudents.filter(s => s.hostelName === 'Boys Hostel').map((student) => (
                          <tr key={student.id} className="hover:bg-slate-50 transition-colors">
                            <td className="px-6 py-4 font-semibold text-slate-800">
                              {student.firstName} {student.lastName}
                            </td>
                            <td className="px-6 py-4 font-medium text-slate-600">
                              {student.roomNumber ? `Room ${student.roomNumber}` : <span className="text-amber-500 text-xs uppercase tracking-wider font-bold">Unassigned</span>}
                            </td>
                            <td className="px-6 py-4 text-slate-500 text-sm">
                              {student.grade} - {student.section}
                            </td>
                            <td className="px-6 py-4 text-right">
                              <button 
                                onClick={() => downloadStudent(student.id)}
                                className="px-4 py-2 bg-white hover:bg-indigo-50 hover:text-indigo-700 text-slate-700 font-semibold text-sm rounded-lg border border-slate-300 transition-colors inline-flex items-center gap-2"
                              >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"></path></svg>
                                Download
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Girls Hostel Table */}
                <div>
                  <div className="flex justify-between items-center mb-4 px-2">
                    <h3 className="text-xl font-bold text-slate-800 flex items-center gap-2">
                      <span className="w-3 h-3 rounded-full bg-rose-500"></span>
                      Girls Hostel ({filteredStudents.filter(s => s.hostelName === 'Girls Hostel').length})
                    </h3>
                    <button 
                      onClick={() => downloadHostel('Girls Hostel')}
                      className="px-3 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 font-bold text-xs rounded-lg border border-rose-200 transition-colors inline-flex items-center gap-2"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"></path></svg>
                      Download Girls CSV
                    </button>
                  </div>
                  <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="bg-slate-100 text-slate-600 text-xs uppercase tracking-wider font-semibold border-b border-slate-200">
                          <th className="px-6 py-4">Student</th>
                          <th className="px-6 py-4">Room</th>
                          <th className="px-6 py-4">Class</th>
                          <th className="px-6 py-4 text-right">Action</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {filteredStudents.filter(s => s.hostelName === 'Girls Hostel').length === 0 ? (
                          <tr><td colSpan={4} className="px-6 py-8 text-center text-slate-500">No students found in Girls Hostel.</td></tr>
                        ) : filteredStudents.filter(s => s.hostelName === 'Girls Hostel').map((student) => (
                          <tr key={student.id} className="hover:bg-slate-50 transition-colors">
                            <td className="px-6 py-4 font-semibold text-slate-800">
                              {student.firstName} {student.lastName}
                            </td>
                            <td className="px-6 py-4 font-medium text-slate-600">
                              {student.roomNumber ? `Room ${student.roomNumber}` : <span className="text-amber-500 text-xs uppercase tracking-wider font-bold">Unassigned</span>}
                            </td>
                            <td className="px-6 py-4 text-slate-500 text-sm">
                              {student.grade} - {student.section}
                            </td>
                            <td className="px-6 py-4 text-right">
                              <button 
                                onClick={() => downloadStudent(student.id)}
                                className="px-4 py-2 bg-white hover:bg-rose-50 hover:text-rose-700 text-slate-700 font-semibold text-sm rounded-lg border border-slate-300 transition-colors inline-flex items-center gap-2"
                              >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"></path></svg>
                                Download
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            ) : (
              <table className="w-full text-left border-collapse bg-white">
                <thead>
                  <tr className="bg-slate-100 text-slate-600 text-xs uppercase tracking-wider font-semibold border-b border-slate-200">
                    <th className="px-6 py-4">Student</th>
                    <th className="px-6 py-4">Class</th>
                    <th className="px-6 py-4 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredStudents.map((student) => (
                    <tr key={student.id} className="hover:bg-slate-50 transition-colors">
                      <td className="px-6 py-4 font-semibold text-slate-800">
                        {student.firstName} {student.lastName}
                      </td>
                      <td className="px-6 py-4 text-slate-500 text-sm">
                        {student.grade} - {student.section}
                      </td>
                      <td className="px-6 py-4 text-right">
                        <button 
                          onClick={() => downloadStudent(student.id)}
                          className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-sm rounded-lg border border-slate-300 transition-colors inline-flex items-center gap-2"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"></path></svg>
                          Download CSV
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>

      </div>
    </main>
  );
}
