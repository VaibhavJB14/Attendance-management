'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

interface UserSession {
  id: string;
  email: string;
  role: string;
  tenantId: string;
}

export default function DataManagement() {
  const router = useRouter();
  const [session, setSession] = useState<UserSession | null>(null);

  // Form states
  const [activeTab, setActiveTab] = useState<'student' | 'user' | 'classTeacher'>('student');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);

  // Class Teacher Assignment Form
  const [teachersList, setTeachersList] = useState<any[]>([]);
  const [assignments, setAssignments] = useState<any[]>([]);
  const [ctGrade, setCtGrade] = useState('Year 1');
  const [ctSection, setCtSection] = useState('Sec A');
  const [ctTeacherId, setCtTeacherId] = useState('');

  // Fetch data for Class Teacher tab
  useEffect(() => {
    if (activeTab === 'classTeacher' && session) {
      // We need to fetch teachers. We can reuse the users list if we create an endpoint or just fetch users.
      // But we don't have a GET /api/users yet, wait, we do.
      fetch('/api/users?role=TEACHER', {
        headers: { 'x-tenant-id': session.tenantId }
      })
      .then(res => res.json())
      .then(data => {
        if (data.users) {
          setTeachersList(data.users);
        }
      })
      .catch(err => console.error(err));

      // Fetch current assignments
      fetch('/api/class-teachers', {
        headers: { 'x-tenant-id': session.tenantId }
      })
      .then(res => res.json())
      .then(data => {
        if (data.assignments) {
          setAssignments(data.assignments);
        }
      })
      .catch(err => console.error(err));
    }
  }, [activeTab, session]);


  // Student Form
  const [sFirst, setSFirst] = useState('');
  const [sLast, setSLast] = useState('');
  const [sRollNumber, setSRollNumber] = useState('');
  const [sParentPhone, setSParentPhone] = useState('');
  const [sGrade, setSGrade] = useState('Year 1');
  const [sSection, setSSection] = useState('Sec A');
  const [sHosteler, setSHosteler] = useState(false);
  const [sHostelName, setSHostelName] = useState('Boys Hostel');

  // User Form
  const [uEmail, setUEmail] = useState('');
  const [uPassword, setUPassword] = useState('');
  const [uRole, setURole] = useState('TEACHER');

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
  }, [router]);

  const handleStudentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!session) return;
    setLoading(true);
    setMessage(null);

    try {
      const res = await fetch('/api/students', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-tenant-id': session.tenantId
        },
        body: JSON.stringify({
          firstName: sFirst,
          lastName: sLast,
          rollNumber: sRollNumber,
          grade: sGrade,
          section: sSection,
          isHosteler: sHosteler,
          hostelName: sHostelName,
          roomNumber: null,
          parentPhone: sParentPhone
        })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to add student');
      
      setMessage({ type: 'success', text: `Student ${sFirst} ${sLast} added successfully!` });
      setSFirst(''); setSLast(''); setSRollNumber(''); setSParentPhone(''); setSHosteler(false);
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message });
    } finally {
      setLoading(false);
    }
  };

  const handleUserSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!session) return;
    setLoading(true);
    setMessage(null);

    try {
      const res = await fetch('/api/users', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-tenant-id': session.tenantId
        },
        body: JSON.stringify({
          email: uEmail,
          password: uPassword,
          role: uRole
        })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to add user');
      
      setMessage({ type: 'success', text: `User ${uEmail} added successfully as ${uRole}!` });
      setUEmail(''); setUPassword('');
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message });
    } finally {
      setLoading(false);
    }
  };

  const handleClassTeacherSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!session) return;
    setLoading(true);
    setMessage(null);

    try {
      const res = await fetch('/api/class-teachers', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-tenant-id': session.tenantId
        },
        body: JSON.stringify({
          grade: ctGrade,
          section: ctSection,
          teacherId: ctTeacherId
        })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to assign class teacher');
      
      setMessage({ type: 'success', text: `Class Teacher successfully assigned for ${ctGrade} ${ctSection}!` });
      
      // Refresh assignments
      const fetchRes = await fetch('/api/class-teachers', { headers: { 'x-tenant-id': session.tenantId }});
      const fetchData = await fetchRes.json();
      if (fetchData.assignments) setAssignments(fetchData.assignments);
      
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message });
    } finally {
      setLoading(false);
    }
  };

  if (!session) return null;

  return (
    <main className="min-h-screen bg-slate-50 text-slate-900 p-8 font-sans">
      <div className="max-w-6xl mx-auto space-y-8 mt-10">
        
        {/* Navigation */}
        <div className="flex items-center justify-between">
          <Link href="/admin" className="flex items-center text-amber-600 font-semibold hover:text-amber-800 transition-colors">
            <svg className="w-5 h-5 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7"></path></svg>
            Back to Admin Hub
          </Link>
        </div>

        <div className="bg-white p-8 rounded-3xl shadow-xl border border-slate-200">
          <h1 className="text-3xl font-extrabold text-slate-800 tracking-tight mb-2">
            Data Management
          </h1>
          <p className="text-slate-500 mb-8">Manage users, enroll students, and assign class teachers.</p>

          {/* Tabs */}
          <div className="flex border-b border-slate-200 mb-6 flex-wrap gap-2">
            <button 
              onClick={() => { setActiveTab('student'); setMessage(null); }}
              className={`px-6 py-3 font-semibold text-sm transition-colors border-b-2 ${activeTab === 'student' ? 'border-amber-500 text-amber-600' : 'border-transparent text-slate-500 hover:text-slate-700'}`}
            >
              Enroll Student
            </button>
            <button 
              onClick={() => { setActiveTab('user'); setMessage(null); }}
              className={`px-6 py-3 font-semibold text-sm transition-colors border-b-2 ${activeTab === 'user' ? 'border-amber-500 text-amber-600' : 'border-transparent text-slate-500 hover:text-slate-700'}`}
            >
              Add Staff / Parent
            </button>

            <button 
              onClick={() => { setActiveTab('classTeacher'); setMessage(null); }}
              className={`px-6 py-3 font-semibold text-sm transition-colors border-b-2 ${activeTab === 'classTeacher' ? 'border-amber-500 text-amber-600' : 'border-transparent text-slate-500 hover:text-slate-700'}`}
            >
              Assign Class Teacher
            </button>
          </div>

          {message && (
            <div className={`p-4 mb-6 rounded-xl text-sm font-semibold border ${message.type === 'success' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-red-50 text-red-700 border-red-200'}`}>
              {message.text}
            </div>
          )}

          {/* Student Form */}
          {activeTab === 'student' && (
            <form onSubmit={handleStudentSubmit} className="space-y-5">
              <div className="grid grid-cols-2 gap-5">
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1">First Name</label>
                  <input required type="text" value={sFirst} onChange={e => setSFirst(e.target.value)} className="w-full bg-slate-50 border border-slate-200 p-2.5 rounded-lg focus:ring-amber-500 focus:border-amber-500" />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1">Last Name</label>
                  <input required type="text" value={sLast} onChange={e => setSLast(e.target.value)} className="w-full bg-slate-50 border border-slate-200 p-2.5 rounded-lg focus:ring-amber-500 focus:border-amber-500" />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-5">
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1">Roll Number</label>
                  <input required type="text" value={sRollNumber} onChange={e => setSRollNumber(e.target.value)} placeholder="e.g. 12" className="w-full bg-slate-50 border border-slate-200 p-2.5 rounded-lg focus:ring-amber-500 focus:border-amber-500" />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1">Parent Phone</label>
                  <input required type="tel" value={sParentPhone} onChange={e => setSParentPhone(e.target.value)} placeholder="e.g. +1234567890" className="w-full bg-slate-50 border border-slate-200 p-2.5 rounded-lg focus:ring-amber-500 focus:border-amber-500" />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-5">
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1">Grade / Year</label>
                  <select value={sGrade} onChange={e => setSGrade(e.target.value)} className="w-full bg-slate-50 border border-slate-200 p-2.5 rounded-lg focus:ring-amber-500 focus:border-amber-500">
                    <option>Year 1</option>
                    <option>Year 2</option>
                    <option>Year 3</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1">Section</label>
                  <select value={sSection} onChange={e => setSSection(e.target.value)} className="w-full bg-slate-50 border border-slate-200 p-2.5 rounded-lg focus:ring-amber-500 focus:border-amber-500">
                    <option>Sec A</option>
                    <option>Sec B</option>
                    <option>Sec C</option>
                    <option>Sec D</option>
                  </select>
                </div>
              </div>

              <div className="p-5 border border-amber-200 bg-amber-50/50 rounded-xl">
                <label className="flex items-center space-x-3 cursor-pointer">
                  <input type="checkbox" checked={sHosteler} onChange={e => setSHosteler(e.target.checked)} className="w-5 h-5 text-amber-600 rounded border-slate-300 focus:ring-amber-500" />
                  <span className="font-semibold text-slate-800">Is this student a Hosteler?</span>
                </label>
                
                {sHosteler && (
                  <div className="mt-4">
                    <label className="block text-sm font-semibold text-slate-700 mb-1">Hostel Name</label>
                    <select value={sHostelName} onChange={e => setSHostelName(e.target.value)} className="w-full bg-white border border-amber-200 p-2.5 rounded-lg focus:ring-amber-500 focus:border-amber-500">
                      <option>Boys Hostel</option>
                      <option>Girls Hostel</option>
                    </select>
                  </div>
                )}
              </div>

              <button disabled={loading} type="submit" className="w-full py-3 bg-amber-500 hover:bg-amber-600 text-white font-bold rounded-xl shadow-md transition-all active:scale-95 disabled:opacity-50">
                {loading ? 'Processing...' : 'Enroll Student'}
              </button>
            </form>
          )}

          {/* User Form */}
          {activeTab === 'user' && (
            <form onSubmit={handleUserSubmit} className="space-y-5">
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1">Email / Username</label>
                <input required type="email" value={uEmail} onChange={e => setUEmail(e.target.value)} className="w-full bg-slate-50 border border-slate-200 p-2.5 rounded-lg focus:ring-amber-500 focus:border-amber-500" placeholder="e.g. teacher3@demo.com" />
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1">Initial Password</label>
                <input required type="text" value={uPassword} onChange={e => setUPassword(e.target.value)} className="w-full bg-slate-50 border border-slate-200 p-2.5 rounded-lg focus:ring-amber-500 focus:border-amber-500" placeholder="Set a temporary password" />
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1">Role</label>
                <select value={uRole} onChange={e => setURole(e.target.value)} className="w-full bg-slate-50 border border-slate-200 p-2.5 rounded-lg focus:ring-amber-500 focus:border-amber-500">
                  <option value="TEACHER">Teacher</option>
                  <option value="WARDEN">Hostel Warden</option>
                  <option value="SCHOOL_ADMIN">Administrator</option>
                  <option value="PARENT">Parent</option>
                </select>
              </div>

              <button disabled={loading} type="submit" className="w-full py-3 bg-amber-500 hover:bg-amber-600 text-white font-bold rounded-xl shadow-md transition-all active:scale-95 disabled:opacity-50 mt-4">
                {loading ? 'Processing...' : 'Create Account'}
              </button>
            </form>
          )}

          {/* Class Teacher Form */}
          {activeTab === 'classTeacher' && (
            <div className="space-y-8">
              <form onSubmit={handleClassTeacherSubmit} className="space-y-5 bg-amber-50 p-6 rounded-2xl border border-amber-100">
                <h3 className="text-lg font-bold text-amber-900 mb-4">Assign Class Teacher</h3>
                <div className="grid grid-cols-2 gap-5">
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-1">Grade / Year</label>
                    <select value={ctGrade} onChange={e => setCtGrade(e.target.value)} className="w-full bg-white border border-slate-200 p-2.5 rounded-lg focus:ring-amber-500 focus:border-amber-500">
                      <option>Year 1</option>
                      <option>Year 2</option>
                      <option>Year 3</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-1">Section</label>
                    <select value={ctSection} onChange={e => setCtSection(e.target.value)} className="w-full bg-white border border-slate-200 p-2.5 rounded-lg focus:ring-amber-500 focus:border-amber-500">
                      <option>Sec A</option>
                      <option>Sec B</option>
                      <option>Sec C</option>
                      <option>Sec D</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1">Select Teacher</label>
                  <select required value={ctTeacherId} onChange={e => setCtTeacherId(e.target.value)} className="w-full bg-white border border-slate-200 p-2.5 rounded-lg focus:ring-amber-500 focus:border-amber-500">
                    <option value="" disabled>-- Choose a teacher --</option>
                    {teachersList.map(teacher => (
                      <option key={teacher.id} value={teacher.id}>
                        {teacher.email}
                      </option>
                    ))}
                  </select>
                </div>

                <button disabled={loading} type="submit" className="w-full py-3 bg-amber-600 hover:bg-amber-700 text-white font-bold rounded-xl shadow-md transition-all active:scale-95 disabled:opacity-50 mt-4">
                  {loading ? 'Processing...' : 'Assign Class Teacher'}
                </button>
              </form>

              {/* Current Assignments Table */}
              <div>
                <h3 className="text-lg font-bold text-slate-800 mb-4">Current Assignments</h3>
                <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-slate-50 text-slate-600 text-xs uppercase tracking-wider font-semibold border-b border-slate-200">
                        <th className="px-6 py-4">Grade</th>
                        <th className="px-6 py-4">Section</th>
                        <th className="px-6 py-4">Assigned Teacher</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {assignments.length > 0 ? assignments.map((assignment) => (
                        <tr key={assignment.id} className="hover:bg-slate-50/50 transition-colors">
                          <td className="px-6 py-4 font-semibold text-slate-800">{assignment.grade}</td>
                          <td className="px-6 py-4 font-medium text-slate-500">{assignment.section}</td>
                          <td className="px-6 py-4 text-emerald-600 font-bold">{assignment.teacher?.user?.email || assignment.teacherId}</td>
                        </tr>
                      )) : (
                        <tr>
                          <td colSpan={3} className="px-6 py-8 text-center text-slate-400 italic">No class teachers assigned yet.</td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

        </div>
      </div>
    </main>
  );
}
