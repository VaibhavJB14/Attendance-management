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

interface AttendanceRecord {
  id: string;
  studentId: string;
  date: string;
  status: string;
}

interface UserSession {
  id: string;
  email: string;
  role: string;
  tenantId: string;
}

export default function GlobalAttendance() {
  const router = useRouter();
  const [session, setSession] = useState<UserSession | null>(null);
  
  const [students, setStudents] = useState<Student[]>([]);
  const [absenteesCount, setAbsenteesCount] = useState(0);
  const [attendanceMap, setAttendanceMap] = useState<Record<string, {status: string, sessionName: string, recordedBy: string}>>({});
  const [usersMap, setUsersMap] = useState<Record<string, string>>({});
  
  // Filters
  const [filterGrade, setFilterGrade] = useState('');
  const [filterSection, setFilterSection] = useState('');
  const [filterSession, setFilterSession] = useState('');

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
        // 1. Fetch users for mapping recordedBy
        const usersRes = await fetch('/api/users', {
          headers: { 'x-tenant-id': user.tenantId }
        });
        let userMap: Record<string, string> = {};
        if (usersRes.ok) {
          const uData = await usersRes.json();
          uData.users.forEach((u: any) => {
            userMap[u.id] = u.email;
          });
          setUsersMap(userMap);
        }

        // 2. Fetch all students
        const stuRes = await fetch('/api/students', {
          headers: { 'x-tenant-id': user.tenantId }
        });
        if (stuRes.ok) {
          const stuData = await stuRes.json();
          setStudents(stuData.students);
        }

        // 3. Fetch today's attendance map with filters
        const today = new Date().toISOString().split('T')[0];
        let url = `/api/attendance?date=${today}`;
        if (filterGrade) url += `&grade=${encodeURIComponent(filterGrade)}`;
        if (filterSection) url += `&section=${encodeURIComponent(filterSection)}`;
        if (filterSession) url += `&sessionName=${encodeURIComponent(filterSession)}`;

        const attRes = await fetch(url, {
          headers: { 'x-tenant-id': user.tenantId }
        });
        
        let map: Record<string, {status: string, sessionName: string, recordedBy: string}> = {};
        let aCount = 0;
        
        if (attRes.ok) {
          const attData = await attRes.json();
          // Because of orderBy desc, we might want to only set it if not already set to get the most recent, but actually it's fine
          attData.attendance.forEach((r: any) => {
            if (!map[r.studentId]) { // Keep the most recent if multiple (due to desc order)
              map[r.studentId] = {
                status: r.status,
                sessionName: r.sessionName,
                recordedBy: r.recordedBy
              };
              if (r.status === 'ABSENT') aCount++;
            }
          });
        }
        
        setAttendanceMap(map);
        setAbsenteesCount(aCount);

      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [router, filterGrade, filterSection, filterSession]);

  if (!session) return null;

  const filteredStudents = students.filter(s => {
    if (filterGrade && s.grade !== filterGrade) return false;
    if (filterSection && s.section !== filterSection) return false;
    return true;
  });

  const attendanceRate = filteredStudents.length === 0 ? 0 : Math.round(((filteredStudents.length - absenteesCount) / filteredStudents.length) * 100);

  // Compute Missing Classes
  const classesMap: Record<string, Student[]> = {};
  filteredStudents.forEach(s => {
    const className = `${s.grade} - ${s.section}`;
    if (!classesMap[className]) classesMap[className] = [];
    classesMap[className].push(s);
  });

  const missingClasses: string[] = [];
  Object.keys(classesMap).forEach(className => {
    const classStudents = classesMap[className];
    const hasAttendance = classStudents.some(s => attendanceMap[s.id]);
    if (!hasAttendance) {
      missingClasses.push(className);
    }
  });

  return (
    <main className="min-h-screen bg-slate-50 text-slate-900 p-8 font-sans">
      <div className="max-w-6xl mx-auto space-y-8 mt-10">
        
        {/* Navigation Header */}
        <div className="flex items-center justify-between">
          <Link href="/admin" className="flex items-center text-rose-600 font-semibold hover:text-rose-800 transition-colors">
            <svg className="w-5 h-5 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7"></path></svg>
            Back to Admin Hub
          </Link>
          <div className="px-4 py-1.5 bg-rose-100 text-rose-800 rounded-full text-xs font-bold uppercase tracking-wider border border-rose-200 shadow-sm flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-rose-500 animate-pulse"></div>
            System Admin
          </div>
        </div>

        {/* Header */}
        <div>
          <h1 className="text-4xl font-extrabold text-slate-800 tracking-tight">
            Global Attendance Roster
          </h1>
          <p className="mt-2 text-slate-500 text-lg">
            Live overview of the entire school's enrollment and daily attendance status.
          </p>
        </div>

        {loading ? (
          <div className="p-16 flex justify-center items-center space-x-2">
            <div className="w-3 h-3 bg-rose-500 rounded-full animate-bounce"></div>
            <div className="w-3 h-3 bg-rose-500 rounded-full animate-bounce [animation-delay:-0.15s]"></div>
            <div className="w-3 h-3 bg-rose-500 rounded-full animate-bounce [animation-delay:-0.3s]"></div>
          </div>
        ) : (
          <>
            {/* KPI Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="bg-white p-6 rounded-2xl shadow-md border border-slate-200">
                <p className="text-sm font-semibold text-slate-500 uppercase tracking-wider">Total Enrolled</p>
                <p className="text-4xl font-black text-slate-800 mt-2">{filteredStudents.length}</p>
              </div>
              <div className="bg-white p-6 rounded-2xl shadow-md border border-slate-200">
                <p className="text-sm font-semibold text-slate-500 uppercase tracking-wider">Today's Absentees</p>
                <p className="text-4xl font-black text-rose-600 mt-2">{absenteesCount}</p>
              </div>
              <div className="bg-white p-6 rounded-2xl shadow-md border border-slate-200">
                <p className="text-sm font-semibold text-slate-500 uppercase tracking-wider">Attendance Rate</p>
                <p className="text-4xl font-black text-emerald-600 mt-2">{attendanceRate}%</p>
              </div>
            </div>

            {/* Missing Submissions Alerts */}
            {filterSession && missingClasses.length > 0 && (
              <div className="bg-amber-50 border border-amber-200 p-6 rounded-2xl shadow-sm">
                <div className="flex items-center gap-2 mb-3">
                  <svg className="w-6 h-6 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"></path></svg>
                  <h3 className="text-lg font-bold text-amber-900">Missing Submissions for {filterSession}</h3>
                </div>
                <p className="text-sm text-amber-700 mb-4">The following classes have not submitted any attendance for this session yet:</p>
                <div className="flex flex-wrap gap-2">
                  {missingClasses.map(cls => (
                    <span key={cls} className="px-3 py-1.5 bg-white border border-amber-300 text-amber-800 rounded-lg text-sm font-bold shadow-sm">
                      {cls}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Global Master List */}
            <div className="bg-white rounded-2xl shadow-xl border border-slate-200 overflow-hidden">
              <div className="p-6 border-b border-slate-200 bg-slate-50 flex justify-between items-center">
                <div>
                  <h2 className="text-xl font-bold text-slate-800">Master Student Roster</h2>
                  <p className="text-sm text-slate-500 mt-1">Every student currently enrolled in the system.</p>
                </div>
                <div className="flex flex-col sm:flex-row gap-3">
                  <select 
                    value={filterGrade}
                    onChange={e => setFilterGrade(e.target.value)}
                    className="bg-white border border-slate-200 text-slate-700 text-sm rounded-lg focus:ring-rose-500 focus:border-rose-500 block p-2"
                  >
                    <option value="">All Grades</option>
                    <option value="Year 1">Year 1</option>
                    <option value="Year 2">Year 2</option>
                    <option value="Year 3">Year 3</option>
                  </select>
                  <select 
                    value={filterSection}
                    onChange={e => setFilterSection(e.target.value)}
                    className="bg-white border border-slate-200 text-slate-700 text-sm rounded-lg focus:ring-rose-500 focus:border-rose-500 block p-2"
                  >
                    <option value="">All Sections</option>
                    <option value="Sec A">Sec A</option>
                    <option value="Sec B">Sec B</option>
                    <option value="Sec C">Sec C</option>
                  </select>
                  <select 
                    value={filterSession}
                    onChange={e => setFilterSession(e.target.value)}
                    className="bg-white border border-slate-200 text-slate-700 text-sm rounded-lg focus:ring-rose-500 focus:border-rose-500 block p-2"
                  >
                    <option value="">All Sessions</option>
                    <option value="Morning (8-12)">Morning (8-12)</option>
                    <option value="Afternoon (12-3)">Afternoon (12-3)</option>
                    <option value="Hostel Morning">Hostel Morning</option>
                    <option value="Hostel Night">Hostel Night</option>
                  </select>
                </div>
              </div>
              
              {filteredStudents.length === 0 ? (
                <div className="p-12 text-center text-slate-500 font-medium">
                  No students enrolled in the system yet.
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-slate-100 text-slate-600 text-xs uppercase tracking-wider font-semibold border-b border-slate-200">
                        <th className="px-6 py-4">Student Name</th>
                        <th className="px-6 py-4">Class</th>
                        <th className="px-6 py-4">Session</th>
                        <th className="px-6 py-4">Recorded By</th>
                        <th className="px-6 py-4 text-right">Today's Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {filteredStudents.map((student) => {
                        const record = attendanceMap[student.id];
                        
                        return (
                        <tr key={student.id} className="hover:bg-slate-50 transition-colors">
                          <td className="px-6 py-4 font-semibold text-slate-800">
                            <div className="flex items-center gap-3">
                              <div className="w-8 h-8 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center text-xs font-bold border border-indigo-200">
                                {student.firstName[0]}
                              </div>
                              {student.firstName} {student.lastName}
                            </div>
                          </td>
                          <td className="px-6 py-4 font-medium text-slate-600">{student.grade} - {student.section}</td>
                          <td className="px-6 py-4 font-medium text-slate-600">
                            {record ? (
                              <span className="px-2.5 py-1 bg-slate-100 text-slate-700 rounded-md text-xs font-bold border border-slate-200">
                                {record.sessionName}
                              </span>
                            ) : '-'}
                          </td>
                          <td className="px-6 py-4 font-medium text-slate-500 text-sm">
                            {record && usersMap[record.recordedBy] ? usersMap[record.recordedBy] : (record ? 'Unknown User' : '-')}
                          </td>
                          <td className="px-6 py-4 text-right">
                            {record?.status === 'PRESENT' && <span className="text-emerald-600 font-bold text-sm">PRESENT</span>}
                            {record?.status === 'ABSENT' && <span className="text-rose-600 font-bold text-sm">ABSENT</span>}
                            {!record && <span className="text-slate-400 font-medium text-sm italic">Not Recorded</span>}
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
