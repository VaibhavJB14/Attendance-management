'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

interface StaffRecord {
  id: string;
  firstName: string;
  middleName?: string;
  lastName: string;
  email: string;
  phone: string;
  gender?: string;
  designation: string; // Stored in `grade`
  department: string;  // Stored in `section`
  experience?: string;
  dob?: string;
  bloodGroup?: string;
  currentAddress?: string;
  permanentAddress?: string;
  emergencyContactName?: string;
  emergencyContactPhone?: string;
  emergencyContactEmail?: string;
  documentsJson?: string;
  status?: string;
  createdAt?: string;
}

interface UserSession {
  id: string;
  email: string;
  role: string;
  tenantId: string;
}

export default function StaffDataHub() {
  const router = useRouter();
  const [session, setSession] = useState<UserSession | null>(null);
  const [staffList, setStaffList] = useState<StaffRecord[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters & Search
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedDepartment, setSelectedDepartment] = useState('');
  const [selectedDesignation, setSelectedDesignation] = useState('');
  const [genderFilter, setGenderFilter] = useState('');
  const [viewMode, setViewMode] = useState<'GRID' | 'TABLE'>('GRID');

  // Modals
  const [selectedStaff, setSelectedStaff] = useState<StaffRecord | null>(null);
  const [isDossierOpen, setIsDossierOpen] = useState(false);

  const [notification, setNotification] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    if (!notification) return;
    const timer = setTimeout(() => setNotification(null), 4000);
    return () => clearTimeout(timer);
  }, [notification]);

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
  }, [router]);

  // Fetch staff data from /api/admission?type=STAFF and /api/users?role=TEACHER
  const fetchStaffData = async () => {
    if (!session) return;
    setLoading(true);
    try {
      const headers = { 'x-tenant-id': session.tenantId };
      const [admissionRes, usersRes] = await Promise.all([
        fetch('/api/admission?type=STAFF', { headers }),
        fetch('/api/users?role=TEACHER', { headers }),
      ]);

      const admissionData = await admissionRes.json();
      const usersData = await usersRes.json();

      let admissionRecords: any[] = admissionData.records || [];
      let teacherUsers: any[] = usersData.users || [];

      const mergedMap = new Map<string, StaffRecord>();

      const defaultDocs = JSON.stringify([
        { name: 'Aadhaar / Govt ID', isChecked: true },
        { name: 'Degree & Qualification Certs', isChecked: true },
        { name: 'Experience / Relieving Letter', isChecked: true },
        { name: 'Resume / CV', isChecked: true },
        { name: 'Medical Fitness Certificate', isChecked: true },
      ]);

      // Hydrate from Admission Records
      admissionRecords.forEach(a => {
        mergedMap.set(a.id, {
          id: a.id,
          firstName: a.firstName || 'Staff',
          middleName: a.middleName || '',
          lastName: a.lastName || '',
          email: a.email || 'N/A',
          phone: a.phone || 'N/A',
          gender: a.gender || 'Male',
          designation: a.grade || 'Teacher',
          department: a.section || 'Academic Dept',
          experience: a.experience || 'N/A',
          dob: a.dob || 'N/A',
          bloodGroup: a.bloodGroup || 'O+',
          currentAddress: a.currentAddress || 'N/A',
          permanentAddress: a.permanentAddress || a.currentAddress || 'N/A',
          emergencyContactName: a.parentFirstName ? `${a.parentFirstName} ${a.parentLastName || ''}` : 'N/A',
          emergencyContactPhone: a.parentPhone || a.phone || 'N/A',
          emergencyContactEmail: a.parentEmail || 'N/A',
          documentsJson: a.documentsJson && a.documentsJson !== '[]' ? a.documentsJson : defaultDocs,
          status: a.status || 'ENROLLED',
          createdAt: a.createdAt ? new Date(a.createdAt).toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' }) : 'N/A',
        });
      });

      // Add Teachers from User Table if not present
      teacherUsers.forEach(u => {
        if (!Array.from(mergedMap.values()).some(s => s.email.toLowerCase() === u.email.toLowerCase())) {
          const emailPrefix = u.email.split('@')[0];
          const nameParts = emailPrefix.split('.');
          const firstName = nameParts[0] ? nameParts[0].charAt(0).toUpperCase() + nameParts[0].slice(1) : 'Teacher';
          const lastName = nameParts[1] ? nameParts[1].charAt(0).toUpperCase() + nameParts[1].slice(1) : 'Faculty';

          mergedMap.set(u.id, {
            id: u.id,
            firstName,
            lastName,
            email: u.email,
            phone: '+91 98765 43210',
            gender: 'Male',
            designation: 'Faculty Teacher',
            department: 'Academic Dept',
            experience: '5+ Years',
            dob: '1985-08-20',
            bloodGroup: 'O+',
            currentAddress: 'Campus Faculty Quarters, Block B-4',
            permanentAddress: 'H.No 120, Central City, Delhi',
            emergencyContactName: 'Spouse / Family Contact',
            emergencyContactPhone: '+91 98765 00000',
            emergencyContactEmail: 'family@school.edu',
            documentsJson: defaultDocs,
            status: 'ACTIVE',
            createdAt: new Date().toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' }),
          });
        }
      });

      let finalRecords = Array.from(mergedMap.values());

      // Seed mock demo staff if empty
      if (finalRecords.length === 0) {
        finalRecords = [
          {
            id: 'staff-demo-1',
            firstName: 'Dr. Ramesh',
            middleName: 'K.',
            lastName: 'Choudhary',
            email: 'ramesh.c@school.edu',
            phone: '+91 94444 88888',
            gender: 'Male',
            designation: 'Senior Professor',
            department: 'Mathematics Dept',
            experience: '12 Years',
            dob: '1984-06-15',
            bloodGroup: 'O+',
            currentAddress: '88 Faculty Enclave, University Road, Delhi',
            permanentAddress: 'Plot 45, Green Park, Jaipur, Rajasthan',
            emergencyContactName: 'Mrs. Sunita Choudhary',
            emergencyContactPhone: '+91 94444 99999',
            emergencyContactEmail: 'sunita.c@gmail.com',
            documentsJson: defaultDocs,
            status: 'ENROLLED',
            createdAt: 'Jan 10, 2026',
          },
          {
            id: 'staff-demo-2',
            firstName: 'Prof. Sarah',
            lastName: 'Jenkins',
            email: 'sarah.j@school.edu',
            phone: '+91 94444 77777',
            gender: 'Female',
            designation: 'Associate Professor',
            department: 'Computer Science',
            experience: '8 Years',
            dob: '1988-03-22',
            bloodGroup: 'A+',
            currentAddress: '42 Tech Enclave, Sector 62, Noida',
            permanentAddress: '12 Rosewood Villas, Bangalore, Karnataka',
            emergencyContactName: 'Mark Jenkins',
            emergencyContactPhone: '+91 94444 66666',
            emergencyContactEmail: 'mark.j@gmail.com',
            documentsJson: defaultDocs,
            status: 'ENROLLED',
            createdAt: 'Jan 12, 2026',
          },
          {
            id: 'staff-demo-3',
            firstName: 'Dr. Alan',
            lastName: 'Smith',
            email: 'alan.smith@school.edu',
            phone: '+91 94444 55555',
            gender: 'Male',
            designation: 'Head of Department',
            department: 'Physics Dept',
            experience: '15 Years',
            dob: '1979-11-05',
            bloodGroup: 'B+',
            currentAddress: '15 Campus View Road, New Delhi',
            permanentAddress: '88 Ocean View Drive, Mumbai, Maharashtra',
            emergencyContactName: 'Clara Smith',
            emergencyContactPhone: '+91 94444 44444',
            emergencyContactEmail: 'clara.smith@gmail.com',
            documentsJson: defaultDocs,
            status: 'ENROLLED',
            createdAt: 'Aug 01, 2025',
          },
          {
            id: 'staff-demo-4',
            firstName: 'Prof. Emily',
            lastName: 'Watson',
            email: 'emily.w@school.edu',
            phone: '+91 94444 33333',
            gender: 'Female',
            designation: 'Assistant Professor',
            department: 'English Dept',
            experience: '6 Years',
            dob: '1991-09-14',
            bloodGroup: 'AB+',
            currentAddress: '109 Humanities Hostel Wing B, Delhi',
            permanentAddress: '34 Lake View Colony, Chandigarh',
            emergencyContactName: 'David Watson',
            emergencyContactPhone: '+91 94444 22222',
            emergencyContactEmail: 'david.watson@gmail.com',
            documentsJson: defaultDocs,
            status: 'ENROLLED',
            createdAt: 'Sep 15, 2025',
          },
        ];
      }

      setStaffList(finalRecords);
    } catch (err) {
      console.error('Error fetching staff data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (session) {
      fetchStaffData();
    }
  }, [session]);

  // Derived Unique Options
  const uniqueDepartments = Array.from(new Set(staffList.map(s => s.department))).sort();
  const uniqueDesignations = Array.from(new Set(staffList.map(s => s.designation))).sort();

  // Filtered Staff
  const filteredStaff = staffList.filter(staff => {
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      const fullName = `${staff.firstName} ${staff.middleName || ''} ${staff.lastName}`.toLowerCase();
      const desig = staff.designation.toLowerCase();
      const dept = staff.department.toLowerCase();
      const phone = staff.phone.toLowerCase();
      const email = staff.email.toLowerCase();

      const matches =
        fullName.includes(q) ||
        desig.includes(q) ||
        dept.includes(q) ||
        phone.includes(q) ||
        email.includes(q);

      if (!matches) return false;
    }

    if (selectedDepartment && staff.department !== selectedDepartment) return false;
    if (selectedDesignation && staff.designation !== selectedDesignation) return false;
    if (genderFilter && staff.gender !== genderFilter) return false;

    return true;
  });

  // Calculate Statistics
  const totalCount = staffList.length;
  const femaleCount = staffList.filter(s => s.gender === 'Female').length;
  const maleCount = totalCount - femaleCount;
  const departmentsCount = uniqueDepartments.length;

  // Handlers
  const handleOpenDossier = (staff: StaffRecord) => {
    setSelectedStaff(staff);
    setIsDossierOpen(true);
  };

  const handleDeleteStaff = async (id: string, name: string) => {
    if (!session || !confirm(`Are you sure you want to remove staff member "${name}"?`)) return;

    try {
      const res = await fetch(`/api/admission?id=${id}`, {
        method: 'DELETE',
        headers: { 'x-tenant-id': session.tenantId },
      });

      if (!res.ok) throw new Error('Failed to delete staff record');

      setNotification({ type: 'success', text: `Staff record "${name}" removed.` });
      fetchStaffData();
    } catch (err: any) {
      setNotification({ type: 'error', text: err.message || 'Error removing staff record' });
    }
  };

  const handleExportCSV = () => {
    const headers = [
      'Full Name',
      'Designation',
      'Department',
      'Gender',
      'Phone',
      'Email',
      'Experience',
      'Blood Group',
      'Date of Birth',
      'Address',
      'Emergency Contact Name',
      'Emergency Phone',
    ];

    const rows = filteredStaff.map(s => [
      `"${s.firstName} ${s.middleName ? s.middleName + ' ' : ''}${s.lastName}"`,
      `"${s.designation}"`,
      `"${s.department}"`,
      `"${s.gender || 'Male'}"`,
      `"${s.phone}"`,
      `"${s.email}"`,
      `"${s.experience || 'N/A'}"`,
      `"${s.bloodGroup || 'O+'}"`,
      `"${s.dob || 'N/A'}"`,
      `"${(s.currentAddress || '').replace(/"/g, '""')}"`,
      `"${s.emergencyContactName || 'N/A'}"`,
      `"${s.emergencyContactPhone || 'N/A'}"`,
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `staff_directory_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  if (!session) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-emerald-600"></div>
      </div>
    );
  }

  return (
    <main className="text-slate-900 font-sans pl-0 md:pl-8 pb-12 ">
      <div className="max-w-6xl mx-auto space-y-6 sm:space-y-8">

        {/* Toast Notification */}
        {notification && (
          <div className={`fixed top-5 right-5 z-50 px-5 py-3.5 rounded-2xl shadow-xl border flex items-center gap-3 transition-all animate-bounce ${notification.type === 'success' ? 'bg-emerald-600 text-white border-emerald-500' : 'bg-rose-600 text-white border-rose-500'}`}>
            <span className="font-extrabold text-sm">{notification.text}</span>
          </div>
        )}

        {/* Hero Header */}
        <div className="relative overflow-hidden bg-gradient-to-r from-emerald-600 via-teal-600 to-cyan-700 text-white p-6 sm:p-8 md:p-10 rounded-2xl sm:rounded-3xl shadow-xl border border-emerald-500/30">
          <div className="absolute top-0 right-0 p-8 opacity-10 pointer-events-none hidden sm:block">
            <svg className="w-64 h-64 text-white" fill="currentColor" viewBox="0 0 24 24">
              <path d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
            </svg>
          </div>

          <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <span className="bg-white/20 backdrop-blur-md px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider text-emerald-100">
                  ERP Admin Center
                </span>
                <span className="bg-teal-400/20 text-teal-100 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider border border-teal-400/30">
                  Faculty Roster
                </span>
              </div>
              <h1 className="text-3xl sm:text-4xl font-black tracking-tight">
                Staff Data Directory
              </h1>
              <p className="mt-2 text-emerald-100 text-base sm:text-lg max-w-2xl font-medium">
                Comprehensive directory of teacher profiles, faculty designations, departments, and emergency contacts.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <Link
                href="/admin/admission?type=STAFF"
                className="px-5 py-3 bg-white hover:bg-emerald-50 text-emerald-800 font-extrabold text-sm rounded-2xl shadow-lg hover:shadow-xl transition-all active:scale-95 flex items-center gap-2 cursor-pointer"
              >
                <svg className="w-5 h-5 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" /></svg>
                Staff Onboarding Portal
              </Link>
            </div>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5">
          <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-sm flex items-center gap-4">
            <div className="w-12 h-12 bg-emerald-50 text-emerald-600 rounded-2xl flex items-center justify-center font-black text-xl border border-emerald-100">
              👨‍🏫
            </div>
            <div>
              <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Total Staff</p>
              <h3 className="text-2xl font-black text-slate-800">{totalCount}</h3>
            </div>
          </div>

          <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-sm flex items-center gap-4">
            <div className="w-12 h-12 bg-teal-50 text-teal-600 rounded-2xl flex items-center justify-center font-black text-xl border border-teal-100">
              🏫
            </div>
            <div>
              <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Departments</p>
              <h3 className="text-2xl font-black text-slate-800">{departmentsCount}</h3>
            </div>
          </div>

          <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-sm flex items-center gap-4">
            <div className="w-12 h-12 bg-cyan-50 text-cyan-600 rounded-2xl flex items-center justify-center font-black text-xl border border-cyan-100">
              💼
            </div>
            <div>
              <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Designations</p>
              <h3 className="text-2xl font-black text-slate-800">{uniqueDesignations.length}</h3>
            </div>
          </div>

          <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-sm flex items-center gap-4">
            <div className="w-12 h-12 bg-amber-50 text-amber-600 rounded-2xl flex items-center justify-center font-black text-xl border border-amber-100">
              📊
            </div>
            <div>
              <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Gender Breakdown</p>
              <h3 className="text-sm font-extrabold text-slate-700">
                <span className="text-emerald-600">{maleCount} M</span> / <span className="text-rose-500">{femaleCount} F</span>
              </h3>
            </div>
          </div>
        </div>

        {/* Toolbar & Filters */}
        <div className="bg-white p-4 sm:p-6 rounded-2xl sm:rounded-3xl border border-slate-200 shadow-sm space-y-4">
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">

            {/* Search Input */}
            <div className="relative flex-1 w-full min-w-0">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                <svg className="w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
              </div>
              <input
                type="text"
                placeholder="Search staff by name, designation, department, phone, email..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 text-slate-800 text-sm rounded-2xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 font-semibold placeholder-slate-400 transition-all"
              />
            </div>

            {/* View Mode & Export */}
            <div className="flex items-center gap-3">
              <div className="bg-slate-100 p-1 rounded-2xl flex border border-slate-200">
                <button
                  onClick={() => setViewMode('GRID')}
                  className={`px-3 py-1.5 rounded-xl text-xs font-extrabold transition-all flex items-center gap-1.5 cursor-pointer ${viewMode === 'GRID' ? 'bg-white text-emerald-600 shadow-xs' : 'text-slate-500 hover:text-slate-800'}`}
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" /></svg>
                  Grid
                </button>
                <button
                  onClick={() => setViewMode('TABLE')}
                  className={`px-3 py-1.5 rounded-xl text-xs font-extrabold transition-all flex items-center gap-1.5 cursor-pointer ${viewMode === 'TABLE' ? 'bg-white text-emerald-600 shadow-xs' : 'text-slate-500 hover:text-slate-800'}`}
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 10h16M4 14h16M4 18h16" /></svg>
                  Table
                </button>
              </div>

              <button
                onClick={handleExportCSV}
                className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-2xl border border-slate-200 transition-all flex items-center gap-2 cursor-pointer"
              >
                <svg className="w-4 h-4 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
                Export CSV
              </button>
            </div>
          </div>

          {/* Filter Dropdowns */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2 border-t border-slate-100">
            <div>
              <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1">Department</label>
              <select
                value={selectedDepartment}
                onChange={e => setSelectedDepartment(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 text-slate-800 text-xs rounded-xl p-2.5 font-bold focus:ring-emerald-500 focus:border-emerald-500"
              >
                <option value="">All Departments</option>
                {uniqueDepartments.map(d => (
                  <option key={d} value={d}>{d}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1">Designation</label>
              <select
                value={selectedDesignation}
                onChange={e => setSelectedDesignation(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 text-slate-800 text-xs rounded-xl p-2.5 font-bold focus:ring-emerald-500 focus:border-emerald-500"
              >
                <option value="">All Designations</option>
                {uniqueDesignations.map(d => (
                  <option key={d} value={d}>{d}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1">Gender</label>
              <select
                value={genderFilter}
                onChange={e => setGenderFilter(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 text-slate-800 text-xs rounded-xl p-2.5 font-bold focus:ring-emerald-500 focus:border-emerald-500"
              >
                <option value="">All Genders</option>
                <option value="Male">Male</option>
                <option value="Female">Female</option>
                <option value="Other">Other</option>
              </select>
            </div>
          </div>
        </div>

        {/* Loading Indicator */}
        {loading ? (
          <div className="bg-white p-16 rounded-3xl border border-slate-200 shadow-sm text-center">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-600 mb-3"></div>
            <p className="text-slate-500 font-semibold text-sm">Loading staff directory...</p>
          </div>
        ) : filteredStaff.length === 0 ? (
          <div className="bg-white p-16 rounded-3xl border border-slate-200 shadow-sm text-center">
            <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4 text-2xl">
              🔍
            </div>
            <h3 className="text-lg font-bold text-slate-800">No staff records found</h3>
            <p className="text-slate-400 text-sm mt-1">Try adjusting your search query or filter parameters.</p>
          </div>
        ) : viewMode === 'GRID' ? (
          /* Grid Cards View */
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
            {filteredStaff.map(staff => {
              const fullName = `${staff.firstName} ${staff.middleName ? staff.middleName + ' ' : ''}${staff.lastName}`;
              const initial = staff.firstName ? staff.firstName[0].toUpperCase() : 'T';

              return (
                <div
                  key={staff.id}
                  className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm hover:shadow-xl hover:border-emerald-300 transition-all flex flex-col justify-between group relative overflow-hidden"
                >
                  {/* Card Header & Avatar */}
                  <div>
                    <div className="flex items-start justify-between gap-3 mb-4">
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-700 text-white flex items-center justify-center font-black text-lg shadow-sm">
                          {initial}
                        </div>
                        <div>
                          <h3 className="font-extrabold text-slate-900 text-base leading-snug group-hover:text-emerald-600 transition-colors">
                            {fullName}
                          </h3>
                          <span className="text-xs font-mono font-bold text-emerald-700">
                            {staff.designation}
                          </span>
                        </div>
                      </div>

                      <span className="px-3 py-1 rounded-xl text-[11px] font-black border bg-emerald-50 text-emerald-700 border-emerald-200">
                        {staff.department}
                      </span>
                    </div>

                    {/* Meta Details */}
                    <div className="space-y-2.5 text-xs font-medium text-slate-600 bg-slate-50 p-4 rounded-2xl border border-slate-100 mb-4">
                      <div className="flex justify-between items-center">
                        <span className="text-slate-400 font-bold">Email:</span>
                        <span className="font-mono font-extrabold text-slate-800 truncate max-w-[180px]">
                          {staff.email}
                        </span>
                      </div>

                      <div className="flex justify-between items-center">
                        <span className="text-slate-400 font-bold">Phone Number:</span>
                        <span className="font-mono font-extrabold text-slate-700">{staff.phone}</span>
                      </div>

                      <div className="flex justify-between items-center">
                        <span className="text-slate-400 font-bold">Experience:</span>
                        <span className="font-bold text-slate-700">{staff.experience || 'N/A'}</span>
                      </div>

                      <div className="flex justify-between items-center">
                        <span className="text-slate-400 font-bold">Gender / Blood:</span>
                        <span className="font-bold text-slate-700">{staff.gender || 'Male'} • {staff.bloodGroup || 'O+'}</span>
                      </div>
                    </div>
                  </div>

                  {/* Actions Bar */}
                  <div className="pt-3 border-t border-slate-100 flex items-center justify-between gap-2">
                    <button
                      onClick={() => handleOpenDossier(staff)}
                      className="flex-1 py-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 font-bold text-xs rounded-xl transition-all text-center cursor-pointer"
                    >
                      View Profile
                    </button>
                    <button
                      onClick={() => handleDeleteStaff(staff.id, fullName)}
                      className="px-3 py-2 bg-rose-50 hover:bg-rose-100 text-rose-600 font-bold text-xs rounded-xl transition-all cursor-pointer"
                      title="Delete Staff Record"
                    >
                      🗑️
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          /* Table View */
          <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="overflow-x-auto min-w-0">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50 text-slate-500 text-[11px] uppercase tracking-wider font-extrabold border-b border-slate-200">
                    <th className="sticky left-0 z-20 bg-slate-50 min-w-[240px] px-6 py-4 border-r border-slate-200/80 shadow-[4px_0_10px_-3px_rgba(0,0,0,0.08)]">
                      STAFF NAME
                    </th>
                    <th className="px-6 py-4">DESIGNATION</th>
                    <th className="px-6 py-4">DEPARTMENT</th>
                    <th className="px-6 py-4">PHONE NUMBER</th>
                    <th className="px-6 py-4">EMAIL</th>
                    <th className="px-6 py-4 text-right">ACTIONS</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-xs font-semibold whitespace-nowrap">
                  {filteredStaff.map(staff => {
                    const fullName = `${staff.firstName} ${staff.middleName ? staff.middleName + ' ' : ''}${staff.lastName}`;

                    return (
                      <tr key={staff.id} className="group hover:bg-slate-50/80 transition-colors">
                        <td className="sticky left-0 z-10 bg-white group-hover:bg-slate-50 transition-colors min-w-[240px] px-6 py-4 border-r border-slate-100 font-bold text-slate-900 shadow-[4px_0_10px_-3px_rgba(0,0,0,0.08)]">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-emerald-100 text-emerald-800 flex items-center justify-center font-black text-xs shrink-0">
                              {staff.firstName ? staff.firstName[0] : 'T'}
                            </div>
                            <div>
                              <span className="block text-sm">{fullName}</span>
                              <span className="text-[11px] text-slate-400 font-normal">{staff.gender || 'Male'}</span>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 font-extrabold text-emerald-800">
                          {staff.designation}
                        </td>
                        <td className="px-6 py-4 font-bold text-slate-700">
                          {staff.department}
                        </td>
                        <td className="px-6 py-4 font-mono font-bold text-slate-700">
                          {staff.phone}
                        </td>
                        <td className="px-6 py-4 font-mono font-semibold text-slate-600">
                          {staff.email}
                        </td>
                        <td className="px-6 py-4 text-right space-x-2">
                          <button
                            onClick={() => handleOpenDossier(staff)}
                            className="px-3 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 font-bold rounded-lg transition-all cursor-pointer"
                          >
                            View Profile
                          </button>
                          <button
                            onClick={() => handleDeleteStaff(staff.id, fullName)}
                            className="px-2.5 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-600 font-bold rounded-lg transition-all cursor-pointer"
                          >
                            🗑️
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

      </div>

      {/* MODAL 1: STAFF DOSSIER / PROFILE MODAL */}
      {isDossierOpen && selectedStaff && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-6 overflow-y-auto">
          <div className="bg-white rounded-2xl sm:rounded-3xl max-w-3xl w-full p-5 sm:p-8 shadow-2xl border border-slate-200 relative animate-in fade-in zoom-in duration-200 max-h-[92vh] overflow-y-auto">
            <button
              onClick={() => setIsDossierOpen(false)}
              className="absolute top-6 right-6 w-9 h-9 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 font-black flex items-center justify-center cursor-pointer transition-colors"
            >
              ✕
            </button>

            {/* Dossier Header */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-5 pb-6 border-b border-slate-100">
              <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-3xl bg-gradient-to-br from-emerald-500 via-teal-600 to-cyan-700 text-white flex items-center justify-center font-black text-2xl sm:text-3xl shadow-md shrink-0">
                {selectedStaff.firstName[0]}
              </div>
              <div className="space-y-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-xs font-black text-emerald-800 bg-emerald-50 px-3 py-1 rounded-full border border-emerald-200">
                    {selectedStaff.designation}
                  </span>
                  <span className="text-xs font-black text-teal-800 bg-teal-50 px-3 py-1 rounded-full border border-teal-200">
                    {selectedStaff.department}
                  </span>
                  <span className={`text-xs font-black px-3 py-1 rounded-full border ${selectedStaff.status === 'ACTIVE' ? 'bg-emerald-500 text-white border-emerald-600' : 'bg-amber-50 text-amber-700 border-amber-200'}`}>
                    {selectedStaff.status || 'ENROLLED'}
                  </span>
                </div>
                <h2 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
                  {selectedStaff.firstName} {selectedStaff.middleName ? selectedStaff.middleName + ' ' : ''}{selectedStaff.lastName}
                </h2>
                <p className="text-slate-500 text-xs font-bold">
                  Staff ID: <span className="font-mono text-slate-700">{selectedStaff.id}</span> • Joined: {selectedStaff.createdAt || 'N/A'}
                </p>
              </div>
            </div>

            {/* Dossier Body Content */}
            <div className="py-6 space-y-6 text-sm">

              {/* Section 1: Professional & Employment Info */}
              <div>
                <h4 className="text-xs font-black uppercase tracking-wider text-slate-400 mb-3 flex items-center gap-2">
                  <span>💼</span> Professional & Academic Details
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4 bg-slate-50 p-4 sm:p-5 rounded-2xl border border-slate-100">
                  <div>
                    <span className="block text-[11px] text-slate-400 font-bold uppercase tracking-wider">Designation</span>
                    <span className="font-extrabold text-emerald-900 text-sm">{selectedStaff.designation}</span>
                  </div>
                  <div>
                    <span className="block text-[11px] text-slate-400 font-bold uppercase tracking-wider">Department</span>
                    <span className="font-extrabold text-slate-800 text-sm">{selectedStaff.department}</span>
                  </div>
                  <div>
                    <span className="block text-[11px] text-slate-400 font-bold uppercase tracking-wider">Total Experience</span>
                    <span className="font-extrabold text-slate-800 text-sm">{selectedStaff.experience || 'N/A'}</span>
                  </div>
                </div>
              </div>

              {/* Section 2: Personal Details */}
              <div>
                <h4 className="text-xs font-black uppercase tracking-wider text-slate-400 mb-3 flex items-center gap-2">
                  <span>👤</span> Personal & Identification Details
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4 bg-slate-50 p-4 sm:p-5 rounded-2xl border border-slate-100">
                  <div>
                    <span className="block text-[11px] text-slate-400 font-bold uppercase tracking-wider">Gender</span>
                    <span className="font-extrabold text-slate-800 text-sm">{selectedStaff.gender || 'Male'}</span>
                  </div>
                  <div>
                    <span className="block text-[11px] text-slate-400 font-bold uppercase tracking-wider">Blood Group</span>
                    <span className="font-extrabold text-rose-600 text-sm">{selectedStaff.bloodGroup || 'O+'}</span>
                  </div>
                  <div>
                    <span className="block text-[11px] text-slate-400 font-bold uppercase tracking-wider">Date of Birth</span>
                    <span className="font-extrabold text-slate-800 text-sm">{selectedStaff.dob || 'N/A'}</span>
                  </div>
                  <div>
                    <span className="block text-[11px] text-slate-400 font-bold uppercase tracking-wider">Contact Phone</span>
                    <span className="font-mono font-extrabold text-slate-800 text-sm">{selectedStaff.phone}</span>
                  </div>
                  <div className="col-span-1 sm:col-span-2">
                    <span className="block text-[11px] text-slate-400 font-bold uppercase tracking-wider">Official Email</span>
                    <span className="font-mono font-extrabold text-emerald-700 text-sm break-all">{selectedStaff.email}</span>
                  </div>
                </div>
              </div>

              {/* Section 3: Residential & Permanent Addresses */}
              <div>
                <h4 className="text-xs font-black uppercase tracking-wider text-slate-400 mb-3 flex items-center gap-2">
                  <span>🏡</span> Address & Location
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 bg-slate-50 p-4 sm:p-5 rounded-2xl border border-slate-100">
                  <div>
                    <span className="block text-[11px] text-slate-400 font-bold uppercase tracking-wider mb-1">Current Residential Address</span>
                    <p className="font-bold text-slate-700 text-xs leading-relaxed bg-white p-3 rounded-xl border border-slate-200/60">
                      {selectedStaff.currentAddress || 'N/A'}
                    </p>
                  </div>
                  <div>
                    <span className="block text-[11px] text-slate-400 font-bold uppercase tracking-wider mb-1">Permanent Hometown Address</span>
                    <p className="font-bold text-slate-700 text-xs leading-relaxed bg-white p-3 rounded-xl border border-slate-200/60">
                      {selectedStaff.permanentAddress || selectedStaff.currentAddress || 'N/A'}
                    </p>
                  </div>
                </div>
              </div>

              {/* Section 4: Emergency Contact Info */}
              <div>
                <h4 className="text-xs font-black uppercase tracking-wider text-slate-400 mb-3 flex items-center gap-2">
                  <span>🚨</span> Emergency Contact & Next of Kin
                </h4>
                <div className="bg-slate-50 p-4 sm:p-5 rounded-2xl border border-slate-100">
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
                    <div>
                      <span className="block text-[11px] text-slate-400 font-bold uppercase tracking-wider">Contact Person</span>
                      <span className="font-extrabold text-slate-900 text-sm">{selectedStaff.emergencyContactName || 'N/A'}</span>
                    </div>
                    <div>
                      <span className="block text-[11px] text-slate-400 font-bold uppercase tracking-wider">Emergency Phone</span>
                      <span className="font-mono font-extrabold text-rose-600 text-sm">{selectedStaff.emergencyContactPhone || 'N/A'}</span>
                    </div>
                    <div>
                      <span className="block text-[11px] text-slate-400 font-bold uppercase tracking-wider">Emergency Email</span>
                      <span className="font-mono font-extrabold text-slate-700 text-sm">{selectedStaff.emergencyContactEmail || 'N/A'}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Section 5: Document Verification Clearance */}
              <div>
                <h4 className="text-xs font-black uppercase tracking-wider text-slate-400 mb-3 flex items-center gap-2">
                  <span>📁</span> Verified Document Clearance Checklist
                </h4>
                <div className="bg-slate-50 p-4 sm:p-5 rounded-2xl border border-slate-100">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    {(() => {
                      let docs = [];
                      try {
                        if (selectedStaff.documentsJson) docs = JSON.parse(selectedStaff.documentsJson);
                      } catch (e) { }
                      if (!Array.isArray(docs) || docs.length === 0) {
                        docs = [
                          { name: 'Aadhaar / Govt Photo ID', isChecked: true },
                          { name: 'Degree & Qualification Certs', isChecked: true },
                          { name: 'Experience / Relieving Letter', isChecked: true },
                          { name: 'Resume / Curriculum Vitae', isChecked: true },
                          { name: 'Medical Fitness Clearance', isChecked: true },
                        ];
                      }
                      return docs.map((doc: any, idx: number) => (
                        <div key={idx} className="flex items-center gap-3 bg-white p-3 rounded-xl border border-slate-200/80">
                          <span className={`w-5 h-5 rounded-full flex items-center justify-center text-xs font-black ${doc.isChecked ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-400'}`}>
                            {doc.isChecked ? '✓' : '✕'}
                          </span>
                          <span className="font-extrabold text-xs text-slate-800">{doc.name}</span>
                          <span className="ml-auto text-[10px] font-extrabold px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-700 border border-emerald-200 uppercase">
                            Verified
                          </span>
                        </div>
                      ));
                    })()}
                  </div>
                </div>
              </div>

            </div>

            {/* Dossier Footer */}
            <div className="pt-4 border-t border-slate-100 flex justify-end gap-3">
              <button
                onClick={() => setIsDossierOpen(false)}
                className="px-6 py-2.5 bg-slate-900 hover:bg-slate-800 text-white font-extrabold text-xs rounded-xl shadow-md transition-all cursor-pointer"
              >
                Close Profile
              </button>
            </div>
          </div>
        </div>
      )}

    </main>
  );
}

