'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';

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

interface RequiredDoc {
  name: string;
  isChecked: boolean;
  fileName?: string;
  fileUrl?: string;
}

interface AdmissionRecord {
  id: string;
  type: 'STUDENT' | 'STAFF';
  studentId?: string;
  // Personal Details
  firstName: string;
  middleName?: string;
  lastName: string;
  dob: string;
  gender?: string;
  bloodGroup: string;
  phone: string;
  email: string;
  currentAddress: string;
  permanentAddress: string;
  // Parent / Emergency Contact Details
  parentFirstName: string;
  parentMiddleName?: string;
  parentLastName: string;
  parentDob?: string;
  parentBloodGroup?: string;
  parentPhone: string;
  parentEmail?: string;
  // Assignment
  grade: string;   // For student: Grade, For staff: Designation
  section: string; // For student: Section, For staff: Department
  isHosteler: boolean;
  hostelName?: string;
  roomNumber?: string;
  experience?: string;
  // Documents & Status
  status: 'ENROLLED' | 'PENDING_VERIFICATION' | 'APPROVED';
  documentsJson: string;
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

const STUDENT_DOCUMENTS_LIST = [
  'Birth Certificate',
  'Transfer Certificate (TC)',
  'Previous Marksheet / Report Card',
  'Aadhaar Card / National ID',
  'Passport Size Photo',
  'Medical Fitness Certificate',
];

const STAFF_DOCUMENTS_LIST = [
  'Government Photo ID / Aadhaar',
  'Educational Qualification Certificates / Degree',
  'Experience Certificate / Relieving Letter',
  'Resume / CV',
  'Passport Size Photograph',
  'Medical / Background Clearance Certificate',
];

export default function AdmissionDashboard() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const typeParam = searchParams.get('type');

  const [session, setSession] = useState<UserSession | null>(null);

  // Active Category View: STUDENT | STAFF
  const [activeCategory, setActiveCategory] = useState<'STUDENT' | 'STAFF'>(
    typeParam === 'STAFF' ? 'STAFF' : 'STUDENT'
  );

  const [records, setRecords] = useState<AdmissionRecord[]>([]);
  const [loading, setLoading] = useState(true);

  // Search & Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('');

  // Modals
  const [isEnrollModalOpen, setIsEnrollModalOpen] = useState(false);
  const [modalType, setModalType] = useState<'STUDENT' | 'STAFF'>('STUDENT');
  const [viewRecord, setViewRecord] = useState<AdmissionRecord | null>(null);
  const [currentStep, setCurrentStep] = useState<number>(1);

  // Form State
  const [formData, setFormData] = useState({
    type: 'STUDENT' as 'STUDENT' | 'STAFF',
    // Personal Details
    firstName: '',
    middleName: '',
    lastName: '',
    dob: '',
    gender: 'Male',
    bloodGroup: 'O+',
    phone: '',
    email: '',
    currentAddress: '',
    permanentAddress: '',
    sameAddress: false,
    // Parent / Emergency Contact Details
    parentFirstName: '',
    parentMiddleName: '',
    parentLastName: '',
    parentDob: '',
    parentBloodGroup: 'O+',
    parentPhone: '',
    parentEmail: '',
    // Assignment
    grade: 'Year 1',
    section: 'Sec A',
    isHosteler: false,
    hostelName: 'Boys Hostel',
    roomNumber: '101',
    experience: '',
    // Documents
    documents: STUDENT_DOCUMENTS_LIST.map(docName => ({
      name: docName,
      isChecked: false,
      fileName: '',
      fileUrl: '',
    })),
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

  useEffect(() => {
    if (typeParam === 'STAFF') {
      setActiveCategory('STAFF');
    } else if (typeParam === 'STUDENT') {
      setActiveCategory('STUDENT');
    }
  }, [typeParam]);

  const fetchRecords = async () => {
    if (!session) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/admission?type=${activeCategory}`, {
        headers: { 'x-tenant-id': session.tenantId },
      });
      const data = await res.json();
      if (res.ok) {
        let loadedRecords: AdmissionRecord[] = data.records || [];

        // Seed initial demo data if database table is empty for this category
        if (loadedRecords.length === 0) {
          const demoSeed = activeCategory === 'STUDENT' ? [
            {
              type: 'STUDENT',
              firstName: 'Vivaan',
              middleName: 'Kumar',
              lastName: 'Mehta',
              dob: '2009-04-12',
              bloodGroup: 'B+',
              phone: '+91 98765 11111',
              email: 'vivaan.m@demo.edu',
              currentAddress: '42 Park Avenue, Green Park, New Delhi',
              permanentAddress: '42 Park Avenue, Green Park, New Delhi',
              parentFirstName: 'Suresh',
              parentMiddleName: 'Chand',
              parentLastName: 'Mehta',
              parentDob: '1978-08-15',
              parentBloodGroup: 'O+',
              parentPhone: '+91 98765 22222',
              parentEmail: 'suresh.mehta@demo.com',
              grade: 'Year 1',
              section: 'Sec A',
              isHosteler: true,
              hostelName: 'Boys Hostel',
              roomNumber: '101',
              status: 'ENROLLED',
              documents: [
                { name: 'Birth Certificate', isChecked: true, fileName: 'Birth_Certificate_Vivaan.pdf' },
                { name: 'Transfer Certificate (TC)', isChecked: true, fileName: 'TC_DPS_School.pdf' },
                { name: 'Previous Marksheet / Report Card', isChecked: true, fileName: 'Grade_8_Marksheet.pdf' },
                { name: 'Aadhaar Card / National ID', isChecked: true, fileName: 'Aadhaar_Vivaan.pdf' },
                { name: 'Passport Size Photo', isChecked: true, fileName: 'Photo_Vivaan.jpg' },
                { name: 'Medical Fitness Certificate', isChecked: false, fileName: '' },
              ],
            },
            {
              type: 'STUDENT',
              firstName: 'Kavya',
              middleName: '',
              lastName: 'Nair',
              dob: '2010-09-28',
              bloodGroup: 'A+',
              phone: '+91 98111 33333',
              email: 'kavya.nair@demo.edu',
              currentAddress: '15 Civil Lines, Jaipur, Rajasthan',
              permanentAddress: '15 Civil Lines, Jaipur, Rajasthan',
              parentFirstName: 'Raman',
              parentMiddleName: 'K',
              parentLastName: 'Nair',
              parentDob: '1981-02-10',
              parentBloodGroup: 'A+',
              parentPhone: '+91 98111 44444',
              parentEmail: 'raman.nair@demo.com',
              grade: 'Year 2',
              section: 'Sec B',
              isHosteler: false,
              hostelName: null,
              roomNumber: null,
              status: 'ENROLLED',
              documents: [
                { name: 'Birth Certificate', isChecked: true, fileName: 'Birth_Cert_Kavya.pdf' },
                { name: 'Transfer Certificate (TC)', isChecked: true, fileName: 'TC_Jaipur_Public.pdf' },
                { name: 'Previous Marksheet / Report Card', isChecked: true, fileName: 'Marksheet_Kavya.pdf' },
                { name: 'Aadhaar Card / National ID', isChecked: true, fileName: 'Aadhaar_Kavya.pdf' },
                { name: 'Passport Size Photo', isChecked: true, fileName: 'Passport_Photo.jpg' },
                { name: 'Medical Fitness Certificate', isChecked: true, fileName: 'Fitness_Clearance.pdf' },
              ],
            }
          ] : [
            {
              type: 'STAFF',
              firstName: 'Dr. Ramesh',
              middleName: 'K',
              lastName: 'Choudhary',
              dob: '1984-06-15',
              bloodGroup: 'O+',
              phone: '+91 94444 88888',
              email: 'ramesh.c@school.edu',
              currentAddress: '88 Faculty Enclave, University Road, Delhi',
              permanentAddress: '88 Faculty Enclave, University Road, Delhi',
              parentFirstName: 'Emergency Contact:',
              parentMiddleName: 'Mrs.',
              parentLastName: 'Sunita Choudhary',
              parentDob: '1986-01-20',
              parentBloodGroup: 'B+',
              parentPhone: '+91 94444 99999',
              parentEmail: 'sunita.c@gmail.com',
              grade: 'Senior Professor',
              section: 'Mathematics Dept',
              isHosteler: false,
              hostelName: null,
              roomNumber: null,
              status: 'ENROLLED',
              documents: [
                { name: 'Government Photo ID / Aadhaar', isChecked: true, fileName: 'Aadhaar_DrRamesh.pdf' },
                { name: 'Educational Qualification Certificates / Degree', isChecked: true, fileName: 'PhD_Degree_Certificate.pdf' },
                { name: 'Experience Certificate / Relieving Letter', isChecked: true, fileName: 'Experience_Letter_IIT.pdf' },
                { name: 'Resume / CV', isChecked: true, fileName: 'CV_Dr_Ramesh_2026.pdf' },
                { name: 'Passport Size Photograph', isChecked: true, fileName: 'Photo_Ramesh.jpg' },
                { name: 'Medical / Background Clearance Certificate', isChecked: true, fileName: 'Clearance_Report.pdf' },
              ],
            }
          ];

          for (const item of demoSeed) {
            await fetch('/api/admission', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'x-tenant-id': session.tenantId,
              },
              body: JSON.stringify(item),
            });
          }

          const reloadRes = await fetch(`/api/admission?type=${activeCategory}`, {
            headers: { 'x-tenant-id': session.tenantId },
          });
          const reloadData = await reloadRes.json();
          loadedRecords = reloadData.records || [];
        }

        setRecords(loadedRecords);
      }
    } catch (err) {
      console.error('Failed to load admission records:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (session) {
      fetchRecords();
    }
  }, [session, activeCategory]);

  // Launch Form Modal for Student or Staff
  const handleLaunchForm = (targetType: 'STUDENT' | 'STAFF') => {
    setActiveCategory(targetType);
    setModalType(targetType);
    const docList = targetType === 'STUDENT' ? STUDENT_DOCUMENTS_LIST : STAFF_DOCUMENTS_LIST;

    setFormData({
      type: targetType,
      firstName: '',
      middleName: '',
      lastName: '',
      dob: '',
      gender: 'Male',
      bloodGroup: 'O+',
      phone: '',
      email: '',
      currentAddress: '',
      permanentAddress: '',
      sameAddress: false,
      parentFirstName: '',
      parentMiddleName: '',
      parentLastName: '',
      parentDob: '',
      parentBloodGroup: 'O+',
      parentPhone: '',
      parentEmail: '',
      grade: targetType === 'STUDENT' ? 'Year 1' : 'Senior Teacher',
      section: targetType === 'STUDENT' ? 'Sec A' : 'Academic Dept',
      isHosteler: false,
      hostelName: 'Boys Hostel',
      roomNumber: '101',
      experience: '',
      documents: docList.map(docName => ({
        name: docName,
        isChecked: false,
        fileName: '',
        fileUrl: '',
      })),
    });
    setCurrentStep(1);
    setIsEnrollModalOpen(true);
  };

  const handleSameAddressToggle = (checked: boolean) => {
    setFormData(prev => ({
      ...prev,
      sameAddress: checked,
      permanentAddress: checked ? prev.currentAddress : prev.permanentAddress,
    }));
  };

  const handleDocumentCheckChange = (index: number, checked: boolean) => {
    setFormData(prev => {
      const updatedDocs = [...prev.documents];
      updatedDocs[index] = {
        ...updatedDocs[index],
        isChecked: checked,
      };
      return { ...prev, documents: updatedDocs };
    });
  };

  const handleDocumentFileChange = (index: number, fileName: string) => {
    setFormData(prev => {
      const updatedDocs = [...prev.documents];
      updatedDocs[index] = {
        ...updatedDocs[index],
        fileName,
        isChecked: Boolean(fileName) || updatedDocs[index].isChecked,
      };
      return { ...prev, documents: updatedDocs };
    });
  };

  const handleFileUpload = (index: number, file: File | undefined) => {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (e) => {
      const dataUrl = e.target?.result as string;
      setFormData(prev => {
        const updatedDocs = [...prev.documents];
        updatedDocs[index] = {
          ...updatedDocs[index],
          fileName: file.name,
          fileUrl: dataUrl,
          isChecked: true,
        };
        return { ...prev, documents: updatedDocs };
      });
    };
    reader.readAsDataURL(file);
  };

  const handleRemoveFile = (index: number) => {
    setFormData(prev => {
      const updatedDocs = [...prev.documents];
      updatedDocs[index] = {
        ...updatedDocs[index],
        fileName: '',
        fileUrl: '',
        isChecked: false,
      };
      return { ...prev, documents: updatedDocs };
    });
  };

  const handleEnrollSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!session) return;

    try {
      const res = await fetch('/api/admission', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-tenant-id': session.tenantId,
        },
        body: JSON.stringify(formData),
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || 'Enrollment failed');
      }

      setNotification({
        type: 'success',
        text: `${formData.type === 'STUDENT' ? 'Student' : 'Staff'} ${formData.firstName} ${formData.lastName} enrolled successfully!`,
      });

      setIsEnrollModalOpen(false);
      fetchRecords();
    } catch (error: any) {
      setNotification({ type: 'error', text: error.message || 'Error during enrollment' });
    }
  };

  const handleDeleteRecord = async (id: string) => {
    if (!session || !confirm('Are you sure you want to remove this record?')) return;

    try {
      const res = await fetch(`/api/admission?id=${id}`, {
        method: 'DELETE',
        headers: { 'x-tenant-id': session.tenantId },
      });

      if (!res.ok) throw new Error('Failed to delete record');

      setNotification({ type: 'success', text: 'Admission record deleted.' });
      fetchRecords();
    } catch (error: any) {
      setNotification({ type: 'error', text: error.message || 'Error deleting record' });
    }
  };

  const parseDocs = (jsonStr: string): RequiredDoc[] => {
    try {
      return JSON.parse(jsonStr || '[]');
    } catch (e) {
      return [];
    }
  };

  const filteredRecords = records.filter(r => {
    if (filterStatus && r.status !== filterStatus) return false;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      const fullName = `${r.firstName} ${r.middleName || ''} ${r.lastName}`.toLowerCase();
      const parentName = `${r.parentFirstName} ${r.parentLastName}`.toLowerCase();
      return (
        fullName.includes(q) ||
        parentName.includes(q) ||
        r.phone.toLowerCase().includes(q) ||
        r.email.toLowerCase().includes(q)
      );
    }
    return true;
  });

  const handleExportCSV = () => {
    const headers = [
      'Type',
      'Name',
      'DOB',
      'Blood Group',
      'Phone',
      'Email',
      'Current Address',
      'Permanent Address',
      'Parent / Emergency Contact',
      'Parent Phone',
      'Grade / Role & Section / Dept',
      'Hostel',
      'Docs Submitted',
      'Status',
    ];

    const rows = filteredRecords.map(r => {
      const docs = parseDocs(r.documentsJson);
      const docsSubmitted = `${docs.filter(d => d.isChecked).length}/${docs.length}`;
      return [
        `"${r.type}"`,
        `"${r.firstName} ${r.middleName || ''} ${r.lastName}"`,
        `"${r.dob}"`,
        `"${r.bloodGroup}"`,
        `"${r.phone}"`,
        `"${r.email}"`,
        `"${(r.currentAddress || '').replace(/"/g, '""')}"`,
        `"${(r.permanentAddress || '').replace(/"/g, '""')}"`,
        `"${r.parentFirstName} ${r.parentLastName}"`,
        `"${r.parentPhone}"`,
        `"${r.grade} - ${r.section}"`,
        `"${r.isHosteler ? `${r.hostelName} (${r.roomNumber})` : 'N/A'}"`,
        `"${docsSubmitted}"`,
        `"${r.status}"`,
      ];
    });

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `${activeCategory.toLowerCase()}_admissions_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  if (!session) return null;

  return (
    <div className="max-w-6xl mx-auto space-y-8 font-sans px-4 sm:px-6 md:px-8 pb-12">
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

      {/* Hero Header */}
      <div className="relative overflow-hidden bg-gradient-to-r from-blue-600/10 via-indigo-600/10 to-purple-600/10 rounded-3xl p-8 border border-blue-200/60 flex flex-col md:flex-row items-center justify-between shadow-xs">
        <div className="space-y-2 max-w-xl z-10">
          <span className="text-xs font-bold uppercase tracking-wider text-blue-700 bg-blue-100 px-3 py-1 rounded-full inline-block">
            Enrollment & Onboarding Portal
          </span>
          <h1 className="text-3xl sm:text-4xl font-black text-slate-900 tracking-tight">
            Admission Section
          </h1>
          <p className="text-slate-600 text-sm sm:text-base font-medium">
            Select an admission option below to open the student enrollment or staff onboarding form.
          </p>
        </div>

        <div className="mt-6 md:mt-0 relative w-64 h-28 flex items-center justify-center">
          <div className="bg-white/90 backdrop-blur-xs rounded-2xl p-4 shadow-sm border border-blue-100 flex items-center gap-4 w-full">
            <div className="w-12 h-12 bg-blue-600 rounded-xl flex items-center justify-center text-white shadow-sm">
              <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
              </svg>
            </div>
            <div className="flex flex-col">
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Admission Hub</span>
              <span className="text-sm font-extrabold text-blue-600">Form Assistant Ready</span>
            </div>
          </div>
        </div>
      </div>

      {/* THE 2 MAIN ADMISSION CARDS / BUTTONS matching exact screenshot style */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* BUTTON / CARD 1: Student Admission */}
        <div
          onClick={() => handleLaunchForm('STUDENT')}
          className="bg-white p-8 rounded-[28px] border border-blue-100 shadow-xs hover:shadow-xl hover:border-blue-300 transition-all duration-300 flex flex-col justify-between cursor-pointer group"
        >
          <div>
            <div className="w-14 h-14 bg-blue-50 rounded-2xl flex items-center justify-center text-blue-600 mb-6 group-hover:scale-105 transition-transform">
              <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 14l9-5-9-5-9 5 9 5z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 14l6.16-3.422a12.083 12.083 0 01.665 6.479A11.952 11.952 0 0112 20.055a11.952 11.952 0 01-6.824-2.998 12.078 12.078 0 01.665-6.479L12 14z" />
              </svg>
            </div>
            <h3 className="text-2xl font-extrabold text-slate-900 mb-2">Student Admission</h3>
            <p className="text-slate-500 text-sm leading-relaxed mb-6 font-medium">
              Click to open the Student Admission Form. Fill personal details, parent info, and verify document checkboxes.
            </p>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-xs font-black uppercase tracking-wider text-blue-600 bg-blue-50 px-3 py-1.5 rounded-xl border border-blue-100">
              Open Student Form →
            </span>
            <div className="w-10 h-10 rounded-full bg-blue-50 group-hover:bg-blue-600 text-blue-600 group-hover:text-white flex items-center justify-center transition-all shadow-xs">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M14 5l7 7m0 0l-7 7m7-7H3" />
              </svg>
            </div>
          </div>
        </div>

        {/* BUTTON / CARD 2: Staff Admission */}
        <div
          onClick={() => handleLaunchForm('STAFF')}
          className="bg-white p-8 rounded-[28px] border border-indigo-100 shadow-xs hover:shadow-xl hover:border-indigo-300 transition-all duration-300 flex flex-col justify-between cursor-pointer group"
        >
          <div>
            <div className="w-14 h-14 bg-indigo-50 rounded-2xl flex items-center justify-center text-indigo-600 mb-6 group-hover:scale-105 transition-transform">
              <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
              </svg>
            </div>
            <h3 className="text-2xl font-extrabold text-slate-900 mb-2">Staff Admission</h3>
            <p className="text-slate-500 text-sm leading-relaxed mb-6 font-medium">
              Click to open the Staff Admission Form. Fill staff details, designation, emergency contacts, and credential checks.
            </p>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-xs font-black uppercase tracking-wider text-indigo-600 bg-indigo-50 px-3 py-1.5 rounded-xl border border-indigo-100">
              Open Staff Form →
            </span>
            <div className="w-10 h-10 rounded-full bg-indigo-50 group-hover:bg-indigo-600 text-indigo-600 group-hover:text-white flex items-center justify-center transition-all shadow-xs">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M14 5l7 7m0 0l-7 7m7-7H3" />
              </svg>
            </div>
          </div>
        </div>
      </div>

      {/* Roster View Sub-Header Tabs */}
      <div className="pt-4 border-t border-slate-200">
        <div className="flex flex-wrap items-center justify-between gap-4 mb-4">
          <div className="flex bg-slate-100 p-1.5 rounded-2xl w-fit gap-1 border border-slate-200 shadow-inner">
            <button
              onClick={() => {
                setActiveCategory('STUDENT');
                setSearchQuery('');
                setFilterStatus('');
              }}
              className={`px-6 py-2.5 rounded-xl font-black text-sm transition-all flex items-center gap-2 cursor-pointer ${activeCategory === 'STUDENT'
                ? 'bg-white text-blue-600 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
                }`}
            >
              🎓 Student Admissions List
            </button>

            <button
              onClick={() => {
                setActiveCategory('STAFF');
                setSearchQuery('');
                setFilterStatus('');
              }}
              className={`px-6 py-2.5 rounded-xl font-black text-sm transition-all flex items-center gap-2 cursor-pointer ${activeCategory === 'STAFF'
                ? 'bg-white text-indigo-600 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
                }`}
            >
              👨‍🏫 Staff Admissions List
            </button>
          </div>

          <button
            onClick={handleExportCSV}
            className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-sm rounded-xl border border-slate-200 transition-all flex items-center gap-2 cursor-pointer"
          >
            <svg className="w-4 h-4 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
            Export CSV
          </button>
        </div>

        {/* Search & Filter Bar */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs flex flex-wrap items-center justify-between gap-4 mb-4">
          <div className="flex flex-wrap items-center gap-3 flex-1">
            <div className="relative flex-1 min-w-[240px]">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                <svg className="w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
              </div>
              <input
                type="text"
                placeholder={`Search ${activeCategory === 'STUDENT' ? 'students' : 'staffs'} by name, phone, email...`}
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 text-slate-800 text-sm rounded-xl focus:ring-blue-500 focus:border-blue-500 font-semibold placeholder-slate-400"
              />
            </div>

            <select
              value={filterStatus}
              onChange={e => setFilterStatus(e.target.value)}
              className="bg-slate-50 border border-slate-200 text-slate-800 text-sm rounded-xl focus:ring-blue-500 focus:border-blue-500 px-4 py-2.5 font-semibold min-w-[150px]"
            >
              <option value="">All Statuses</option>
              <option value="ENROLLED">Enrolled</option>
              <option value="PENDING_VERIFICATION">Pending Verification</option>
            </select>
          </div>

          <div className="text-xs font-bold text-slate-500">
            Showing <span className="text-slate-900 font-extrabold">{filteredRecords.length}</span> records
          </div>
        </div>

        {/* Admissions Roster Table */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-hidden">
          <div className="p-6 border-b border-slate-100 flex items-center justify-between">
            <div>
              <h2 className="text-lg font-extrabold text-slate-900">
                {activeCategory === 'STUDENT' ? 'Enrolled Student Records' : 'Onboarded Staff Records'}
              </h2>
              <p className="text-slate-500 text-xs mt-0.5 font-medium">
                Complete {activeCategory === 'STUDENT' ? 'student' : 'staff'} dossiers with personal details, addresses, and document verification.
              </p>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 text-slate-500 text-[11px] uppercase tracking-wider font-extrabold border-b border-slate-200/80">
                  <th className="px-6 py-3.5">NAME</th>
                  <th className="px-6 py-3.5">{activeCategory === 'STUDENT' ? 'GRADE & SECTION' : 'ROLE & DEPT'}</th>
                  <th className="px-6 py-3.5">GENDER, BLOOD & DOB</th>
                  <th className="px-6 py-3.5">{activeCategory === 'STUDENT' ? 'PARENT DETAILS' : 'EMERGENCY CONTACT'}</th>
                  <th className="px-6 py-3.5">DOCUMENTS</th>
                  <th className="px-6 py-3.5">STATUS</th>
                  <th className="px-6 py-3.5 text-right">ACTIONS</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-sm">
                {loading ? (
                  <tr>
                    <td colSpan={7} className="px-6 py-12 text-center text-slate-400 font-medium">
                      <div className="flex flex-col items-center justify-center gap-2">
                        <div className="animate-spin rounded-full h-7 w-7 border-b-2 border-blue-600"></div>
                        <span>Loading records...</span>
                      </div>
                    </td>
                  </tr>
                ) : filteredRecords.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-6 py-12 text-center text-slate-400 font-medium">
                      No records match your search query.
                    </td>
                  </tr>
                ) : (
                  filteredRecords.map(rec => {
                    const fullName = `${rec.firstName} ${rec.middleName ? rec.middleName + ' ' : ''}${rec.lastName}`;
                    const parentFullName = `${rec.parentFirstName} ${rec.parentLastName}`;
                    const docs = parseDocs(rec.documentsJson);
                    const checkedCount = docs.filter(d => d.isChecked).length;
                    const initial = rec.firstName ? rec.firstName[0].toUpperCase() : 'A';

                    return (
                      <tr key={rec.id} className="hover:bg-slate-50/80 transition-colors">
                        <td className="px-6 py-4 font-bold text-slate-900">
                          <div className="flex items-center gap-3">
                            <div className="w-9 h-9 rounded-full bg-blue-50 text-blue-700 flex items-center justify-center font-extrabold text-xs border border-blue-100">
                              {initial}
                            </div>
                            <div>
                              <span className="block text-sm">{fullName}</span>
                              <span className="text-xs font-mono font-semibold text-slate-400">{rec.phone}</span>
                            </div>
                          </div>
                        </td>

                        <td className="px-6 py-4 font-semibold text-slate-800">
                          <div>
                            <span>{formatClass(rec.grade, rec.section)}</span>
                            {rec.isHosteler && (
                              <span className="block text-[11px] font-bold text-indigo-600">
                                {rec.hostelName} ({rec.roomNumber || 'Room'})
                              </span>
                            )}
                          </div>
                        </td>

                        <td className="px-6 py-4">
                          <div className="flex flex-wrap items-center gap-1.5">
                            <span className="px-2.5 py-0.5 bg-blue-50 border border-blue-200 text-blue-700 rounded-full font-black text-xs">
                              {rec.gender || 'Male'}
                            </span>
                            <span className="px-2.5 py-0.5 bg-rose-50 border border-rose-200 text-rose-600 rounded-full font-black text-xs">
                              {rec.bloodGroup}
                            </span>
                            <span className="text-xs text-slate-500 font-medium block">{rec.dob || '-'}</span>
                          </div>
                        </td>

                        <td className="px-6 py-4">
                          <div>
                            <span className="block font-bold text-slate-800 text-xs">{parentFullName}</span>
                            <span className="text-[11px] text-slate-500 font-mono font-medium">{rec.parentPhone}</span>
                          </div>
                        </td>

                        <td className="px-6 py-4">
                          <button
                            onClick={() => setViewRecord(rec)}
                            className="px-3 py-1 rounded-lg text-xs font-extrabold bg-indigo-50 text-indigo-700 border border-indigo-100 hover:bg-indigo-100 transition-all flex items-center gap-1.5 cursor-pointer"
                          >
                            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                            <span>{checkedCount}/{docs.length} Verified</span>
                          </button>
                        </td>

                        <td className="px-6 py-4">
                          <span className="px-3 py-1 bg-emerald-50 border border-emerald-200 text-emerald-700 rounded-full font-extrabold text-xs">
                            {rec.status}
                          </span>
                        </td>

                        <td className="px-6 py-4 text-right">
                          <div className="flex items-center justify-end gap-2">
                            <button
                              onClick={() => setViewRecord(rec)}
                              className="p-2 text-slate-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors cursor-pointer"
                              title="View Full Dossier"
                            >
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
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
      </div>

      {/* Enroll Student / Onboard Staff Form Modal */}
      {isEnrollModalOpen && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4 z-50 overflow-y-auto">
          <div className="bg-white rounded-3xl p-6 sm:p-8 max-w-3xl w-full shadow-2xl border border-slate-200 space-y-6 my-8 max-h-[90vh] overflow-y-auto">
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <div>
                <h3 className="text-xl font-black text-slate-900">
                  {modalType === 'STUDENT' ? 'Student Admission Form' : 'Staff Admission Form'}
                </h3>
                <p className="text-slate-500 text-xs font-semibold mt-0.5">
                  Step {currentStep} of 3: {currentStep === 1 ? 'Personal Details' : currentStep === 2 ? (modalType === 'STUDENT' ? 'Parents Details' : 'Emergency Contact Details') : 'Required Documents & Uploads'}
                </p>
              </div>
              <button
                onClick={() => setIsEnrollModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 font-bold text-lg p-1"
              >
                ✕
              </button>
            </div>

            {/* Step Stepper Tabs */}
            <div className="flex border-b border-slate-100 text-sm font-extrabold gap-6">
              <button
                onClick={() => setCurrentStep(1)}
                className={`pb-2 border-b-2 transition-colors cursor-pointer ${currentStep === 1 ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-400'
                  }`}
              >
                1. Personal Details
              </button>
              <button
                onClick={() => setCurrentStep(2)}
                className={`pb-2 border-b-2 transition-colors cursor-pointer ${currentStep === 2 ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-400'
                  }`}
              >
                2. {modalType === 'STUDENT' ? 'Parents Details' : 'Emergency Contact'}
              </button>
              <button
                onClick={() => setCurrentStep(3)}
                className={`pb-2 border-b-2 transition-colors cursor-pointer ${currentStep === 3 ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-400'
                  }`}
              >
                3. Documents & Uploads
              </button>
            </div>

            <form onSubmit={handleEnrollSubmit} className="space-y-6">
              {/* STEP 1: Personal Details */}
              {currentStep === 1 && (
                <div className="space-y-4">
                  <h4 className="text-xs font-black uppercase tracking-wider text-blue-600">
                    {modalType === 'STUDENT' ? 'Student Personal Details' : 'Staff Personal Details'}
                  </h4>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div>
                      <label className="text-xs font-extrabold uppercase tracking-wider text-slate-600 block mb-1">First Name *</label>
                      <input
                        type="text"
                        required
                        placeholder="First Name"
                        value={formData.firstName}
                        onChange={e => setFormData({ ...formData, firstName: e.target.value })}
                        className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl font-semibold text-slate-800 text-sm focus:ring-blue-500 focus:border-blue-500"
                      />
                    </div>

                    <div>
                      <label className="text-xs font-extrabold uppercase tracking-wider text-slate-600 block mb-1">Middle Name</label>
                      <input
                        type="text"
                        placeholder="Middle Name"
                        value={formData.middleName}
                        onChange={e => setFormData({ ...formData, middleName: e.target.value })}
                        className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl font-semibold text-slate-800 text-sm focus:ring-blue-500 focus:border-blue-500"
                      />
                    </div>

                    <div>
                      <label className="text-xs font-extrabold uppercase tracking-wider text-slate-600 block mb-1">Last Name *</label>
                      <input
                        type="text"
                        required
                        placeholder="Last Name"
                        value={formData.lastName}
                        onChange={e => setFormData({ ...formData, lastName: e.target.value })}
                        className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl font-semibold text-slate-800 text-sm focus:ring-blue-500 focus:border-blue-500"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div>
                      <label className="text-xs font-extrabold uppercase tracking-wider text-slate-600 block mb-1">Date of Birth *</label>
                      <input
                        type="date"
                        required
                        value={formData.dob}
                        onChange={e => setFormData({ ...formData, dob: e.target.value })}
                        className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl font-semibold text-slate-800 text-sm focus:ring-blue-500 focus:border-blue-500"
                      />
                    </div>

                    <div>
                      <label className="text-xs font-extrabold uppercase tracking-wider text-slate-600 block mb-1">Gender *</label>
                      <select
                        value={formData.gender}
                        onChange={e => setFormData({ ...formData, gender: e.target.value })}
                        className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-800 text-sm focus:ring-blue-500 focus:border-blue-500"
                      >
                        {GENDERS.map(g => (
                          <option key={g} value={g}>{g}</option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="text-xs font-extrabold uppercase tracking-wider text-slate-600 block mb-1">Blood Group *</label>
                      <select
                        value={formData.bloodGroup}
                        onChange={e => setFormData({ ...formData, bloodGroup: e.target.value })}
                        className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-800 text-sm focus:ring-blue-500 focus:border-blue-500"
                      >
                        {BLOOD_GROUPS.map(bg => (
                          <option key={bg} value={bg}>{bg}</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="text-xs font-extrabold uppercase tracking-wider text-slate-600 block mb-1">Phone Number *</label>
                      <input
                        type="text"
                        required
                        placeholder="+91 98765 43210"
                        value={formData.phone}
                        onChange={e => setFormData({ ...formData, phone: e.target.value })}
                        className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl font-semibold text-slate-800 text-sm focus:ring-blue-500 focus:border-blue-500"
                      />
                    </div>

                    <div>
                      <label className="text-xs font-extrabold uppercase tracking-wider text-slate-600 block mb-1">Email Address (Mail)</label>
                      <input
                        type="email"
                        placeholder="name@school.edu"
                        value={formData.email}
                        onChange={e => setFormData({ ...formData, email: e.target.value })}
                        className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl font-semibold text-slate-800 text-sm focus:ring-blue-500 focus:border-blue-500"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="text-xs font-extrabold uppercase tracking-wider text-slate-600 block mb-1">Current Address *</label>
                      <textarea
                        rows={2}
                        required
                        placeholder="Current residential address"
                        value={formData.currentAddress}
                        onChange={e => {
                          const val = e.target.value;
                          setFormData(prev => ({
                            ...prev,
                            currentAddress: val,
                            permanentAddress: prev.sameAddress ? val : prev.permanentAddress,
                          }));
                        }}
                        className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl font-semibold text-slate-800 text-sm focus:ring-blue-500 focus:border-blue-500"
                      />
                    </div>

                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <label className="text-xs font-extrabold uppercase tracking-wider text-slate-600">Permanent Address *</label>
                        <label className="flex items-center gap-1.5 cursor-pointer text-xs font-bold text-blue-600">
                          <input
                            type="checkbox"
                            checked={formData.sameAddress}
                            onChange={e => handleSameAddressToggle(e.target.checked)}
                            className="rounded text-blue-600 focus:ring-blue-500"
                          />
                          Same as Current
                        </label>
                      </div>
                      <textarea
                        rows={2}
                        required
                        disabled={formData.sameAddress}
                        placeholder="Permanent home address"
                        value={formData.permanentAddress}
                        onChange={e => setFormData({ ...formData, permanentAddress: e.target.value })}
                        className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl font-semibold text-slate-800 text-sm focus:ring-blue-500 focus:border-blue-500 disabled:opacity-70"
                      />
                    </div>
                  </div>

                  {modalType === 'STUDENT' ? (
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2 border-t border-slate-100">
                      <div>
                        <label className="text-xs font-extrabold uppercase tracking-wider text-slate-600 block mb-1">Assign Grade *</label>
                        <select
                          value={formData.grade}
                          onChange={e => setFormData({ ...formData, grade: e.target.value })}
                          className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-800 text-sm"
                        >
                          <option value="Year 1">Year 1</option>
                          <option value="Year 2">Year 2</option>
                          <option value="Year 3">Year 3</option>
                          <option value="Year 4">Year 4</option>
                        </select>
                      </div>
                      <div>
                        <label className="text-xs font-extrabold uppercase tracking-wider text-slate-600 block mb-1">Assign Section *</label>
                        <select
                          value={formData.section}
                          onChange={e => setFormData({ ...formData, section: e.target.value })}
                          className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-800 text-sm"
                        >
                          <option value="Sec A">Sec A</option>
                          <option value="Sec B">Sec B</option>
                          <option value="Sec C">Sec C</option>
                        </select>
                      </div>
                      <div>
                        <label className="text-xs font-extrabold uppercase tracking-wider text-slate-600 block mb-1">Hostel Choice</label>
                        <label className="flex items-center gap-2.5 px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl cursor-pointer select-none hover:bg-slate-100/80 transition-colors">
                          <input
                            type="checkbox"
                            checked={formData.isHosteler}
                            onChange={e => setFormData({ ...formData, isHosteler: e.target.checked })}
                            className="w-5 h-5 rounded text-blue-600 focus:ring-blue-500 cursor-pointer"
                          />
                          <span className="text-sm font-extrabold text-slate-800">Require Hostel Accommodation</span>
                        </label>
                      </div>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2 border-t border-slate-100">
                      <div>
                        <label className="text-xs font-extrabold uppercase tracking-wider text-slate-600 block mb-1">Role / Designation *</label>
                        <select
                          value={formData.grade}
                          onChange={e => setFormData({ ...formData, grade: e.target.value })}
                          className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-800 text-sm"
                        >
                          <option value="Senior Professor">Senior Professor</option>
                          <option value="Assistant Teacher">Assistant Teacher</option>
                          <option value="Hostel Warden">Hostel Warden</option>
                          <option value="Administrative Staff">Administrative Staff</option>
                          <option value="Lab Assistant">Lab Assistant</option>
                        </select>
                      </div>
                      <div>
                        <label className="text-xs font-extrabold uppercase tracking-wider text-slate-600 block mb-1">Department *</label>
                        <select
                          value={formData.section}
                          onChange={e => setFormData({ ...formData, section: e.target.value })}
                          className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-800 text-sm"
                        >
                          <option value="Mathematics Dept">Mathematics Dept</option>
                          <option value="Science Dept">Science Dept</option>
                          <option value="Computer Science">Computer Science</option>
                          <option value="Hostel Management">Hostel Management</option>
                          <option value="General Admin">General Admin</option>
                        </select>
                      </div>
                      <div>
                        <label className="text-xs font-extrabold uppercase tracking-wider text-slate-600 block mb-1">Experience (Optional)</label>
                        <input
                          type="text"
                          placeholder="e.g. 3 Years, 5+ Years, Fresher"
                          value={formData.experience}
                          onChange={e => setFormData({ ...formData, experience: e.target.value })}
                          className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl font-semibold text-slate-800 text-sm focus:ring-blue-500 focus:border-blue-500"
                        />
                      </div>
                    </div>
                  )}

                  <div className="flex justify-end pt-4">
                    <button
                      type="button"
                      onClick={() => setCurrentStep(2)}
                      className="px-6 py-2.5 bg-blue-600 text-white font-extrabold text-sm rounded-xl hover:bg-blue-700 transition-all flex items-center gap-2 cursor-pointer"
                    >
                      <span>Next: {modalType === 'STUDENT' ? 'Parents Details' : 'Emergency Contact'}</span>
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M9 5l7 7-7 7" /></svg>
                    </button>
                  </div>
                </div>
              )}

              {/* STEP 2: Parents / Emergency Contact Details */}
              {currentStep === 2 && (
                <div className="space-y-4">
                  <h4 className="text-xs font-black uppercase tracking-wider text-indigo-600">
                    {modalType === 'STUDENT' ? 'Parent / Guardian Information' : 'Staff Emergency Contact Information'}
                  </h4>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div>
                      <label className="text-xs font-extrabold uppercase tracking-wider text-slate-600 block mb-1">First Name *</label>
                      <input
                        type="text"
                        required
                        placeholder="First Name"
                        value={formData.parentFirstName}
                        onChange={e => setFormData({ ...formData, parentFirstName: e.target.value })}
                        className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl font-semibold text-slate-800 text-sm"
                      />
                    </div>

                    <div>
                      <label className="text-xs font-extrabold uppercase tracking-wider text-slate-600 block mb-1">Middle Name</label>
                      <input
                        type="text"
                        placeholder="Middle Name"
                        value={formData.parentMiddleName}
                        onChange={e => setFormData({ ...formData, parentMiddleName: e.target.value })}
                        className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl font-semibold text-slate-800 text-sm"
                      />
                    </div>

                    <div>
                      <label className="text-xs font-extrabold uppercase tracking-wider text-slate-600 block mb-1">Last Name *</label>
                      <input
                        type="text"
                        required
                        placeholder="Last Name"
                        value={formData.parentLastName}
                        onChange={e => setFormData({ ...formData, parentLastName: e.target.value })}
                        className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl font-semibold text-slate-800 text-sm"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="text-xs font-extrabold uppercase tracking-wider text-slate-600 block mb-1">DOB</label>
                      <input
                        type="date"
                        value={formData.parentDob}
                        onChange={e => setFormData({ ...formData, parentDob: e.target.value })}
                        className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl font-semibold text-slate-800 text-sm"
                      />
                    </div>

                    <div>
                      <label className="text-xs font-extrabold uppercase tracking-wider text-slate-600 block mb-1">Blood Group</label>
                      <select
                        value={formData.parentBloodGroup}
                        onChange={e => setFormData({ ...formData, parentBloodGroup: e.target.value })}
                        className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-800 text-sm"
                      >
                        {BLOOD_GROUPS.map(bg => (
                          <option key={bg} value={bg}>{bg}</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="text-xs font-extrabold uppercase tracking-wider text-slate-600 block mb-1">Phone Number *</label>
                      <input
                        type="text"
                        required
                        placeholder="+91 98765 22222"
                        value={formData.parentPhone}
                        onChange={e => setFormData({ ...formData, parentPhone: e.target.value })}
                        className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl font-semibold text-slate-800 text-sm"
                      />
                    </div>

                    <div>
                      <label className="text-xs font-extrabold uppercase tracking-wider text-slate-600 block mb-1">Email Address (Mail)</label>
                      <input
                        type="email"
                        placeholder="email@address.com"
                        value={formData.parentEmail}
                        onChange={e => setFormData({ ...formData, parentEmail: e.target.value })}
                        className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl font-semibold text-slate-800 text-sm"
                      />
                    </div>
                  </div>

                  <div className="flex justify-between pt-4">
                    <button
                      type="button"
                      onClick={() => setCurrentStep(1)}
                      className="px-4 py-2.5 font-bold text-slate-600 hover:bg-slate-100 rounded-xl text-sm"
                    >
                      Back: Personal Details
                    </button>
                    <button
                      type="button"
                      onClick={() => setCurrentStep(3)}
                      className="px-6 py-2.5 bg-indigo-600 text-white font-extrabold text-sm rounded-xl hover:bg-indigo-700 transition-all flex items-center gap-2 cursor-pointer"
                    >
                      <span>Next: Documents & Verification</span>
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M9 5l7 7-7 7" /></svg>
                    </button>
                  </div>
                </div>
              )}

              {/* STEP 3: Documents Checkbox & Upload */}
              {currentStep === 3 && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs font-black uppercase tracking-wider text-emerald-600">
                      Required {modalType === 'STUDENT' ? 'Student' : 'Staff'} Documents Checklist
                    </h4>
                    <span className="text-xs font-bold text-slate-500">
                      Check box if verified & upload file
                    </span>
                  </div>

                  <div className="space-y-3">
                    {formData.documents.map((doc, idx) => (
                      <div key={doc.name} className="p-4 bg-slate-50 rounded-2xl border border-slate-200 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 hover:border-slate-300 transition-all">
                        <label className="flex items-center gap-3 cursor-pointer select-none">
                          <input
                            type="checkbox"
                            checked={doc.isChecked}
                            onChange={e => handleDocumentCheckChange(idx, e.target.checked)}
                            className="w-5 h-5 rounded text-emerald-600 focus:ring-emerald-500 cursor-pointer"
                          />
                          <div>
                            <span className="font-extrabold text-slate-800 text-sm block">{doc.name}</span>
                            {doc.fileName ? (
                              <span className="text-[11px] font-semibold text-emerald-600 flex items-center gap-1 mt-0.5">
                                ✓ Uploaded: <span className="font-mono text-slate-700">{doc.fileName}</span>
                              </span>
                            ) : (
                              <span className="text-[11px] text-slate-400 font-medium">Click button to choose & upload file</span>
                            )}
                          </div>
                        </label>

                        <div className="flex items-center gap-2.5 w-full sm:w-auto">
                          {doc.fileName ? (
                            <div className="flex items-center gap-2">
                              <span className="px-3 py-1.5 bg-emerald-100 text-emerald-800 text-xs font-extrabold rounded-xl flex items-center gap-1.5 border border-emerald-200">
                                <span>📄 {doc.fileName}</span>
                                <span className="bg-emerald-600 text-white text-[10px] px-1.5 py-0.5 rounded-full font-black">Verified</span>
                              </span>
                              <button
                                type="button"
                                onClick={() => handleRemoveFile(idx)}
                                className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                                title="Remove document"
                              >
                                ✕
                              </button>
                            </div>
                          ) : (
                            <label className="flex items-center gap-2 px-4 py-2 bg-white hover:bg-blue-50 text-blue-600 hover:text-blue-700 border border-blue-200 hover:border-blue-300 rounded-xl text-xs font-extrabold shadow-2xs transition-all cursor-pointer">
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" /></svg>
                              <span>Choose File / Upload</span>
                              <input
                                type="file"
                                className="hidden"
                                accept=".pdf,.png,.jpg,.jpeg,.doc,.docx"
                                onChange={e => handleFileUpload(idx, e.target.files?.[0])}
                              />
                            </label>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="flex justify-between pt-6 border-t border-slate-100">
                    <button
                      type="button"
                      onClick={() => setCurrentStep(2)}
                      className="px-4 py-2.5 font-bold text-slate-600 hover:bg-slate-100 rounded-xl text-sm"
                    >
                      Back: {modalType === 'STUDENT' ? 'Parent Details' : 'Emergency Contact'}
                    </button>
                    <button
                      type="submit"
                      className="px-8 py-3 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white font-black text-sm rounded-2xl shadow-lg shadow-emerald-200 transition-all active:scale-95 cursor-pointer"
                    >
                      Complete {modalType === 'STUDENT' ? 'Student Enrollment' : 'Staff Onboarding'}
                    </button>
                  </div>
                </div>
              )}
            </form>
          </div>
        </div>
      )}

      {/* View Full Dossier Modal */}
      {viewRecord && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4 z-50 overflow-y-auto">
          <div className="bg-white rounded-3xl p-6 sm:p-8 max-w-2xl w-full shadow-2xl border border-slate-200 space-y-6 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <div className="flex items-center gap-3">
                <span className="w-11 h-11 rounded-2xl bg-blue-100 text-blue-800 flex items-center justify-center font-black text-lg">
                  {viewRecord.firstName[0]}
                </span>
                <div>
                  <h3 className="text-xl font-extrabold text-slate-900">
                    {viewRecord.firstName} {viewRecord.middleName} {viewRecord.lastName}
                  </h3>
                  <span className="text-xs font-bold text-blue-600 uppercase tracking-wider">
                    {viewRecord.type} | {viewRecord.grade} - {viewRecord.section} {viewRecord.experience ? `(${viewRecord.experience})` : ''}
                  </span>
                </div>
              </div>
              <button
                onClick={() => setViewRecord(null)}
                className="text-slate-400 hover:text-slate-600 font-bold text-lg p-1"
              >
                ✕
              </button>
            </div>

            {/* Personal Details */}
            <div className="space-y-2">
              <h4 className="text-xs font-black uppercase tracking-wider text-blue-600">Personal Details</h4>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-slate-50 p-4 rounded-2xl border border-slate-200 text-xs">
                <div>
                  <span className="text-slate-400 font-bold uppercase block">DOB</span>
                  <span className="font-extrabold text-slate-800">{viewRecord.dob}</span>
                </div>
                <div>
                  <span className="text-slate-400 font-bold uppercase block">Gender</span>
                  <span className="font-extrabold text-blue-700">{viewRecord.gender || 'Male'}</span>
                </div>
                <div>
                  <span className="text-slate-400 font-bold uppercase block">Blood Group</span>
                  <span className="font-black text-rose-600">{viewRecord.bloodGroup}</span>
                </div>
                <div>
                  <span className="text-slate-400 font-bold uppercase block">Phone</span>
                  <span className="font-bold text-slate-800 font-mono">{viewRecord.phone}</span>
                </div>
                <div className="col-span-2 sm:col-span-3">
                  <span className="text-slate-400 font-bold uppercase block">Email Address</span>
                  <span className="font-bold text-slate-800">{viewRecord.email}</span>
                </div>
                <div className="col-span-2 sm:col-span-3">
                  <span className="text-slate-400 font-bold uppercase block">Current Address</span>
                  <span className="font-medium text-slate-700">{viewRecord.currentAddress}</span>
                </div>
                <div className="col-span-2 sm:col-span-3">
                  <span className="text-slate-400 font-bold uppercase block">Permanent Address</span>
                  <span className="font-medium text-slate-700">{viewRecord.permanentAddress}</span>
                </div>
              </div>
            </div>

            {/* Parent / Emergency Details */}
            <div className="space-y-2">
              <h4 className="text-xs font-black uppercase tracking-wider text-indigo-600">
                {viewRecord.type === 'STUDENT' ? 'Parent / Guardian Details' : 'Emergency Contact Details'}
              </h4>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 bg-slate-50 p-4 rounded-2xl border border-slate-200 text-xs">
                <div>
                  <span className="text-slate-400 font-bold uppercase block">Name</span>
                  <span className="font-extrabold text-slate-800">
                    {viewRecord.parentFirstName} {viewRecord.parentMiddleName} {viewRecord.parentLastName}
                  </span>
                </div>
                <div>
                  <span className="text-slate-400 font-bold uppercase block">Phone</span>
                  <span className="font-bold text-slate-800 font-mono">{viewRecord.parentPhone}</span>
                </div>
                <div>
                  <span className="text-slate-400 font-bold uppercase block">Blood Group</span>
                  <span className="font-black text-rose-600">{viewRecord.parentBloodGroup || '-'}</span>
                </div>
                <div className="col-span-2">
                  <span className="text-slate-400 font-bold uppercase block">Email</span>
                  <span className="font-bold text-slate-800">{viewRecord.parentEmail || '-'}</span>
                </div>
                <div>
                  <span className="text-slate-400 font-bold uppercase block">DOB</span>
                  <span className="font-medium text-slate-700">{viewRecord.parentDob || '-'}</span>
                </div>
              </div>
            </div>

            {/* Documents Verification Status */}
            <div className="space-y-2">
              <h4 className="text-xs font-black uppercase tracking-wider text-emerald-600">Required Documents Checklist</h4>
              <div className="space-y-2">
                {parseDocs(viewRecord.documentsJson).map(doc => (
                  <div key={doc.name} className="p-3 bg-slate-50 rounded-xl border border-slate-200 flex items-center justify-between text-xs">
                    <span className="font-extrabold text-slate-800">{doc.name}</span>
                    <div className="flex items-center gap-2">
                      {doc.fileName && (
                        <a
                          href={doc.fileUrl || '#'}
                          target="_blank"
                          rel="noopener noreferrer"
                          download={doc.fileName}
                          className="text-blue-600 hover:text-blue-800 font-mono text-[11px] bg-white px-2.5 py-1 rounded-lg border border-blue-200 hover:border-blue-300 font-bold flex items-center gap-1 transition-all"
                        >
                          📄 View/Download {doc.fileName}
                        </a>
                      )}
                      {doc.isChecked ? (
                        <span className="px-2.5 py-0.5 bg-emerald-100 text-emerald-800 font-black rounded-lg">Verified</span>
                      ) : (
                        <span className="px-2.5 py-0.5 bg-amber-100 text-amber-800 font-bold rounded-lg">Pending</span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex justify-end pt-2">
              <button
                onClick={() => setViewRecord(null)}
                className="px-6 py-2.5 bg-slate-900 text-white font-bold text-sm rounded-xl hover:bg-slate-800 transition-all cursor-pointer"
              >
                Close Dossier
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
