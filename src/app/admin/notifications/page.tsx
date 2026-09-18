'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

interface Notification {
  id: string;
  student: {
    firstName: string;
    lastName: string;
    grade: string;
    section: string;
  };
  date: string;
  sessionName: string;
  message: string;
  sendAfter: string;
  status: string;
  createdAt: string;
}

interface UserSession {
  id: string;
  email: string;
  role: string;
  tenantId: string;
}

export default function NotificationsDashboard() {
  const router = useRouter();
  const [session, setSession] = useState<UserSession | null>(null);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [triggering, setTriggering] = useState(false);
  const [filter, setFilter] = useState('ALL');
  const [message, setMessage] = useState<{type: 'success' | 'error', text: string} | null>(null);

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
    
    fetchNotifications(user.tenantId, 'ALL');
  }, [router]);

  const fetchNotifications = async (tenantId: string, currentFilter: string) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/notifications?status=${currentFilter}`, {
        headers: { 'x-tenant-id': tenantId }
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to fetch notifications');
      setNotifications(data.notifications || []);
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message });
    } finally {
      setLoading(false);
    }
  };

  const handleFilterChange = (newFilter: string) => {
    setFilter(newFilter);
    if (session) {
      fetchNotifications(session.tenantId, newFilter);
    }
  };

  const triggerProcess = async () => {
    if (!session) return;
    setTriggering(true);
    setMessage(null);
    try {
      const res = await fetch('/api/cron/process-notifications', {
        headers: { 'x-tenant-id': session.tenantId }
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to process queue');
      
      setMessage({ type: 'success', text: `Processed ${data.processed} items: ${data.sentCount} sent, ${data.cancelledCount} cancelled, ${data.errorCount} errors.` });
      
      // Refresh list
      fetchNotifications(session.tenantId, filter);
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message });
    } finally {
      setTriggering(false);
    }
  };

  if (!session) return null;

  return (
    <main className="min-h-screen bg-slate-50 text-slate-900 p-8 font-sans">
      <div className="max-w-6xl mx-auto space-y-8 mt-10">
        
        {/* Header */}
        <div className="bg-white p-8 rounded-3xl shadow-xl border border-slate-200 relative overflow-hidden">
          <div className="absolute top-0 right-0 p-8 opacity-10 pointer-events-none">
             <svg className="w-48 h-48 text-indigo-600" fill="currentColor" viewBox="0 0 24 24"><path d="M12 22c1.1 0 2-.9 2-2h-4c0 1.1.9 2 2 2zm6-6v-5c0-3.07-1.63-5.64-4.5-6.32V4c0-.83-.67-1.5-1.5-1.5s-1.5.67-1.5 1.5v.68C7.64 5.36 6 7.92 6 11v5l-2 2v1h16v-1l-2-2zm-2 1H8v-6c0-2.48 1.51-4.5 4-4.5s4 2.02 4 4.5v6z"/></svg>
          </div>
          
          <div className="relative z-10 flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
            <div>
              <h1 className="text-4xl font-extrabold text-slate-800 tracking-tight">
                Notification Hub
              </h1>
              <p className="mt-2 text-slate-500 text-lg">
                Monitor and process automated parent SMS and email alerts.
              </p>
            </div>
            
            <button 
              onClick={triggerProcess}
              disabled={triggering}
              className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3 px-6 rounded-xl shadow-md transition-all active:scale-95 disabled:opacity-50 flex items-center gap-2"
            >
              {triggering ? (
                <>
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  Processing...
                </>
              ) : (
                <>
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z"></path></svg>
                  Dispatch Queue Now
                </>
              )}
            </button>
          </div>
        </div>

        {/* Feedback Message */}
        {message && (
          <div className={`p-4 rounded-xl text-sm font-semibold border shadow-sm ${
            message.type === 'success' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-red-50 text-red-700 border-red-200'
          }`}>
            {message.text}
          </div>
        )}

        {/* Dashboard Content */}
        <div className="bg-white rounded-3xl shadow-md border border-slate-200 overflow-hidden">
          <div className="p-6 border-b border-slate-200 bg-slate-50 flex flex-col sm:flex-row justify-between items-center gap-4">
            <h2 className="text-xl font-bold text-slate-800">Alert Queue Log</h2>
            
            <div className="flex bg-slate-200 p-1 rounded-xl">
              {['ALL', 'PENDING', 'SENT', 'CANCELLED'].map((f) => (
                <button
                  key={f}
                  onClick={() => handleFilterChange(f)}
                  className={`px-4 py-1.5 rounded-lg text-sm font-bold transition-all ${
                    filter === f 
                      ? 'bg-white text-indigo-700 shadow-sm' 
                      : 'text-slate-500 hover:text-slate-700'
                  }`}
                >
                  {f}
                </button>
              ))}
            </div>
          </div>
          
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-white text-slate-500 text-xs uppercase tracking-wider font-semibold border-b border-slate-100">
                  <th className="px-6 py-4">Status</th>
                  <th className="px-6 py-4">Student</th>
                  <th className="px-6 py-4">Message Context</th>
                  <th className="px-6 py-4 text-right">Scheduled For</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {loading ? (
                  <tr><td colSpan={4} className="px-6 py-12 text-center text-slate-500 font-medium">Loading notifications...</td></tr>
                ) : notifications.length === 0 ? (
                  <tr><td colSpan={4} className="px-6 py-12 text-center text-slate-500 font-medium">No notifications found.</td></tr>
                ) : (
                  notifications.map((n) => (
                    <tr key={n.id} className="hover:bg-slate-50 transition-colors">
                      <td className="px-6 py-4">
                        <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold uppercase ${
                          n.status === 'SENT' ? 'bg-emerald-100 text-emerald-700' :
                          n.status === 'PENDING' ? 'bg-amber-100 text-amber-700' :
                          'bg-slate-100 text-slate-600'
                        }`}>
                          {n.status}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="font-bold text-slate-800">{n.student.firstName} {n.student.lastName}</div>
                        <div className="text-xs text-slate-500 mt-0.5">{n.student.grade} - {n.student.section}</div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="font-medium text-slate-700 text-sm max-w-xs truncate" title={n.message}>{n.message}</div>
                        <div className="text-xs text-slate-500 mt-0.5">{new Date(n.date).toLocaleDateString()} • {n.sessionName}</div>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="font-semibold text-slate-800 text-sm">{new Date(n.sendAfter).toLocaleTimeString()}</div>
                        <div className="text-xs text-slate-500 mt-0.5">{new Date(n.sendAfter).toLocaleDateString()}</div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

      </div>
    </main>
  );
}
