'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

function formatClass(grade?: string, section?: string): string {
  if (!grade && !section) return 'N/A';
  let cleanGrade = (grade || '').trim();
  const yearMatch = cleanGrade.match(/(?:Year|Grade)?\s*(\d+)/i);
  if (yearMatch && yearMatch[1]) {
    cleanGrade = yearMatch[1];
  }

  let cleanSec = (section || '').trim();
  const secMatch = cleanSec.match(/(?:Sec|Section)?\s*([A-Z0-9]+)/i);
  if (secMatch && secMatch[1]) {
    cleanSec = secMatch[1];
  }

  if (cleanGrade && cleanSec) {
    return `${cleanGrade}-${cleanSec}`;
  }
  return cleanGrade || cleanSec || 'N/A';
}

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
  const [activeTab, setActiveTab] = useState<'assignMentor' | 'classTeacher' | 'addClass'>('assignMentor');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);

  // Assign Mentor Form
  const [mGrade, setMGrade] = useState('Year 1');
  const [mSection, setMSection] = useState('Sec A');
  const [mStudent, setMStudent] = useState('All Students (Classwide)');
  const [mMentorName, setMMentorName] = useState('Dr. Alan Smith (Prof)');
  const [studentsList, setStudentsList] = useState<any[]>([]);
  const [mentorAssignments, setMentorAssignments] = useState<any[]>([
    { id: '1', grade: 'Year 1', section: 'Sec A', studentName: 'Alex Johnson (Roll #101)', mentorName: 'Dr. Alan Smith (Prof)' },
    { id: '2', grade: 'Year 2', section: 'Sec B', studentName: 'All Students (Classwide)', mentorName: 'Prof. Sarah Jenkins (CS)' },
  ]);

  // Class Teacher Assignment Form
  const [teachersList, setTeachersList] = useState<any[]>([]);
  const [assignments, setAssignments] = useState<any[]>([]);
  const [ctGrade, setCtGrade] = useState('Year 1');
  const [ctSection, setCtSection] = useState('Sec A');
  const [ctTeacherId, setCtTeacherId] = useState('');

  // Add Class Form
  const [newGrade, setNewGrade] = useState('');
  const [newSection, setNewSection] = useState('');
  const [schoolClasses, setSchoolClasses] = useState<any[]>([]);

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

  // Fetch data for Class Teacher tab
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

    if ((activeTab === 'classTeacher' || activeTab === 'assignMentor') && session) {
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

  // Dynamic Class Options
  const uniqueGrades = Array.from(new Set(schoolClasses.map((c: any) => c.grade)));
  const getSectionsForGrade = (grade: string) => schoolClasses.filter((c: any) => c.grade === grade).map((c: any) => c.section);

  useEffect(() => {
    if (uniqueGrades.length > 0 && !uniqueGrades.includes(ctGrade)) {
      setCtGrade(uniqueGrades[0]);
    }
    if (uniqueGrades.length > 0 && !uniqueGrades.includes(mGrade)) {
      setMGrade(uniqueGrades[0]);
    }
  }, [uniqueGrades, ctGrade, mGrade]);

  useEffect(() => {
    const ctSections = getSectionsForGrade(ctGrade);
    if (ctSections.length > 0 && !ctSections.includes(ctSection)) {
      setCtSection(ctSections[0]);
    }
  }, [ctGrade, schoolClasses, ctSection]);

  useEffect(() => {
    const mSections = getSectionsForGrade(mGrade);
    if (mSections.length > 0 && !mSections.includes(mSection)) {
      setMSection(mSections[0]);
    }
  }, [mGrade, schoolClasses, mSection]);

  const handleAssignMentorSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage(null);

    setTimeout(() => {
      setMentorAssignments(prev => [
        ...prev.filter(a => !(a.grade === mGrade && a.section === mSection && a.studentName === mStudent)),
        { id: Date.now().toString(), grade: mGrade, section: mSection, studentName: mStudent, mentorName: mMentorName }
      ]);
      setMessage({ type: 'success', text: `Mentor ${mMentorName} successfully assigned to ${mStudent} (${mGrade} ${mSection})!` });
      setLoading(false);
    }, 300);
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

      const fetchRes = await fetch('/api/class-teachers', { headers: { 'x-tenant-id': session.tenantId } });
      const fetchData = await fetchRes.json();
      if (fetchData.assignments) setAssignments(fetchData.assignments);

    } catch (err: any) {
      setMessage({ type: 'error', text: err.message });
    } finally {
      setLoading(false);
    }
  };

  const handleAddClassSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!session) return;
    setLoading(true);
    setMessage(null);

    try {
      const res = await fetch('/api/classes', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-tenant-id': session.tenantId
        },
        body: JSON.stringify({
          grade: newGrade,
          section: newSection
        })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to add class');

      setMessage({ type: 'success', text: `Class ${newGrade} ${newSection} added successfully!` });
      setNewGrade(''); setNewSection('');

      const fetchRes = await fetch('/api/classes', { headers: { 'x-tenant-id': session.tenantId } });
      const fetchData = await fetchRes.json();
      if (fetchData.classes) setSchoolClasses(fetchData.classes);
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message });
    } finally {
      setLoading(false);
    }
  };

  if (!session) return null;

  return (
    <main className="text-slate-900 font-sans px-4 sm:px-6 md:px-8 pb-12">
      <div className="max-w-6xl mx-auto space-y-8">

        <div className="bg-white p-8 rounded-3xl shadow-xl border border-slate-200">
          <h1 className="text-3xl font-extrabold text-slate-800 tracking-tight mb-2">
            Data Management
          </h1>
          <p className="text-slate-500 mb-8">Manage mentors, class teachers, and academic class structures.</p>

          {/* Tabs */}
          <div className="flex border-b border-slate-200 mb-6 flex-wrap gap-2">
            <button
              onClick={() => { setActiveTab('assignMentor'); setMessage(null); }}
              className={`px-6 py-3 font-semibold text-sm transition-colors border-b-2 ${activeTab === 'assignMentor' ? 'border-orange-500 text-orange-600 font-extrabold' : 'border-transparent text-slate-500 hover:text-slate-700'}`}
            >
              Assign Mentor
            </button>

            <button
              onClick={() => { setActiveTab('classTeacher'); setMessage(null); }}
              className={`px-6 py-3 font-semibold text-sm transition-colors border-b-2 ${activeTab === 'classTeacher' ? 'border-amber-500 text-amber-600' : 'border-transparent text-slate-500 hover:text-slate-700'}`}
            >
              Assign Class Teacher
            </button>
            <button
              onClick={() => { setActiveTab('addClass'); setMessage(null); }}
              className={`px-6 py-3 font-semibold text-sm transition-colors border-b-2 ${activeTab === 'addClass' ? 'border-amber-500 text-amber-600' : 'border-transparent text-slate-500 hover:text-slate-700'}`}
            >
              Add Class
            </button>
          </div>

          {message && (
            <div className={`p-4 mb-6 rounded-xl text-sm font-semibold border ${message.type === 'success' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-red-50 text-red-700 border-red-200'}`}>
              {message.text}
            </div>
          )}

          {/* Assign Mentor Form */}
          {activeTab === 'assignMentor' && (
            <div className="space-y-8">
              <form onSubmit={handleAssignMentorSubmit} className="space-y-5 bg-orange-50/60 p-6 rounded-2xl border border-orange-200">
                <h3 className="text-lg font-bold text-orange-900 mb-4">Assign Mentor</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-1">Grade / Year</label>
                    <select required value={mGrade} onChange={e => setMGrade(e.target.value)} className="w-full bg-white border border-slate-200 p-2.5 rounded-lg focus:ring-orange-500 focus:border-orange-500 font-semibold">
                      {uniqueGrades.length > 0 ? (
                        uniqueGrades.map((g: any) => <option key={g} value={g}>{g}</option>)
                      ) : (
                        <>
                          <option value="Year 1">Year 1</option>
                          <option value="Year 2">Year 2</option>
                          <option value="Year 3">Year 3</option>
                          <option value="Year 4">Year 4</option>
                        </>
                      )}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-1">Section</label>
                    <select required value={mSection} onChange={e => setMSection(e.target.value)} className="w-full bg-white border border-slate-200 p-2.5 rounded-lg focus:ring-orange-500 focus:border-orange-500 font-semibold">
                      {getSectionsForGrade(mGrade).length > 0 ? (
                        getSectionsForGrade(mGrade).map((s: any) => <option key={s} value={s}>{s}</option>)
                      ) : (
                        <>
                          <option value="Sec A">Sec A</option>
                          <option value="Sec B">Sec B</option>
                          <option value="Sec C">Sec C</option>
                        </>
                      )}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-1">Select Student</label>
                    <select required value={mStudent} onChange={e => setMStudent(e.target.value)} className="w-full bg-white border border-slate-200 p-2.5 rounded-lg focus:ring-orange-500 focus:border-orange-500 font-semibold">
                      <option value="All Students (Classwide)">All Students (Classwide)</option>
                      <option value="Alex Johnson (Roll #101)">Alex Johnson (Roll #101)</option>
                      <option value="Beatrix Potter (Roll #102)">Beatrix Potter (Roll #102)</option>
                      <option value="Charlie Davis (Roll #103)">Charlie Davis (Roll #103)</option>
                      <option value="Diana Prince (Roll #104)">Diana Prince (Roll #104)</option>
                      <option value="Evan Wright (Roll #105)">Evan Wright (Roll #105)</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-1">Select Mentor</label>
                    <select required value={mMentorName} onChange={e => setMMentorName(e.target.value)} className="w-full bg-white border border-slate-200 p-2.5 rounded-lg focus:ring-orange-500 focus:border-orange-500 font-semibold">
                      <option value="Dr. Alan Smith (Prof)">Dr. Alan Smith (Prof)</option>
                      <option value="Prof. Sarah Jenkins (CS)">Prof. Sarah Jenkins (CS)</option>
                      <option value="Dr. Robert Vance (Physics)">Dr. Robert Vance (Physics)</option>
                      <option value="Prof. Emily Watson (Math)">Prof. Emily Watson (Math)</option>
                      <option value="Dr. Michael Chang (Bio)">Dr. Michael Chang (Bio)</option>
                    </select>
                  </div>
                </div>

                <button disabled={loading} type="submit" className="w-full py-3 bg-orange-500 hover:bg-orange-600 text-white font-bold rounded-xl shadow-md transition-all active:scale-95 disabled:opacity-50 mt-4 cursor-pointer">
                  {loading ? 'Processing...' : 'Assign Mentor'}
                </button>
              </form>

              {/* Mentor Assignments Table */}
              <div>
                <h3 className="text-lg font-bold text-slate-800 mb-4">Current Mentor Assignments</h3>
                <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-slate-50 text-slate-600 text-xs uppercase tracking-wider font-semibold border-b border-slate-200">
                        <th className="px-6 py-4">Grade</th>
                        <th className="px-6 py-4">Section</th>
                        <th className="px-6 py-4">Assigned Student</th>
                        <th className="px-6 py-4">Assigned Mentor</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {mentorAssignments.length > 0 ? mentorAssignments.map((ma) => (
                        <tr key={ma.id} className="hover:bg-slate-50/50 transition-colors">
                          <td className="px-6 py-4 font-extrabold text-slate-800" colSpan={2}>{formatClass(ma.grade, ma.section)}</td>
                          <td className="px-6 py-4 font-bold text-slate-700">{ma.studentName}</td>
                          <td className="px-6 py-4 text-orange-600 font-bold">{ma.mentorName}</td>
                        </tr>
                      )) : (
                        <tr>
                          <td colSpan={4} className="px-6 py-8 text-center text-slate-400 italic">No mentors assigned yet.</td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* Class Teacher Form */}
          {activeTab === 'classTeacher' && (
            <div className="space-y-8">
              <form onSubmit={handleClassTeacherSubmit} className="space-y-5 bg-amber-50 p-6 rounded-2xl border border-amber-100">
                <h3 className="text-lg font-bold text-amber-900 mb-4">Assign Class Teacher</h3>
                <div className="grid grid-cols-2 gap-5">
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-1">Grade / Year</label>
                    <select required value={ctGrade} onChange={e => setCtGrade(e.target.value)} className="w-full bg-white border border-slate-200 p-2.5 rounded-lg focus:ring-amber-500 focus:border-amber-500">
                      {uniqueGrades.length > 0 ? (
                        uniqueGrades.map((g: any) => <option key={g} value={g}>{g}</option>)
                      ) : (
                        <option value="" disabled>No classes available</option>
                      )}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-1">Section</label>
                    <select required value={ctSection} onChange={e => setCtSection(e.target.value)} className="w-full bg-white border border-slate-200 p-2.5 rounded-lg focus:ring-amber-500 focus:border-amber-500">
                      {getSectionsForGrade(ctGrade).length > 0 ? (
                        getSectionsForGrade(ctGrade).map((s: any) => <option key={s} value={s}>{s}</option>)
                      ) : (
                        <option value="" disabled>No sections available</option>
                      )}
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
                          <td className="px-6 py-4 font-extrabold text-slate-800" colSpan={2}>{formatClass(assignment.grade, assignment.section)}</td>
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

          {/* Add Class Form */}
          {activeTab === 'addClass' && (
            <div className="space-y-8">
              <form onSubmit={handleAddClassSubmit} className="space-y-5 bg-amber-50 p-6 rounded-2xl border border-amber-100">
                <h3 className="text-lg font-bold text-amber-900 mb-4">Add New Class & Section</h3>
                <div className="grid grid-cols-2 gap-5">
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-1">Grade / Year</label>
                    <input required type="text" value={newGrade} onChange={e => setNewGrade(e.target.value)} placeholder="e.g. Year 1, Grade 5" className="w-full bg-white border border-slate-200 p-2.5 rounded-lg focus:ring-amber-500 focus:border-amber-500" />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-1">Section</label>
                    <input required type="text" value={newSection} onChange={e => setNewSection(e.target.value)} placeholder="e.g. Sec A, Blue" className="w-full bg-white border border-slate-200 p-2.5 rounded-lg focus:ring-amber-500 focus:border-amber-500" />
                  </div>
                </div>

                <button disabled={loading} type="submit" className="w-full py-3 bg-amber-600 hover:bg-amber-700 text-white font-bold rounded-xl shadow-md transition-all active:scale-95 disabled:opacity-50 mt-4">
                  {loading ? 'Processing...' : 'Add Class'}
                </button>
              </form>

              {/* Current Classes Table */}
              <div>
                <h3 className="text-lg font-bold text-slate-800 mb-4">Current Classes</h3>
                <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-slate-50 text-slate-600 text-xs uppercase tracking-wider font-semibold border-b border-slate-200">
                        <th className="px-6 py-4">Grade</th>
                        <th className="px-6 py-4">Section</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {schoolClasses.length > 0 ? schoolClasses.map((cls) => (
                        <tr key={cls.id} className="hover:bg-slate-50/50 transition-colors">
                          <td className="px-6 py-4 font-semibold text-slate-800">{cls.grade}</td>
                          <td className="px-6 py-4 font-medium text-slate-500">{cls.section}</td>
                        </tr>
                      )) : (
                        <tr>
                          <td colSpan={2} className="px-6 py-8 text-center text-slate-400 italic">No classes added yet.</td>
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

