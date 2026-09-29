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
  createdAt: string;
}

export default function AdminHealthPage() {
  const router = useRouter();
  const [session, setSession] = useState<any>(null);
  const [logs, setLogs] = useState<HospitalLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [hostelFilter, setHostelFilter] = useState('ALL');

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

  useEffect(() => {
    if (!session) return;
    fetchLogs();
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
        fetchLogs();
      }
    } catch (err) {
      console.error('Failed to update status:', err);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  if (!session) return null;

  const filteredLogs = logs.filter(log => {
    const matchesSearch = log.studentName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      log.hospitalName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      log.reason.toLowerCase().includes(searchQuery.toLowerCase()) ||
      log.wardenName.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === 'ALL' || log.status === statusFilter;
    const matchesHostel = hostelFilter === 'ALL' || (log.hostelName && log.hostelName.toLowerCase().includes(hostelFilter.toLowerCase()));
    return matchesSearch && matchesStatus && matchesHostel;
  });

  const activeAdmittedCount = logs.filter(l => l.status === 'ADMITTED' || l.status === 'UNDER_OBSERVATION').length;

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
        <div className="relative overflow-hidden bg-gradient-to-r from-red-950 via-rose-900 to-indigo-950 rounded-3xl p-8 text-white shadow-xl">
          <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="space-y-2">
              <div className="inline-flex items-center gap-2 px-3 py-1 bg-rose-800/60 border border-rose-500/40 rounded-full text-xs font-semibold text-rose-200">
                <span className="w-2 h-2 rounded-full bg-rose-400 animate-pulse"></span>
                Admin Real-time Health Audit
              </div>
              <h1 className="text-3xl sm:text-4xl font-black tracking-tight">
                Hostel Student Hospitalization Replications
              </h1>
              <p className="text-rose-200 text-sm sm:text-base max-w-2xl leading-relaxed">
                Centralized audit logs of all student hospital visits, illness records, and medical cases reported by wardens across hostels.
              </p>
            </div>

            <div className="flex items-center gap-3">
              <button
                onClick={handlePrint}
                className="px-5 py-2.5 bg-rose-600 hover:bg-rose-500 text-white font-bold rounded-xl shadow-md transition-all active:scale-95 flex items-center gap-2 text-sm"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
                </svg>
                Print Health Audit Report
              </button>
            </div>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-2xs">
            <div className="text-xs font-bold uppercase text-slate-500 tracking-wider">Total Hospital Visits</div>
            <div className="text-3xl font-black text-slate-900 mt-2">{logs.length}</div>
            <div className="text-xs text-slate-400 mt-1">Reported by wardens</div>
          </div>

          <div className="bg-rose-50 p-6 rounded-2xl border border-rose-200 shadow-2xs">
            <div className="text-xs font-bold uppercase text-rose-800 tracking-wider">Currently Admitted / Active</div>
            <div className="text-3xl font-black text-rose-900 mt-2">{activeAdmittedCount}</div>
            <div className="text-xs text-rose-600 font-semibold mt-1">Requires active monitoring</div>
          </div>

          <div className="bg-emerald-50 p-6 rounded-2xl border border-emerald-200 shadow-2xs">
            <div className="text-xs font-bold uppercase text-emerald-800 tracking-wider">Discharged / Recovered</div>
            <div className="text-3xl font-black text-emerald-900 mt-2">
              {logs.filter(l => l.status === 'DISCHARGED' || l.status === 'TREATED').length}
            </div>
            <div className="text-xs text-emerald-600 font-semibold mt-1">Cleared by medical team</div>
          </div>
        </div>

        {/* Filter Bar */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-2xs flex flex-col md:flex-row justify-between items-center gap-4">
          <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
            <input
              type="text"
              placeholder="Search student, warden, hospital..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="bg-slate-50 border border-slate-200 text-slate-800 font-semibold text-sm rounded-xl p-3 focus:ring-rose-500 focus:border-rose-500 w-full sm:w-72"
            />

            <select
              value={statusFilter}
              onChange={e => setStatusFilter(e.target.value)}
              className="bg-slate-50 border border-slate-200 text-slate-800 font-bold text-sm rounded-xl p-3 focus:ring-rose-500 focus:border-rose-500"
            >
              <option value="ALL">All Statuses</option>
              <option value="ADMITTED">Currently Admitted</option>
              <option value="UNDER_OBSERVATION">Under Observation</option>
              <option value="DISCHARGED">Discharged</option>
              <option value="TREATED">Treated</option>
            </select>

            <select
              value={hostelFilter}
              onChange={e => setHostelFilter(e.target.value)}
              className="bg-slate-50 border border-slate-200 text-slate-800 font-bold text-sm rounded-xl p-3 focus:ring-rose-500 focus:border-rose-500"
            >
              <option value="ALL">All Hostels</option>
              <option value="Boys Hostel">Boys Hostel</option>
              <option value="Girls Hostel">Girls Hostel</option>
            </select>
          </div>

          <div className="text-xs font-bold text-slate-500">
            Replicated from Warden Portal
          </div>
        </div>

        {/* Audit Table */}
        <div className="bg-white rounded-3xl border border-slate-200 overflow-hidden shadow-xs">
          {loading ? (
            <div className="p-16 text-center text-slate-400 font-medium">Loading replicated hospital records...</div>
          ) : filteredLogs.length === 0 ? (
            <div className="p-16 text-center text-slate-500 font-semibold">
              No hospital records match your filter criteria.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse min-w-[950px]">
                <thead>
                  <tr className="bg-slate-50/90 text-slate-600 text-[11px] uppercase tracking-wider font-extrabold border-b border-slate-200/80">
                    <th className="px-6 py-4">Student & Hostel</th>
                    <th className="px-6 py-4">Hospital & Doctor</th>
                    <th className="px-6 py-4">Reason / Medical Diagnosis</th>
                    <th className="px-6 py-4">Warden / Reporting Officer</th>
                    <th className="px-6 py-4">Hospitalized Date</th>
                    <th className="px-6 py-4">Status</th>
                    <th className="px-6 py-4 text-right">Admin Action</th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-slate-100 text-xs font-medium">
                  {filteredLogs.map(log => (
                    <tr key={log.id} className="hover:bg-slate-50/60 transition-colors">
                      
                      {/* Student & Hostel */}
                      <td className="px-6 py-4.5">
                        <div className="font-extrabold text-slate-900 text-sm">{log.studentName}</div>
                        <div className="text-[11px] text-slate-500 mt-0.5">
                          {log.studentGrade} - {log.studentSection} | {log.hostelName || 'Hostel'} (Rm {log.roomNumber || '-'})
                        </div>
                      </td>

                      {/* Hospital & Doctor */}
                      <td className="px-6 py-4.5">
                        <div className="font-bold text-indigo-950 text-xs flex items-center gap-1.5">
                          <svg className="w-3.5 h-3.5 text-rose-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5m0 0h4m-4 0V11m0 0h4m-4 0v3m4-3v3" />
                          </svg>
                          {log.hospitalName}
                        </div>
                        <div className="text-[11px] text-slate-500 mt-0.5">
                          Dr. {log.doctorName || 'Attending Physician'}
                        </div>
                      </td>

                      {/* Reason */}
                      <td className="px-6 py-4.5 max-w-xs">
                        <div className="font-semibold text-slate-800 leading-snug">{log.reason}</div>
                        {log.notes && (
                          <div className="text-[11px] text-slate-500 italic mt-1 truncate max-w-xs">
                            Note: {log.notes}
                          </div>
                        )}
                        {log.guardianNotified && (
                          <span className="inline-flex items-center gap-1 mt-1 text-[10px] font-extrabold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-md">
                            ✓ Parent Contacted
                          </span>
                        )}
                      </td>

                      {/* Warden */}
                      <td className="px-6 py-4.5">
                        <div className="font-bold text-slate-800">{log.wardenName}</div>
                        <div className="text-[11px] text-slate-500 mt-0.5">{log.wardenContact || 'Warden'}</div>
                      </td>

                      {/* Date */}
                      <td className="px-6 py-4.5">
                        <div className="font-bold text-slate-800">
                          {new Date(log.hospitalizedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                        </div>
                        <div className="text-[11px] text-slate-500 mt-0.5">
                          {new Date(log.hospitalizedAt).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
                        </div>
                      </td>

                      {/* Status */}
                      <td className="px-6 py-4.5">
                        {getStatusBadge(log.status)}
                      </td>

                      {/* Admin Actions */}
                      <td className="px-6 py-4.5 text-right space-x-2">
                        {log.status === 'ADMITTED' || log.status === 'UNDER_OBSERVATION' ? (
                          <button
                            onClick={() => handleStatusUpdate(log.id, 'DISCHARGED')}
                            className="px-3.5 py-1.5 bg-emerald-50 hover:bg-emerald-600 text-emerald-700 hover:text-white font-extrabold rounded-xl border border-emerald-200 text-xs shadow-2xs transition-all active:scale-95"
                          >
                            Mark Discharged
                          </button>
                        ) : (
                          <span className="text-xs font-bold text-slate-400 italic">
                            Case Resolved
                          </span>
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
    </main>
  );
}
