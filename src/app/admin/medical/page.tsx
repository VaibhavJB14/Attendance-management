'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

interface MedicalRecord {
  id: string;
  tenantId: string;
  type: 'STUDENT' | 'STAFF';
  name: string;
  gender?: string;
  phone: string;
  bloodGroup: string;
  dob: string;
  email: string;
  reportType: 'WRITTEN' | 'UPLOAD';
  reportContent: string;
  createdAt: string;
}

interface UserSession {
  id: string;
  email: string;
  role: string;
  tenantId: string;
}

const BLOOD_GROUPS = ['A+', 'A-', 'B+', 'B-', 'O+', 'O-', 'AB+', 'AB-'];
const GENDERS = ['Male', 'Female', 'Other'];

export default function MedicalHub() {
  const router = useRouter();
  const [session, setSession] = useState<UserSession | null>(null);

  const [activeTab, setActiveTab] = useState<'STUDENT' | 'STAFF'>('STUDENT');
  const [records, setRecords] = useState<MedicalRecord[]>([]);
  const [loading, setLoading] = useState(true);

  // Search & Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [filterBloodGroup, setFilterBloodGroup] = useState('');

  // Modals
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [selectedRecord, setSelectedRecord] = useState<MedicalRecord | null>(null);
  const [viewRecord, setViewRecord] = useState<MedicalRecord | null>(null);

  // Form State
  const [formData, setFormData] = useState({
    id: '',
    type: 'STUDENT' as 'STUDENT' | 'STAFF',
    name: '',
    gender: 'Male',
    phone: '',
    bloodGroup: 'O+',
    dob: '',
    email: '',
    reportType: 'WRITTEN' as 'WRITTEN' | 'UPLOAD',
    reportContent: '',
  });

  const [notification, setNotification] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    if (!notification) return;
    const timer = setTimeout(() => setNotification(null), 4000);
    return () => clearTimeout(timer);
  }, [notification]);

  useEffect(() => {
    const stored = localStorage.getItem('session');
    if (!stored) {
      setSession({
        id: '1',
        email: 'admin@system.com',
        role: 'SYSTEM_ADMIN',
        tenantId: '1',
      });
    } else {
      const user = JSON.parse(stored);
      setSession(user);
    }
  }, []);

  const fetchRecords = async () => {
    if (!session) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/medical?type=${activeTab}`, {
        headers: { 'x-tenant-id': session.tenantId },
      });
      const data = await res.json();
      if (res.ok) {
        let loadedRecords: MedicalRecord[] = data.records || [];

        // If database is empty for this tab, create demo seed data
        if (loadedRecords.length === 0) {
          const demoSeed = activeTab === 'STUDENT' ? [
            {
              type: 'STUDENT',
              name: 'Aarav Sharma',
              phone: '+91 98765 43210',
              bloodGroup: 'O+',
              dob: '2008-05-14',
              email: 'aarav.sharma@student.edu',
              reportType: 'WRITTEN',
              reportContent: 'Annual physical examination completed. All vitals normal. Mild asthma history noted.',
            },
            {
              type: 'STUDENT',
              name: 'Ananya Verma',
              phone: '+91 98123 45678',
              bloodGroup: 'A+',
              dob: '2009-11-20',
              email: 'ananya.v@student.edu',
              reportType: 'UPLOAD',
              reportContent: 'Blood_Test_Report_2026.pdf (Fitness clearance attached)',
            },
            {
              type: 'STUDENT',
              name: 'Rohan Gupta',
              phone: '+91 97654 32109',
              bloodGroup: 'B+',
              dob: '2007-03-08',
              email: 'rohan.g@student.edu',
              reportType: 'WRITTEN',
              reportContent: 'No known allergies. Dental checkup cleared on Jan 2026.',
            }
          ] : [
            {
              type: 'STAFF',
              name: 'Dr. Rajesh Nambiar',
              phone: '+91 94440 12345',
              bloodGroup: 'AB+',
              dob: '1982-08-25',
              email: 'rajesh.nambiar@school.edu',
              reportType: 'WRITTEN',
              reportContent: 'Staff health checkup. BP 120/80. Fit for active duties.',
            },
            {
              type: 'STAFF',
              name: 'Priya Sundaram',
              phone: '+91 98400 56789',
              bloodGroup: 'O-',
              dob: '1990-12-05',
              email: 'priya.sundaram@school.edu',
              reportType: 'UPLOAD',
              reportContent: 'Vaccination_Certificate_2026.pdf (Fully vaccinated)',
            }
          ];

          // Save seed records to database
          for (const item of demoSeed) {
            await fetch('/api/medical', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'x-tenant-id': session.tenantId,
              },
              body: JSON.stringify(item),
            });
          }

          const reloadRes = await fetch(`/api/medical?type=${activeTab}`, {
            headers: { 'x-tenant-id': session.tenantId },
          });
          const reloadData = await reloadRes.json();
          loadedRecords = reloadData.records || [];
        }

        setRecords(loadedRecords);
      }
    } catch (err) {
      console.error('Error fetching medical records:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (session) {
      fetchRecords();
    }
  }, [session, activeTab]);

  const handleOpenAddModal = () => {
    setFormData({
      id: '',
      type: activeTab,
      name: '',
      gender: 'Male',
      phone: '',
      bloodGroup: 'O+',
      dob: '',
      email: '',
      reportType: 'WRITTEN',
      reportContent: '',
    });
    setIsAddModalOpen(true);
  };

  const handleOpenEditModal = (rec: MedicalRecord) => {
    setSelectedRecord(rec);
    setFormData({
      id: rec.id,
      type: rec.type,
      name: rec.name,
      gender: rec.gender || 'Male',
      phone: rec.phone,
      bloodGroup: rec.bloodGroup,
      dob: rec.dob,
      email: rec.email,
      reportType: rec.reportType,
      reportContent: rec.reportContent || '',
    });
    setIsEditModalOpen(true);
  };

  const handleSaveRecord = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!session) return;

    try {
      const isEdit = Boolean(formData.id);
      const url = '/api/medical';
      const method = isEdit ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          'x-tenant-id': session.tenantId,
        },
        body: JSON.stringify(formData),
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || 'Failed to save record');
      }

      setNotification({
        type: 'success',
        text: isEdit ? 'Medical record updated successfully.' : 'New medical record added successfully.',
      });

      setIsAddModalOpen(false);
      setIsEditModalOpen(false);
      fetchRecords();
    } catch (error: any) {
      setNotification({ type: 'error', text: error.message || 'Error saving medical record' });
    }
  };

  const handleDeleteRecord = async (id: string) => {
    if (!session || !confirm('Are you sure you want to delete this medical record?')) return;

    try {
      const res = await fetch(`/api/medical?id=${id}`, {
        method: 'DELETE',
        headers: { 'x-tenant-id': session.tenantId },
      });

      if (!res.ok) throw new Error('Failed to delete record');

      setNotification({ type: 'success', text: 'Medical record deleted successfully.' });
      fetchRecords();
    } catch (error: any) {
      setNotification({ type: 'error', text: error.message || 'Error deleting medical record' });
    }
  };

  const handleExportCSV = () => {
    const headers = ['Type', 'Name', 'Phone', 'Blood Group', 'DOB', 'Email', 'Report Type', 'Report Details'];
    const rows = filteredRecords.map(r => [
      r.type,
      `"${r.name}"`,
      `"${r.phone}"`,
      `"${r.bloodGroup}"`,
      `"${r.dob}"`,
      `"${r.email}"`,
      `"${r.reportType}"`,
      `"${(r.reportContent || '').replace(/"/g, '""')}"`
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `${activeTab.toLowerCase()}_medical_records.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const filteredRecords = records.filter(r => {
    if (filterBloodGroup && r.bloodGroup !== filterBloodGroup) return false;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      return (
        r.name.toLowerCase().includes(q) ||
        r.phone.toLowerCase().includes(q) ||
        r.email.toLowerCase().includes(q) ||
        r.bloodGroup.toLowerCase().includes(q)
      );
    }
    return true;
  });

  if (!session) return null;

  return (
    <div className="max-w-6xl mx-auto space-y-6 font-sans pl-0 md:pl-8 pb-12">
      {/* Toast Notification */}
      {notification && (
        <div
          className={`fixed top-5 right-5 z-50 px-5 py-3.5 rounded-2xl shadow-xl border flex items-center gap-3 transition-all animate-bounce ${notification.type === 'success'
              ? 'bg-emerald-600 text-white border-emerald-500'
              : 'bg-rose-600 text-white border-rose-500'
            }`}
        >
          <span className="font-extrabold text-sm">{notification.text}</span>
        </div>
      )}

      {/* Hero Banner Header */}
      <div className="relative overflow-hidden bg-gradient-to-r from-emerald-500/10 via-teal-500/10 to-emerald-600/10 rounded-3xl p-8 border border-emerald-200/60 flex flex-col md:flex-row items-center justify-between shadow-xs">
        <div className="space-y-2 max-w-xl z-10">
          <span className="text-xs font-bold uppercase tracking-wider text-emerald-700 bg-emerald-100 px-3 py-1 rounded-full inline-block">
            Health & Medical Directory
          </span>
          <h1 className="text-3xl sm:text-4xl font-black text-slate-900 tracking-tight">
            Medical Records
          </h1>
          <p className="text-slate-600 text-sm sm:text-base font-medium">
            Centralized health registry with blood groups, contact details, DOB, and clinical reports.
          </p>
        </div>

        <div className="mt-6 md:mt-0 relative w-64 h-28 flex items-center justify-center">
          <div className="bg-white/90 backdrop-blur-xs rounded-2xl p-4 shadow-sm border border-emerald-100 flex items-center gap-4 w-full">
            <div className="w-12 h-12 bg-emerald-600 rounded-xl flex items-center justify-center text-white shadow-sm">
              <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.684a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
              </svg>
            </div>
            <div className="flex flex-col">
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Medical Hub</span>
              <span className="text-sm font-extrabold text-emerald-600">{records.length} Profiles Saved</span>
            </div>
          </div>
        </div>
      </div>

      {/* Main Tabs: Students Medical vs Staff Medical */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex bg-slate-100 p-1.5 rounded-2xl w-fit gap-1 border border-slate-200 shadow-inner">
          <button
            onClick={() => {
              setActiveTab('STUDENT');
              setSearchQuery('');
              setFilterBloodGroup('');
            }}
            className={`px-6 py-2.5 rounded-xl font-extrabold text-sm transition-all flex items-center gap-2 cursor-pointer ${activeTab === 'STUDENT'
                ? 'bg-white text-emerald-700 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
              }`}
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 14l9-5-9-5-9 5 9 5z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 14l6.16-3.422a12.083 12.083 0 01.665 6.479A11.952 11.952 0 0112 20.055a11.952 11.952 0 01-6.824-2.998 12.078 12.078 0 01.665-6.479L12 14z" /></svg>
            Students Medical
          </button>

          <button
            onClick={() => {
              setActiveTab('STAFF');
              setSearchQuery('');
              setFilterBloodGroup('');
            }}
            className={`px-6 py-2.5 rounded-xl font-extrabold text-sm transition-all flex items-center gap-2 cursor-pointer ${activeTab === 'STAFF'
                ? 'bg-white text-indigo-700 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
              }`}
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg>
            Staff Medical
          </button>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={handleExportCSV}
            className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-sm rounded-xl border border-slate-200 transition-all flex items-center gap-2 cursor-pointer"
          >
            <svg className="w-4 h-4 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
            Export CSV
          </button>

          <button
            onClick={handleOpenAddModal}
            className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-sm rounded-xl shadow-md shadow-emerald-200 transition-all flex items-center gap-2 cursor-pointer active:scale-95"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 4v16m8-8H4" /></svg>
            + Add Medical Record
          </button>
        </div>
      </div>

      {/* Filter & Search Toolbar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs flex flex-wrap items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-3 flex-1">
          <div className="relative flex-1 min-w-[240px]">
            <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
              <svg className="w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
            </div>
            <input
              type="text"
              placeholder={`Search ${activeTab === 'STUDENT' ? 'students' : 'staff'} by name, phone, email...`}
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 text-slate-800 text-sm rounded-xl focus:ring-emerald-500 focus:border-emerald-500 font-semibold placeholder-slate-400"
            />
          </div>

          <select
            value={filterBloodGroup}
            onChange={e => setFilterBloodGroup(e.target.value)}
            className="bg-slate-50 border border-slate-200 text-slate-800 text-sm rounded-xl focus:ring-emerald-500 focus:border-emerald-500 px-4 py-2.5 font-semibold min-w-[150px]"
          >
            <option value="">All Blood Groups</option>
            {BLOOD_GROUPS.map(bg => (
              <option key={bg} value={bg}>{bg}</option>
            ))}
          </select>
        </div>

        <div className="text-xs font-bold text-slate-500">
          Showing <span className="text-slate-900 font-extrabold">{filteredRecords.length}</span> records
        </div>
      </div>

      {/* Medical Records Roster Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-hidden">
        <div className="p-6 border-b border-slate-100 flex items-center justify-between">
          <div>
            <h2 className="text-lg font-extrabold text-slate-900">
              {activeTab === 'STUDENT' ? 'Student Health Registers' : 'Staff Health Registers'}
            </h2>
            <p className="text-slate-500 text-xs mt-0.5 font-medium">
              Detailed medical contact cards, blood groups, DOB, and clinical history.
            </p>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 text-slate-500 text-[11px] uppercase tracking-wider font-extrabold border-b border-slate-200/80">
                <th className="px-6 py-3.5">NAME</th>
                <th className="px-6 py-3.5">GENDER</th>
                <th className="px-6 py-3.5">BLOOD GROUP</th>
                <th className="px-6 py-3.5">PHONE NO.</th>
                <th className="px-6 py-3.5">DOB</th>
                <th className="px-6 py-3.5">EMAIL</th>
                <th className="px-6 py-3.5">REPORTS</th>
                <th className="px-6 py-3.5 text-right">ACTIONS</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-sm">
              {loading ? (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center text-slate-400 font-medium">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <div className="animate-spin rounded-full h-7 w-7 border-b-2 border-emerald-600"></div>
                      <span>Loading medical records...</span>
                    </div>
                  </td>
                </tr>
              ) : filteredRecords.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center text-slate-400 font-medium">
                    No medical records found matching your filters.
                  </td>
                </tr>
              ) : (
                filteredRecords.map(rec => {
                  const initial = rec.name ? rec.name[0].toUpperCase() : 'M';
                  return (
                    <tr key={rec.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="px-6 py-4 font-bold text-slate-900">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-full bg-emerald-50 text-emerald-700 flex items-center justify-center font-extrabold text-xs border border-emerald-100">
                            {initial}
                          </div>
                          <div>
                            <span className="block text-sm">{rec.name}</span>
                            <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">{rec.type}</span>
                          </div>
                        </div>
                      </td>

                      <td className="px-6 py-4">
                        <span className="px-2.5 py-1 bg-blue-50 border border-blue-200 text-blue-700 rounded-full font-extrabold text-xs">
                          {rec.gender || 'Male'}
                        </span>
                      </td>

                      <td className="px-6 py-4">
                        <span className="px-3 py-1 bg-rose-50 border border-rose-200 text-rose-600 rounded-full font-black text-xs inline-flex items-center gap-1">
                          <svg className="w-3 h-3 text-rose-500 fill-current" viewBox="0 0 24 24"><path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" /></svg>
                          {rec.bloodGroup}
                        </span>
                      </td>

                      <td className="px-6 py-4 font-semibold text-slate-700 font-mono text-xs">
                        {rec.phone}
                      </td>

                      <td className="px-6 py-4 font-medium text-slate-600">
                        {rec.dob || '-'}
                      </td>

                      <td className="px-6 py-4 text-slate-600 font-medium text-xs">
                        {rec.email || '-'}
                      </td>

                      <td className="px-6 py-4">
                        <button
                          onClick={() => setViewRecord(rec)}
                          className="px-3 py-1 rounded-lg text-xs font-extrabold bg-blue-50 text-blue-600 border border-blue-100 hover:bg-blue-100 transition-all flex items-center gap-1.5 cursor-pointer"
                        >
                          {rec.reportType === 'UPLOAD' ? (
                            <>
                              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" /></svg>
                              <span>Uploaded Doc</span>
                            </>
                          ) : (
                            <>
                              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
                              <span>Written Report</span>
                            </>
                          )}
                        </button>
                      </td>

                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => handleOpenEditModal(rec)}
                            className="p-2 text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors cursor-pointer"
                            title="Edit Medical Details"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg>
                          </button>

                          <button
                            onClick={() => handleDeleteRecord(rec.id)}
                            className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                            title="Delete Record"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add / Edit Medical Record Modal */}
      {(isAddModalOpen || isEditModalOpen) && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-3xl p-6 sm:p-8 max-w-lg w-full shadow-2xl border border-slate-200 space-y-6">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <h3 className="text-xl font-black text-slate-900">
                {isEditModalOpen ? 'Edit Medical Record' : `Add New ${activeTab === 'STUDENT' ? 'Student' : 'Staff'} Medical Record`}
              </h3>
              <button
                onClick={() => {
                  setIsAddModalOpen(false);
                  setIsEditModalOpen(false);
                }}
                className="text-slate-400 hover:text-slate-600 font-bold text-lg p-1"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveRecord} className="space-y-4">
              <div>
                <label className="text-xs font-extrabold uppercase tracking-wider text-slate-600 block mb-1.5">
                  Record Category
                </label>
                <select
                  value={formData.type}
                  onChange={e => setFormData({ ...formData, type: e.target.value as any })}
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-800 text-sm focus:ring-emerald-500 focus:border-emerald-500"
                >
                  <option value="STUDENT">Student Medical Record</option>
                  <option value="STAFF">Staff Medical Record</option>
                </select>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-extrabold uppercase tracking-wider text-slate-600 block mb-1.5">
                    Full Name *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Aarav Sharma"
                    value={formData.name}
                    onChange={e => setFormData({ ...formData, name: e.target.value })}
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl font-semibold text-slate-800 text-sm focus:ring-emerald-500 focus:border-emerald-500"
                  />
                </div>

                <div>
                  <label className="text-xs font-extrabold uppercase tracking-wider text-slate-600 block mb-1.5">
                    Gender *
                  </label>
                  <select
                    value={formData.gender}
                    onChange={e => setFormData({ ...formData, gender: e.target.value })}
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-800 text-sm focus:ring-emerald-500 focus:border-emerald-500"
                  >
                    {GENDERS.map(g => (
                      <option key={g} value={g}>{g}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-extrabold uppercase tracking-wider text-slate-600 block mb-1.5">
                    Phone No. *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="+91 98765 43210"
                    value={formData.phone}
                    onChange={e => setFormData({ ...formData, phone: e.target.value })}
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl font-semibold text-slate-800 text-sm focus:ring-emerald-500 focus:border-emerald-500"
                  />
                </div>

                <div>
                  <label className="text-xs font-extrabold uppercase tracking-wider text-slate-600 block mb-1.5">
                    Blood Group *
                  </label>
                  <select
                    value={formData.bloodGroup}
                    onChange={e => setFormData({ ...formData, bloodGroup: e.target.value })}
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-800 text-sm focus:ring-emerald-500 focus:border-emerald-500"
                  >
                    {BLOOD_GROUPS.map(bg => (
                      <option key={bg} value={bg}>{bg}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-extrabold uppercase tracking-wider text-slate-600 block mb-1.5">
                    Date of Birth (DOB)
                  </label>
                  <input
                    type="date"
                    value={formData.dob}
                    onChange={e => setFormData({ ...formData, dob: e.target.value })}
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl font-semibold text-slate-800 text-sm focus:ring-emerald-500 focus:border-emerald-500"
                  />
                </div>

                <div>
                  <label className="text-xs font-extrabold uppercase tracking-wider text-slate-600 block mb-1.5">
                    Email Address
                  </label>
                  <input
                    type="email"
                    placeholder="name@school.edu"
                    value={formData.email}
                    onChange={e => setFormData({ ...formData, email: e.target.value })}
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl font-semibold text-slate-800 text-sm focus:ring-emerald-500 focus:border-emerald-500"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-extrabold uppercase tracking-wider text-slate-600 block mb-1.5">
                  Report Format
                </label>
                <div className="flex gap-4 mb-2">
                  <label className="flex items-center gap-2 cursor-pointer text-sm font-bold text-slate-700">
                    <input
                      type="radio"
                      name="reportType"
                      value="WRITTEN"
                      checked={formData.reportType === 'WRITTEN'}
                      onChange={() => setFormData({ ...formData, reportType: 'WRITTEN' })}
                      className="text-emerald-600 focus:ring-emerald-500"
                    />
                    Written Clinical Report
                  </label>

                  <label className="flex items-center gap-2 cursor-pointer text-sm font-bold text-slate-700">
                    <input
                      type="radio"
                      name="reportType"
                      value="UPLOAD"
                      checked={formData.reportType === 'UPLOAD'}
                      onChange={() => setFormData({ ...formData, reportType: 'UPLOAD' })}
                      className="text-emerald-600 focus:ring-emerald-500"
                    />
                    Uploaded Document Link
                  </label>
                </div>

                {formData.reportType === 'WRITTEN' ? (
                  <textarea
                    rows={3}
                    placeholder="Write clinical diagnosis, health notes, medical conditions..."
                    value={formData.reportContent}
                    onChange={e => setFormData({ ...formData, reportContent: e.target.value })}
                    className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl font-medium text-slate-800 text-sm focus:ring-emerald-500 focus:border-emerald-500"
                  />
                ) : (
                  <input
                    type="text"
                    placeholder="e.g. Medical_Certificate_2026.pdf (URL / File Reference)"
                    value={formData.reportContent}
                    onChange={e => setFormData({ ...formData, reportContent: e.target.value })}
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl font-semibold text-slate-800 text-sm focus:ring-emerald-500 focus:border-emerald-500"
                  />
                )}
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => {
                    setIsAddModalOpen(false);
                    setIsEditModalOpen(false);
                  }}
                  className="px-4 py-2.5 rounded-xl font-bold text-slate-600 hover:bg-slate-100 text-sm"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-sm rounded-xl shadow-md transition-all active:scale-95 cursor-pointer"
                >
                  {isEditModalOpen ? 'Update Record' : 'Save Record'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* View Full Medical Report Modal */}
      {viewRecord && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-3xl p-6 sm:p-8 max-w-lg w-full shadow-2xl border border-slate-200 space-y-6">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <div className="flex items-center gap-3">
                <span className="w-10 h-10 rounded-2xl bg-emerald-100 text-emerald-800 flex items-center justify-center font-extrabold text-base">
                  {viewRecord.name[0]}
                </span>
                <div>
                  <h3 className="text-xl font-extrabold text-slate-900">{viewRecord.name}</h3>
                  <span className="text-xs font-bold text-emerald-600 uppercase tracking-wider">{viewRecord.type} Medical Profile</span>
                </div>
              </div>
              <button
                onClick={() => setViewRecord(null)}
                className="text-slate-400 hover:text-slate-600 font-bold text-lg p-1"
              >
                ✕
              </button>
            </div>

            <div className="grid grid-cols-2 gap-4 bg-slate-50 p-4 rounded-2xl border border-slate-200/80 text-sm">
              <div>
                <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block">Gender</span>
                <span className="font-extrabold text-blue-700 text-sm">{viewRecord.gender || 'Male'}</span>
              </div>
              <div>
                <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block">Blood Group</span>
                <span className="font-black text-rose-600 text-base">{viewRecord.bloodGroup}</span>
              </div>
              <div>
                <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block">Phone No.</span>
                <span className="font-bold text-slate-800 font-mono">{viewRecord.phone}</span>
              </div>
              <div>
                <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block">Date of Birth</span>
                <span className="font-semibold text-slate-700">{viewRecord.dob || 'Not specified'}</span>
              </div>
              <div>
                <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block">Email Address</span>
                <span className="font-semibold text-slate-700 truncate block">{viewRecord.email || 'Not specified'}</span>
              </div>
            </div>

            <div>
              <span className="text-xs font-extrabold uppercase tracking-wider text-slate-500 block mb-2">
                Medical Report / Diagnosis Notes ({viewRecord.reportType})
              </span>
              <div className="p-4 bg-emerald-50/50 border border-emerald-100 rounded-2xl text-slate-800 text-sm font-medium leading-relaxed">
                {viewRecord.reportContent || 'No additional clinical report details provided.'}
              </div>
            </div>

            <div className="flex justify-end pt-2">
              <button
                onClick={() => setViewRecord(null)}
                className="px-6 py-2.5 bg-slate-900 text-white font-bold text-sm rounded-xl hover:bg-slate-800 transition-all cursor-pointer"
              >
                Close Report
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
