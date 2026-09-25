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

export default function TimetableAdmin() {
  const router = useRouter();
  const [session, setSession] = useState<UserSession | null>(null);

  const [activeTab, setActiveTab] = useState<'timeslots' | 'requirements' | 'view'>('requirements');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);

  // Filters
  const [grade, setGrade] = useState('');
  const [section, setSection] = useState('');
  
  const [schoolClasses, setSchoolClasses] = useState<any[]>([]);
  const uniqueGrades = Array.from(new Set(schoolClasses.map((c: any) => c.grade)));
  const getSectionsForGrade = (g: string) => schoolClasses.filter((c: any) => c.grade === g).map((c: any) => c.section);

  useEffect(() => {
    if (uniqueGrades.length > 0 && !uniqueGrades.includes(grade)) {
      setGrade(uniqueGrades[0]);
    }
  }, [uniqueGrades, grade]);

  useEffect(() => {
    const sections = getSectionsForGrade(grade);
    if (sections.length > 0 && !sections.includes(section)) {
      setSection(sections[0]);
    }
  }, [grade, schoolClasses, section]);

  // Form State
  const [subject, setSubject] = useState('');
  const [periods, setPeriods] = useState('5');
  const [teacherId, setTeacherId] = useState('');
  
  // Data
  const [teachersList, setTeachersList] = useState<any[]>([]);
  const [requirements, setRequirements] = useState<any[]>([]);
  const [timetable, setTimetable] = useState<any[]>([]);
  const [timeslots, setTimeslots] = useState<any[]>([]);
  
  // Timeslot State
  const [newSlotStart, setNewSlotStart] = useState('');
  const [newSlotEnd, setNewSlotEnd] = useState('');

  // Manual Assignment State
  const [selectedSlot, setSelectedSlot] = useState<{ dayOfWeek: number, dayName: string, startTime: string, endTime: string, existingId?: string, subject?: string, teacherId?: string } | null>(null);
  const [manualSubject, setManualSubject] = useState('');
  const [manualTeacherId, setManualTeacherId] = useState('');
  const [forceManual, setForceManual] = useState(false);

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
    if (user.role !== 'SYSTEM_ADMIN' && user.role !== 'SCHOOL_ADMIN') {
      router.push('/');
      return;
    }
    setSession(user);
    fetchData(user.tenantId, grade, section);
    
    // Fetch teachers
    fetch('/api/users?role=TEACHER', { headers: { 'x-tenant-id': user.tenantId }})
      .then(r => r.json())
      .then(d => setTeachersList(d.users || []));
      
  }, [router]);

  useEffect(() => {
    if (session) {
      fetchData(session.tenantId, grade, section);
    }
  }, [grade, section]);

  const fetchData = async (tenantId: string, g: string, s: string) => {
    setLoading(true);
    setRequirements([]);
    setTimetable([]);
    try {
      const tsRes = await fetch(`/api/timeslots`, { headers: { 'x-tenant-id': tenantId }});
      const tsData = await tsRes.json();
      if (tsData.timeslots) setTimeslots(tsData.timeslots);

      const reqRes = await fetch(`/api/timetable/requirements?grade=${encodeURIComponent(g)}&section=${encodeURIComponent(s)}`, { headers: { 'x-tenant-id': tenantId }});
      const reqData = await reqRes.json();
      if (reqData.requirements) setRequirements(reqData.requirements);

      const ttRes = await fetch(`/api/timetable?grade=${encodeURIComponent(g)}&section=${encodeURIComponent(s)}`, { headers: { 'x-tenant-id': tenantId }});
      const ttData = await ttRes.json();
      if (ttData.timetables) setTimetable(ttData.timetables);
      
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleAddRequirement = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!session) return;
    setLoading(true);
    setMessage(null);

    try {
      const res = await fetch('/api/timetable/requirements', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-tenant-id': session.tenantId
        },
        body: JSON.stringify({
          grade, section, subject, periodsPerWeek: periods, teacherId
        })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to add requirement');
      
      setMessage({ type: 'success', text: `Successfully saved requirement for ${subject}.` });
      setSubject('');
      fetchData(session.tenantId, grade, section);
      
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message });
    } finally {
      setLoading(false);
    }
  };

  const handleAddTimeslot = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!session) return;
    setLoading(true);
    setMessage(null);
    try {
      const res = await fetch('/api/timeslots', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-tenant-id': session.tenantId },
        body: JSON.stringify({ startTime: newSlotStart, endTime: newSlotEnd })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to add timeslot');
      setMessage({ type: 'success', text: 'Timeslot added successfully.' });
      setNewSlotStart('');
      setNewSlotEnd('');
      fetchData(session.tenantId, grade, section);
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message });
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteTimeslot = async (id: string) => {
    if (!session) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/timeslots?id=${id}`, {
        method: 'DELETE',
        headers: { 'x-tenant-id': session.tenantId }
      });
      if (!res.ok) throw new Error('Failed to delete');
      setMessage({ type: 'success', text: 'Timeslot removed.' });
      fetchData(session.tenantId, grade, section);
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message });
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteRequirement = async (id: string) => {
    if (!session) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/timetable/requirements?id=${id}`, {
        method: 'DELETE',
        headers: { 'x-tenant-id': session.tenantId }
      });
      if (!res.ok) throw new Error('Failed to delete requirement');
      setMessage({ type: 'success', text: 'Requirement removed.' });
      fetchData(session.tenantId, grade, section);
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message });
    } finally {
      setLoading(false);
    }
  };

  const handleGenerate = async () => {
    if (!session) return;
    setLoading(true);
    setMessage(null);

    try {
      const res = await fetch('/api/timetable/generate', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'x-tenant-id': session.tenantId 
        },
        body: JSON.stringify({ grade, section })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Generation failed');
      
      setMessage({ type: 'success', text: data.message });
      fetchData(session.tenantId, grade, section); // refresh grid
      setActiveTab('view');
      
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message });
    } finally {
      setLoading(false);
    }
  };

  const handleManualSave = async () => {
    if (!session || !selectedSlot) return;
    setLoading(true);
    setMessage(null);

    try {
      const res = await fetch('/api/timetable', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-tenant-id': session.tenantId
        },
        body: JSON.stringify({
          grade, section,
          dayOfWeek: selectedSlot.dayOfWeek,
          startTime: selectedSlot.startTime,
          endTime: selectedSlot.endTime,
          subject: manualSubject,
          teacherId: manualTeacherId,
          force: forceManual
        })
      });

      const data = await res.json();
      
      if (res.status === 409 && !forceManual) {
        // Overlap detected, prompt to force
        setMessage({ type: 'error', text: data.error + ' Check "Force Assignment" and try again to override.' });
        setForceManual(true);
        setLoading(false);
        return;
      }

      if (!res.ok) throw new Error(data.error || 'Failed to save manually');
      
      setMessage({ type: 'success', text: 'Slot assigned manually.' });
      setSelectedSlot(null);
      setForceManual(false);
      setManualSubject('');
      setManualTeacherId('');
      fetchData(session.tenantId, grade, section);
      
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message });
    } finally {
      setLoading(false);
    }
  };

  const handleManualDelete = async () => {
    if (!session || !selectedSlot?.existingId) return;
    setLoading(true);
    setMessage(null);

    try {
      const res = await fetch(`/api/timetable?id=${selectedSlot.existingId}`, {
        method: 'DELETE',
        headers: { 'x-tenant-id': session.tenantId }
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to delete');
      
      setMessage({ type: 'success', text: 'Slot deleted.' });
      setSelectedSlot(null);
      fetchData(session.tenantId, grade, section);
      
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message });
    } finally {
      setLoading(false);
    }
  };

  // Grid layout helpers
  const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];

  if (!session) return null;

  return (
    <main className="min-h-screen bg-slate-50 text-slate-900 p-8 font-sans">
      <div className="max-w-7xl mx-auto space-y-8 mt-10">
        
        {/* Navigation */}
        <div className="flex items-center justify-between mb-8">
          <Link href="/admin/extra-features" className="flex items-center text-indigo-600 font-semibold hover:text-indigo-800 transition-colors">
            <svg className="w-5 h-5 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7"></path></svg>
            Back to Extra Features Hub
          </Link>
        </div>

        <div className="bg-white p-8 rounded-3xl shadow-xl border border-slate-200">
          <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 mb-8">
            <div>
              <h1 className="text-3xl font-extrabold text-slate-800 tracking-tight">Algorithmic Timetable</h1>
              <p className="text-slate-500 mt-2">Manage course requirements and automatically schedule classes.</p>
            </div>
            <button 
              onClick={handleGenerate}
              disabled={loading}
              className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3 px-6 rounded-xl shadow-md transition-all active:scale-95 disabled:opacity-50 flex items-center gap-2 w-full lg:w-auto justify-center"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z"></path></svg>
              {loading ? 'Generating...' : 'Auto-Generate College Schedule'}
            </button>
          </div>

          <div className="flex flex-col sm:flex-row gap-4 mb-8 bg-slate-50 p-4 rounded-xl border border-slate-200">
            <div className="w-full sm:w-auto">
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Grade</label>
              <select required value={grade} onChange={e => setGrade(e.target.value)} className="w-full sm:w-40 bg-white border border-slate-200 text-slate-700 text-sm rounded-lg p-2 font-semibold shadow-sm">
                {uniqueGrades.length > 0 ? (
                  uniqueGrades.map((g: any) => <option key={g} value={g}>{g}</option>)
                ) : (
                  <option value="" disabled>No classes</option>
                )}
              </select>
            </div>
            <div className="w-full sm:w-auto">
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Section</label>
              <select required value={section} onChange={e => setSection(e.target.value)} className="w-full sm:w-40 bg-white border border-slate-200 text-slate-700 text-sm rounded-lg p-2 font-semibold shadow-sm">
                {getSectionsForGrade(grade).length > 0 ? (
                  getSectionsForGrade(grade).map((s: any) => <option key={s} value={s}>{s}</option>)
                ) : (
                  <option value="" disabled>No sections</option>
                )}
              </select>
            </div>
          </div>

          {/* Tabs */}
          <div className="flex flex-wrap border-b border-slate-200 mb-6 gap-2">
            <button onClick={() => setActiveTab('timeslots')} className={`px-4 sm:px-6 py-3 font-semibold text-sm transition-colors border-b-2 ${activeTab === 'timeslots' ? 'border-indigo-500 text-indigo-600' : 'border-transparent text-slate-500 hover:text-slate-700'}`}>
              Timeslots Settings
            </button>
            <button onClick={() => setActiveTab('requirements')} className={`px-4 sm:px-6 py-3 font-semibold text-sm transition-colors border-b-2 ${activeTab === 'requirements' ? 'border-indigo-500 text-indigo-600' : 'border-transparent text-slate-500 hover:text-slate-700'}`}>
              Course Requirements
            </button>
            <button onClick={() => setActiveTab('view')} className={`px-4 sm:px-6 py-3 font-semibold text-sm transition-colors border-b-2 ${activeTab === 'view' ? 'border-indigo-500 text-indigo-600' : 'border-transparent text-slate-500 hover:text-slate-700'}`}>
              Generated Grid View
            </button>
          </div>

          {message && (
            <div className={`p-4 mb-6 rounded-xl text-sm font-semibold border ${message.type === 'success' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-red-50 text-red-700 border-red-200'}`}>
              {message.text}
            </div>
          )}

          {activeTab === 'timeslots' && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              <div className="md:col-span-1 bg-indigo-50/50 p-6 rounded-2xl border border-indigo-100 h-fit">
                <h3 className="text-lg font-bold text-indigo-900 mb-4">Add Timeslot</h3>
                <form onSubmit={handleAddTimeslot} className="space-y-4">
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-1">Start Time (e.g. 09:00)</label>
                    <input required type="time" value={newSlotStart} onChange={e => setNewSlotStart(e.target.value)} className="w-full bg-white border border-slate-200 p-2.5 rounded-lg focus:ring-indigo-500" />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-1">End Time (e.g. 09:45)</label>
                    <input required type="time" value={newSlotEnd} onChange={e => setNewSlotEnd(e.target.value)} className="w-full bg-white border border-slate-200 p-2.5 rounded-lg focus:ring-indigo-500" />
                  </div>
                  <button type="submit" disabled={loading} className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl shadow-md transition-all active:scale-95 disabled:opacity-50 mt-2">
                    Save Timeslot
                  </button>
                </form>
              </div>

              <div className="md:col-span-2 overflow-x-auto">
                <h3 className="text-lg font-bold text-slate-800 mb-4">Configured Timeslots (Periods)</h3>
                <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-x-auto">
                  <table className="w-full text-left border-collapse min-w-[400px]">
                    <thead>
                      <tr className="bg-slate-50 text-slate-600 text-xs uppercase tracking-wider font-semibold border-b border-slate-200">
                        <th className="px-6 py-4">Start Time</th>
                        <th className="px-6 py-4">End Time</th>
                        <th className="px-6 py-4 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {timeslots.length > 0 ? timeslots.map(ts => (
                        <tr key={ts.id} className="hover:bg-slate-50/50">
                          <td className="px-6 py-4 font-bold text-slate-800">{ts.startTime}</td>
                          <td className="px-6 py-4 font-bold text-slate-800">{ts.endTime}</td>
                          <td className="px-6 py-4 text-right">
                            <button onClick={() => handleDeleteTimeslot(ts.id)} className="text-red-500 hover:text-red-700 font-semibold text-sm">Remove</button>
                          </td>
                        </tr>
                      )) : (
                        <tr><td colSpan={3} className="px-6 py-8 text-center text-slate-400 italic">No timeslots configured. Please add periods like 1st period, 2nd period, etc.</td></tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'requirements' && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              <div className="md:col-span-1 bg-indigo-50/50 p-6 rounded-2xl border border-indigo-100 h-fit">
                <h3 className="text-lg font-bold text-indigo-900 mb-4">Add Course Constraint</h3>
                <form onSubmit={handleAddRequirement} className="space-y-4">
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-1">Subject Name</label>
                    <input required type="text" value={subject} onChange={e => setSubject(e.target.value)} placeholder="e.g. Mathematics" className="w-full bg-white border border-slate-200 p-2.5 rounded-lg focus:ring-indigo-500" />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-1">Periods Per Week</label>
                    <input required type="number" min="1" max="10" value={periods} onChange={e => setPeriods(e.target.value)} className="w-full bg-white border border-slate-200 p-2.5 rounded-lg focus:ring-indigo-500" />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-1">Assigned Teacher</label>
                    <select required value={teacherId} onChange={e => setTeacherId(e.target.value)} className="w-full bg-white border border-slate-200 p-2.5 rounded-lg focus:ring-indigo-500">
                      <option value="" disabled>-- Choose a teacher --</option>
                      {teachersList.map(t => (
                        <option key={t.id} value={t.id}>{t.email}</option>
                      ))}
                    </select>
                  </div>
                  <button type="submit" disabled={loading} className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl shadow-md transition-all active:scale-95 disabled:opacity-50 mt-2">
                    Save Requirement
                  </button>
                </form>
              </div>

              <div className="md:col-span-2 overflow-x-auto">
                <h3 className="text-lg font-bold text-slate-800 mb-4">Current Constraints for {grade} {section}</h3>
                <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-x-auto">
                  <table className="w-full text-left border-collapse min-w-[500px]">
                    <thead>
                      <tr className="bg-slate-50 text-slate-600 text-xs uppercase tracking-wider font-semibold border-b border-slate-200">
                        <th className="px-6 py-4">Subject</th>
                        <th className="px-6 py-4 text-center">Periods / Week</th>
                        <th className="px-6 py-4">Teacher</th>
                        <th className="px-6 py-4 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {requirements.length > 0 ? requirements.map(req => (
                        <tr key={req.id} className="hover:bg-slate-50/50">
                          <td className="px-6 py-4 font-bold text-slate-800">{req.subject}</td>
                          <td className="px-6 py-4 font-semibold text-indigo-600 text-center">{req.periodsPerWeek}</td>
                          <td className="px-6 py-4 font-medium text-slate-500">{req.teacher?.user?.email || req.teacherId}</td>
                          <td className="px-6 py-4 text-right">
                            <button onClick={() => handleDeleteRequirement(req.id)} className="text-red-500 hover:text-red-700 font-semibold text-sm">Remove</button>
                          </td>
                        </tr>
                      )) : (
                        <tr><td colSpan={4} className="px-6 py-8 text-center text-slate-400 italic">No course requirements set yet.</td></tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'view' && (
            <div>
              {timetable.length > 0 ? (
                <div className="overflow-x-auto border border-slate-200 rounded-xl shadow-sm">
                  <table className="w-full text-center border-collapse bg-slate-50">
                    <thead>
                      <tr className="bg-indigo-50 border-b border-slate-200">
                        <th className="px-4 py-3 text-sm font-bold text-indigo-900 border-r border-slate-200">Day / Time</th>
                        {timeslots.map(t => <th key={t.startTime} className="px-4 py-3 text-sm font-bold text-indigo-900 border-r border-slate-200 min-w-[120px]">{t.startTime} - {t.endTime}</th>)}
                      </tr>
                    </thead>
                    <tbody>
                      {days.map((dayName, dayIndex) => {
                        const dayNum = dayIndex + 1;
                        return (
                          <tr key={dayName} className="border-b border-slate-200 bg-white">
                            <td className="px-4 py-4 text-sm font-bold text-slate-700 border-r border-slate-200 bg-slate-50 uppercase tracking-wider">{dayName}</td>
                            {timeslots.map(slot => {
                              const cell = timetable.find(t => t.dayOfWeek === dayNum && t.startTime === slot.startTime);
                              return (
                                <td 
                                  key={slot.startTime} 
                                  onClick={() => {
                                    setSelectedSlot({
                                      dayOfWeek: dayNum,
                                      dayName: dayName,
                                      startTime: slot.startTime,
                                      endTime: slot.endTime,
                                      existingId: cell?.id,
                                      subject: cell?.subject,
                                      teacherId: cell?.teacherId
                                    });
                                    setManualSubject(cell?.subject || '');
                                    setManualTeacherId(cell?.teacherId || '');
                                    setForceManual(false);
                                  }}
                                  className="px-4 py-4 border-r border-slate-200 min-w-[120px] align-top cursor-pointer hover:bg-slate-100 transition-colors"
                                >
                                  {cell ? (
                                    <div className="bg-indigo-100 border border-indigo-200 rounded-lg p-3 shadow-sm h-full flex flex-col justify-center gap-1">
                                      <div className="font-extrabold text-indigo-900">{cell.subject}</div>
                                      <div className="text-xs font-semibold text-indigo-700">{cell.teacher?.user?.email.split('@')[0]}</div>
                                    </div>
                                  ) : (
                                    <div className="text-slate-300 text-xs font-medium italic">Click to assign</div>
                                  )}
                                </td>
                              );
                            })}
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="p-16 text-center text-slate-400 bg-slate-50 rounded-xl border border-slate-200 border-dashed">
                  No timetable has been generated for this class yet. Setup the constraints and click Generate.
                </div>
              )}
            </div>
          )}

          {/* Manual Assignment Modal */}
          {selectedSlot && (
            <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
              <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
                <div className="p-6 border-b border-slate-100">
                  <h2 className="text-xl font-bold text-slate-800">
                    {selectedSlot.existingId ? 'Edit Slot' : 'Manually Assign Class'}
                  </h2>
                  <p className="text-sm text-slate-500 mt-1">
                    {selectedSlot.dayName}, {selectedSlot.startTime} - {selectedSlot.endTime}
                  </p>
                </div>
                
                <div className="p-6 space-y-4">
                  {selectedSlot.existingId ? (
                    <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 mb-4">
                      <p className="text-sm text-slate-700 font-semibold mb-2">Current Assignment:</p>
                      <p className="text-lg font-bold text-indigo-700">{selectedSlot.subject}</p>
                      <p className="text-sm text-slate-600 mb-4">Teacher: {teachersList.find(t => t.id === selectedSlot.teacherId)?.email || selectedSlot.teacherId}</p>
                      
                      <button 
                        onClick={handleManualDelete}
                        className="w-full py-2 bg-red-100 hover:bg-red-200 text-red-700 font-bold rounded-lg transition-colors flex justify-center items-center gap-2"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path></svg>
                        Remove from Timetable
                      </button>
                    </div>
                  ) : (
                    <>
                      <div>
                        <label className="block text-sm font-semibold text-slate-700 mb-1">Subject</label>
                        <input type="text" value={manualSubject} onChange={e => setManualSubject(e.target.value)} placeholder="e.g. Science" className="w-full bg-white border border-slate-200 p-2.5 rounded-lg focus:ring-indigo-500" />
                      </div>
                      <div>
                        <label className="block text-sm font-semibold text-slate-700 mb-1">Teacher</label>
                        <select value={manualTeacherId} onChange={e => setManualTeacherId(e.target.value)} className="w-full bg-white border border-slate-200 p-2.5 rounded-lg focus:ring-indigo-500">
                          <option value="" disabled>-- Choose a teacher --</option>
                          {teachersList.map(t => (
                            <option key={t.id} value={t.id}>{t.email}</option>
                          ))}
                        </select>
                      </div>
                      
                      {forceManual && (
                        <div className="flex items-center gap-2 bg-amber-50 text-amber-800 p-3 rounded-lg border border-amber-200">
                          <input type="checkbox" id="force" checked={forceManual} onChange={e => setForceManual(e.target.checked)} className="w-4 h-4 text-amber-600 rounded" />
                          <label htmlFor="force" className="text-sm font-semibold">Force Assignment (Override warnings)</label>
                        </div>
                      )}
                      
                      <button 
                        onClick={handleManualSave}
                        disabled={!manualSubject || !manualTeacherId || loading}
                        className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl shadow-md transition-all active:scale-95 disabled:opacity-50"
                      >
                        {loading ? 'Saving...' : 'Assign Class manually'}
                      </button>
                    </>
                  )}
                </div>

                <div className="p-4 bg-slate-50 border-t border-slate-100 flex justify-end">
                  <button onClick={() => setSelectedSlot(null)} className="px-4 py-2 font-semibold text-slate-500 hover:text-slate-800 transition-colors">
                    Cancel
                  </button>
                </div>
              </div>
            </div>
          )}

        </div>
      </div>
    </main>
  );
}
