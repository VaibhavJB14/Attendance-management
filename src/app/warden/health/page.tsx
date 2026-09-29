'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

interface HospitalLog {
  id: string;
  studentName: string;
  studentGrade?: string;
  studentSection?: string;
  hostelName?: string;
  roomNumber?: string;
  hospitalName: string;
  doctorName?: string;
  reason: string;
  status: string; // 'ADMITTED' | 'UNDER_OBSERVATION' | 'DISCHARGED' | 'TREATED'
  hospitalizedAt: string;
  wardenName: string;
  wardenContact?: string;
  guardianNotified: boolean;
  notes?: string;
}

export default function WardenHealthPage() {
  const router = useRouter();
  const [session, setSession] = useState<any>(null);
  const [logs, setLogs] = useState<HospitalLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [hostelStudents, setHostelStudents] = useState<any[]>([]);

  // Form State
  const [formData, setFormData] = useState({
    studentName: '',
    studentGrade: 'Year 1',
    studentSection: 'Sec A',
    hostelName: 'Boys Hostel',
    roomNumber: '101',
    hospitalName: '',
    doctorName: '',
    reason: '',
    status: 'ADMITTED',
    hospitalizedAt: new Date().toISOString().slice(0, 16),
    wardenName: '',
    wardenContact: '',
    guardianNotified: true,
    notes: ''
  });

  const [notification, setNotification] = useState<{ type: 'success' | 'error'; msg: string } | null>(null);

  useEffect(() => {
    if (!notification) return;
    const timer = setTimeout(() => {
      setNotification(null);
    }, 4000);
    return () => clearTimeout(timer);
  }, [notification]);

  useEffect(() => {
    const stored = localStorage.getItem('session');
    if (!stored) {
      router.push('/login');
      return;
    }
    const user = JSON.parse(stored);
    if (user.role !== 'WARDEN' && user.role !== 'SYSTEM_ADMIN' && user.role !== 'SCHOOL_ADMIN') {
      router.push('/');
      return;
    }
    setSession(user);
    setFormData(prev => ({
      ...prev,
      wardenName: user.email ? user.email.split('@')[0].toUpperCase() : 'Hostel Warden'
    }));
  }, [router]);

  useEffect(() => {
    if (!session) return;
    fetchLogs();
    fetchHostelStudents();
  }, [session]);

  const fetchLogs = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/health-logs', {
        headers: { 'x-tenant-id': session.tenantId }
      });
      const data = await res.json();
      if (res.ok && data.logs) {
        setLogs(data.logs);
      }
    } catch (err) {
      console.error('Failed to fetch health logs:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchHostelStudents = async () => {
    try {
      const res = await fetch('/api/students?isHosteler=true', {
        headers: { 'x-tenant-id': session.tenantId }
      });
      const data = await res.json();
      if (res.ok && data.students) {
        setHostelStudents(data.students);
      }
    } catch (err) {
      console.error('Failed to fetch hostel students:', err);
    }
  };

  const handleStudentSelect = (studentId: string) => {
    const s = hostelStudents.find(st => st.id === studentId);
    if (s) {
      setFormData(prev => ({
        ...prev,
        studentName: `${s.firstName} ${s.lastName}`,
        studentGrade: s.grade || 'Year 1',
        studentSection: s.section || 'Sec A',
        hostelName: s.hostelName || 'Boys Hostel',
        roomNumber: s.roomNumber || '101'
      }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.studentName || !formData.hospitalName || !formData.reason) {
      setNotification({ type: 'error', msg: 'Please complete all required fields.' });
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch('/api/health-logs', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-tenant-id': session.tenantId
        },
        body: JSON.stringify(formData)
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to submit hospital log');

      setNotification({ type: 'success', msg: `Hospital log recorded for ${formData.studentName}. Replicated to Admin portal.` });
      setShowModal(false);
      setFormData({
        studentName: '',
        studentGrade: 'Year 1',
        studentSection: 'Sec A',
        hostelName: 'Boys Hostel',
        roomNumber: '101',
        hospitalName: '',
        doctorName: '',
        reason: '',
        status: 'ADMITTED',
        hospitalizedAt: new Date().toISOString().slice(0, 16),
        wardenName: session.email ? session.email.split('@')[0].toUpperCase() : 'Hostel Warden',
        wardenContact: '',
        guardianNotified: true,
        notes: ''
      });
      fetchLogs();
    } catch (err: any) {
      setNotification({ type: 'error', msg: err.message });
    } finally {
      setSubmitting(false);
    }
  };

  const handleStatusUpdate = async (logId: string, newStatus: string) => {
    try {
      const res = await fetch('/api/health-logs', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'x-tenant-id': session.tenantId
        },
        body: JSON.stringify({ id: logId, status: newStatus })
      });
      if (res.ok) {
        setNotification({ type: 'success', msg: 'Updated hospital record status.' });
        fetchLogs();
      }
    } catch (err) {
      console.error('Failed to update status:', err);
    }
  };

  if (!session) return null;

  const filteredLogs = logs.filter(log => {
    const matchesSearch = log.studentName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      log.hospitalName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      log.reason.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === 'ALL' || log.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'ADMITTED':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-rose-50 text-rose-700 font-extrabold text-xs rounded-full border border-rose-200 shadow-2xs whitespace-nowrap">
            <span className="w-2 h-2 rounded-full bg-rose-500 animate-pulse"></span>
            Currently Admitted
          </span>
        );
      case 'UNDER_OBSERVATION':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-amber-50 text-amber-700 font-extrabold text-xs rounded-full border border-amber-200 shadow-2xs whitespace-nowrap">
            <span className="w-2 h-2 rounded-full bg-amber-500"></span>
            Under Observation
          </span>
        );
      case 'DISCHARGED':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-50 text-emerald-700 font-extrabold text-xs rounded-full border border-emerald-200 shadow-2xs whitespace-nowrap">
            <svg className="w-3.5 h-3.5 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M5 13l4 4L19 7" />
            </svg>
            Discharged
          </span>
        );
      case 'TREATED':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-50 text-blue-700 font-extrabold text-xs rounded-full border border-blue-200 shadow-2xs whitespace-nowrap">
            <svg className="w-3.5 h-3.5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            Treated & Discharged
          </span>
        );
      default:
        return <span className="inline-flex items-center px-3 py-1 bg-slate-100 text-slate-700 font-bold text-xs rounded-full">{status}</span>;
    }
  };

  return (
    <main className="min-h-screen bg-slate-50/50 text-slate-900 font-sans pl-0 md:pl-8 pb-16">
      <div className="max-w-7xl mx-auto space-y-8">

        {/* Header Hero */}
        <div className="relative overflow-hidden bg-gradient-to-r from-rose-900 via-indigo-950 to-slate-900 rounded-3xl p-8 text-white shadow-xl">
          <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="space-y-2">
              <div className="inline-flex items-center gap-2 px-3 py-1 bg-rose-800/60 border border-rose-500/40 rounded-full text-xs font-semibold text-rose-200">
                <span className="w-2 h-2 rounded-full bg-rose-400 animate-pulse"></span>
                Warden Health & Hospital Dashboard
              </div>
              <h1 className="text-3xl sm:text-4xl font-black tracking-tight">
                Student Hospitalization Log
              </h1>
              <p className="text-rose-200 text-sm sm:text-base max-w-2xl leading-relaxed">
                Log emergency hospital visits, medical reasons, doctor details, and treatment status for hostel students. All logs replicate to Admin in real-time.
              </p>
            </div>

            <div>
              <button
                onClick={() => setShowModal(true)}
                className="px-6 py-3.5 bg-rose-600 hover:bg-rose-500 text-white font-extrabold rounded-2xl shadow-lg transition-all active:scale-95 flex items-center gap-2 text-sm"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 4v16m8-8H4" />
                </svg>
                + Record Hospital Visit
              </button>
            </div>
          </div>
        </div>

        {/* Notification */}
        {notification && (
          <div className={`p-4 rounded-2xl text-sm font-bold border shadow-xs flex justify-between items-center ${
            notification.type === 'success' ? 'bg-emerald-50 text-emerald-800 border-emerald-200' : 'bg-rose-50 text-rose-800 border-rose-200'
          }`}>
            <span>{notification.msg}</span>
            <button onClick={() => setNotification(null)} className="text-slate-400 hover:text-slate-700 font-bold text-xs">✕</button>
          </div>
        )}

        {/* Controls & Summary */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-2xs flex flex-col md:flex-row justify-between items-center gap-4">
          <div className="flex flex-col sm:flex-row items-center gap-3 w-full md:w-auto">
            <input
              type="text"
              placeholder="Search by student, hospital, reason..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="bg-slate-50 border border-slate-200 text-slate-800 font-semibold text-sm rounded-xl p-3 focus:ring-rose-500 focus:border-rose-500 w-full sm:w-80"
            />

            <select
              value={statusFilter}
              onChange={e => setStatusFilter(e.target.value)}
              className="bg-slate-50 border border-slate-200 text-slate-800 font-bold text-sm rounded-xl p-3 focus:ring-rose-500 focus:border-rose-500 w-full sm:w-48"
            >
              <option value="ALL">All Statuses</option>
              <option value="ADMITTED">Admitted</option>
              <option value="UNDER_OBSERVATION">Under Observation</option>
              <option value="DISCHARGED">Discharged</option>
              <option value="TREATED">Treated</option>
            </select>
          </div>

          <div className="flex items-center gap-2 text-xs font-bold text-slate-500">
            <span>Showing <strong className="text-slate-900">{filteredStudentsLength(filteredLogs)}</strong> Hospital Records</span>
          </div>
        </div>

        {/* Logs Table */}
        <div className="bg-white rounded-3xl border border-slate-200 overflow-hidden shadow-xs">
          {loading ? (
            <div className="p-16 text-center text-slate-400 font-medium">Loading hospital records...</div>
          ) : filteredLogs.length === 0 ? (
            <div className="p-16 text-center text-slate-500 font-semibold">
              No hospital records logged yet. Click &quot;+ Record Hospital Visit&quot; to log a student&apos;s hospital visit.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse min-w-[900px]">
                <thead>
                  <tr className="bg-slate-100/90 text-slate-700 text-xs uppercase tracking-wider font-extrabold border-b border-slate-200">
                    <th className="px-6 py-4">Student & Hostel</th>
                    <th className="px-6 py-4">Hospital & Doctor</th>
                    <th className="px-6 py-4">Reason / Illness</th>
                    <th className="px-6 py-4">Date & Warden</th>
                    <th className="px-6 py-4">Status</th>
                    <th className="px-6 py-4 text-right">Actions</th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-slate-100 text-xs font-medium">
                  {filteredLogs.map(log => (
                    <tr key={log.id} className="hover:bg-slate-50/60 transition-colors">
                      
                      {/* Student & Hostel */}
                      <td className="px-6 py-4">
                        <div className="font-extrabold text-slate-900 text-sm">{log.studentName}</div>
                        <div className="text-[11px] text-slate-500 mt-0.5">
                          {log.studentGrade} - {log.studentSection} | {log.hostelName || 'Hostel'} (Rm {log.roomNumber || '-'})
                        </div>
                      </td>

                      {/* Hospital & Doctor */}
                      <td className="px-6 py-4">
                        <div className="font-bold text-rose-700 text-xs">{log.hospitalName}</div>
                        <div className="text-[11px] text-slate-500 mt-0.5">
                          Dr. {log.doctorName || 'Attending Physician'}
                        </div>
                      </td>

                      {/* Reason */}
                      <td className="px-6 py-4 max-w-xs">
                        <div className="font-semibold text-slate-800 leading-snug">{log.reason}</div>
                        {log.notes && (
                          <div className="text-[11px] text-slate-500 italic mt-1 truncate max-w-xs">
                            Note: {log.notes}
                          </div>
                        )}
                        {log.guardianNotified && (
                          <span className="inline-block mt-1 text-[10px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-md">
                            ✓ Parent Notified
                          </span>
                        )}
                      </td>

                      {/* Date & Warden */}
                      <td className="px-6 py-4">
                        <div className="font-bold text-slate-800">
                          {new Date(log.hospitalizedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                        </div>
                        <div className="text-[11px] text-slate-500 mt-0.5">
                          By: {log.wardenName} {log.wardenContact ? `(${log.wardenContact})` : ''}
                        </div>
                      </td>

                      {/* Status */}
                      <td className="px-6 py-4">
                        {getStatusBadge(log.status)}
                      </td>

                      {/* Actions */}
                      <td className="px-6 py-4 text-right space-x-2">
                        {log.status === 'ADMITTED' && (
                          <button
                            onClick={() => handleStatusUpdate(log.id, 'DISCHARGED')}
                            className="px-3 py-1.5 bg-emerald-50 hover:bg-emerald-600 text-emerald-700 hover:text-white font-bold rounded-xl border border-emerald-200 text-xs transition-colors"
                          >
                            Mark Discharged
                          </button>
                        )}
                        {log.status === 'UNDER_OBSERVATION' && (
                          <button
                            onClick={() => handleStatusUpdate(log.id, 'DISCHARGED')}
                            className="px-3 py-1.5 bg-emerald-50 hover:bg-emerald-600 text-emerald-700 hover:text-white font-bold rounded-xl border border-emerald-200 text-xs transition-colors"
                          >
                            Mark Discharged
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

      </div>

      {/* Record Hospital Visit Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-2xl w-full p-6 sm:p-8 shadow-2xl border border-slate-200 space-y-6 my-8 animate-in fade-in zoom-in duration-200">
            
            <div className="flex justify-between items-center border-b border-slate-100 pb-4">
              <div>
                <span className="px-2.5 py-1 bg-rose-100 text-rose-800 text-[10px] font-black uppercase rounded-full tracking-wider">
                  Emergency Medical Log
                </span>
                <h2 className="text-2xl font-extrabold text-slate-900 mt-1">Record Hospital Visit</h2>
              </div>
              <button
                onClick={() => setShowModal(false)}
                className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-600 font-bold flex items-center justify-center text-sm transition-colors"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-5">
              
              {/* Select Hostel Student if available */}
              {hostelStudents.length > 0 && (
                <div>
                  <label className="block text-xs font-bold uppercase text-slate-500 tracking-wider mb-1.5">
                    Quick Select Hostel Student
                  </label>
                  <select
                    onChange={e => handleStudentSelect(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 text-slate-800 text-sm font-semibold rounded-xl p-3 focus:ring-rose-500 focus:border-rose-500"
                  >
                    <option value="">Select Student from Hostel List...</option>
                    {hostelStudents.map(st => (
                      <option key={st.id} value={st.id}>
                        {st.firstName} {st.lastName} ({st.grade}-{st.section} | {st.hostelName || 'Hostel'} Rm {st.roomNumber || '-'})
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold uppercase text-slate-500 tracking-wider mb-1.5">
                    Student Full Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.studentName}
                    onChange={e => setFormData({ ...formData, studentName: e.target.value })}
                    placeholder="e.g. Rahul Verma"
                    className="w-full bg-slate-50 border border-slate-200 text-slate-800 text-sm font-semibold rounded-xl p-3 focus:ring-rose-500 focus:border-rose-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase text-slate-500 tracking-wider mb-1.5">
                    Hostel & Room Number
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={formData.hostelName}
                      onChange={e => setFormData({ ...formData, hostelName: e.target.value })}
                      placeholder="Boys Hostel"
                      className="w-1/2 bg-slate-50 border border-slate-200 text-slate-800 text-sm font-semibold rounded-xl p-3"
                    />
                    <input
                      type="text"
                      value={formData.roomNumber}
                      onChange={e => setFormData({ ...formData, roomNumber: e.target.value })}
                      placeholder="Room 101"
                      className="w-1/2 bg-slate-50 border border-slate-200 text-slate-800 text-sm font-semibold rounded-xl p-3"
                    />
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold uppercase text-slate-500 tracking-wider mb-1.5">
                    Hospital Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.hospitalName}
                    onChange={e => setFormData({ ...formData, hospitalName: e.target.value })}
                    placeholder="e.g. Apollo Hospital / City General"
                    className="w-full bg-slate-50 border border-slate-200 text-slate-800 text-sm font-semibold rounded-xl p-3 focus:ring-rose-500 focus:border-rose-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase text-slate-500 tracking-wider mb-1.5">
                    Doctor / Specialist Name
                  </label>
                  <input
                    type="text"
                    value={formData.doctorName}
                    onChange={e => setFormData({ ...formData, doctorName: e.target.value })}
                    placeholder="e.g. Dr. S. K. Sharma"
                    className="w-full bg-slate-50 border border-slate-200 text-slate-800 text-sm font-semibold rounded-xl p-3 focus:ring-rose-500 focus:border-rose-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase text-slate-500 tracking-wider mb-1.5">
                  Reason for Hospitalization / Illness Symptoms *
                </label>
                <input
                  type="text"
                  required
                  value={formData.reason}
                  onChange={e => setFormData({ ...formData, reason: e.target.value })}
                  placeholder="e.g. High fever, severe abdominal pain, dehydration, fracture"
                  className="w-full bg-slate-50 border border-slate-200 text-slate-800 text-sm font-semibold rounded-xl p-3 focus:ring-rose-500 focus:border-rose-500"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-bold uppercase text-slate-500 tracking-wider mb-1.5">
                    Current Status
                  </label>
                  <select
                    value={formData.status}
                    onChange={e => setFormData({ ...formData, status: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 text-slate-800 text-sm font-semibold rounded-xl p-3 focus:ring-rose-500 focus:border-rose-500"
                  >
                    <option value="ADMITTED">Admitted</option>
                    <option value="UNDER_OBSERVATION">Under Observation</option>
                    <option value="DISCHARGED">Discharged</option>
                    <option value="TREATED">Treated</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase text-slate-500 tracking-wider mb-1.5">
                    Date & Time
                  </label>
                  <input
                    type="datetime-local"
                    value={formData.hospitalizedAt}
                    onChange={e => setFormData({ ...formData, hospitalizedAt: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 text-slate-800 text-sm font-semibold rounded-xl p-3"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase text-slate-500 tracking-wider mb-1.5">
                    Warden Name & Contact
                  </label>
                  <input
                    type="text"
                    value={formData.wardenName}
                    onChange={e => setFormData({ ...formData, wardenName: e.target.value })}
                    placeholder="Warden Name"
                    className="w-full bg-slate-50 border border-slate-200 text-slate-800 text-sm font-semibold rounded-xl p-3"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase text-slate-500 tracking-wider mb-1.5">
                  Warden / Doctor Notes
                </label>
                <textarea
                  rows={2}
                  value={formData.notes}
                  onChange={e => setFormData({ ...formData, notes: e.target.value })}
                  placeholder="Additional medical notes, prescribed medicines, or parent communication..."
                  className="w-full bg-slate-50 border border-slate-200 text-slate-800 text-sm font-medium rounded-xl p-3"
                ></textarea>
              </div>

              <div className="flex items-center gap-2 pt-2">
                <input
                  type="checkbox"
                  id="guardianNotified"
                  checked={formData.guardianNotified}
                  onChange={e => setFormData({ ...formData, guardianNotified: e.target.checked })}
                  className="w-4 h-4 text-rose-600 rounded-sm focus:ring-rose-500"
                />
                <label htmlFor="guardianNotified" className="text-xs font-bold text-slate-700">
                  Parent / Guardian has been notified of hospital visit
                </label>
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-xs transition-colors"
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  disabled={submitting}
                  className="px-6 py-2.5 bg-rose-600 hover:bg-rose-500 disabled:bg-rose-300 text-white font-extrabold rounded-xl text-xs shadow-md transition-all active:scale-95"
                >
                  {submitting ? 'Recording...' : 'Submit & Replicate to Admin'}
                </button>
              </div>

            </form>

          </div>
        </div>
      )}

    </main>
  );
}

function filteredStudentsLength(arr: any[]) {
  return arr.length;
}
