'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

interface Mark {
  id: string;
  subject: string;
  score: number;
  maxScore: number;
  examName: string;
  recordedAt: string;
}

interface Attendance {
  id: string;
  date: string;
  sessionName: string;
  status: string;
}

interface DocumentRecord {
  id: string;
  title: string;
  fileUrl: string;
  createdAt: string;
}

interface Student {
  id: string;
  firstName: string;
  lastName: string;
  grade: string;
  section: string;
  rollNumber?: string;
}

interface UserSession {
  id: string;
  email: string;
  role: string;
  tenantId: string;
}

export default function ParentPortal() {
  const router = useRouter();
  const [session, setSession] = useState<UserSession | null>(null);
  const [students, setStudents] = useState<Student[]>([]);
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
  
  const [marks, setMarks] = useState<Mark[]>([]);
  const [attendance, setAttendance] = useState<Attendance[]>([]);
  const [documents, setDocuments] = useState<DocumentRecord[]>([]);
  
  const [docFile, setDocFile] = useState<File | null>(null);
  const [docTitle, setDocTitle] = useState('');
  const [uploading, setUploading] = useState(false);
  
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const stored = localStorage.getItem('session');
    if (!stored) {
      router.push('/login');
      return;
    }
    const user = JSON.parse(stored);
    if (user.role !== 'PARENT') {
      router.push('/');
      return;
    }
    setSession(user);
    
    // Fetch parent's linked students
    const fetchLinkedStudents = async () => {
      try {
        const res = await fetch('/api/parent/students', {
          headers: { 'x-tenant-id': user.tenantId, 'x-user-id': user.id }
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Failed to fetch students');
        
        setStudents(data.students);
        if (data.students.length > 0) {
          setSelectedStudent(data.students[0]);
        }
      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };
    
    fetchLinkedStudents();
  }, [router]);

  useEffect(() => {
    if (!session || !selectedStudent) return;
    
    const fetchStudentData = async () => {
      setLoading(true);
      try {
        // Fetch Attendance
        const attRes = await fetch(`/api/attendance?studentId=${selectedStudent.id}`, {
          headers: { 'x-tenant-id': session.tenantId }
        });
        const attData = await attRes.json();
        if (attRes.ok) setAttendance(attData.attendance || []);
        
        // Fetch Marks
        const marksRes = await fetch(`/api/marks?studentId=${selectedStudent.id}`, {
          headers: { 'x-tenant-id': session.tenantId }
        });
        const marksData = await marksRes.json();
        if (marksRes.ok) setMarks(marksData.marks || []);
        
        // Fetch Documents
        const docsRes = await fetch(`/api/documents?studentId=${selectedStudent.id}`, {
          headers: { 'x-tenant-id': session.tenantId }
        });
        const docsData = await docsRes.json();
        if (docsRes.ok) setDocuments(docsData.documents || []);
        
      } catch (err: any) {
        console.error('Failed to load student data:', err);
      } finally {
        setLoading(false);
      }
    };
    
    fetchStudentData();
  }, [session, selectedStudent]);

  if (!session) return null;

  const calculateAttendancePercentage = () => {
    if (attendance.length === 0) return 100;
    const present = attendance.filter(a => a.status === 'PRESENT').length;
    return Math.round((present / attendance.length) * 100);
  };

  const handleUploadDocument = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!session || !selectedStudent || !docFile || !docTitle) return;
    setUploading(true);
    setError(null);
    try {
      const formData = new FormData();
      formData.append('file', docFile);
      formData.append('title', docTitle);
      formData.append('studentId', selectedStudent.id);

      const res = await fetch('/api/documents', {
        method: 'POST',
        body: formData,
        headers: { 'x-tenant-id': session.tenantId }
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to upload document');
      
      setDocuments([data.document, ...documents]);
      setDocTitle('');
      setDocFile(null);
      
      // Reset file input visually
      const fileInput = document.getElementById('file-upload') as HTMLInputElement;
      if (fileInput) fileInput.value = '';
    } catch (err: any) {
      setError(err.message);
    } finally {
      setUploading(false);
    }
  };

  const handleDeleteDocument = async (id: string) => {
    if (!session || !confirm('Are you sure you want to delete this document?')) return;
    try {
      const res = await fetch(`/api/documents?id=${id}`, {
        method: 'DELETE',
        headers: { 'x-tenant-id': session.tenantId }
      });
      if (res.ok) {
        setDocuments(documents.filter(d => d.id !== id));
      }
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <main className="min-h-screen bg-slate-50 text-slate-900 p-8 font-sans">
      <div className="max-w-6xl mx-auto space-y-8 mt-10">
        
        {/* Header */}
        <div className="bg-white p-8 rounded-3xl shadow-xl border border-slate-200 relative overflow-hidden">
          <div className="absolute top-0 right-0 p-8 opacity-10 pointer-events-none">
             <svg className="w-48 h-48 text-emerald-600" fill="currentColor" viewBox="0 0 24 24"><path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/></svg>
          </div>
          
          <div className="relative z-10 flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
            <div>
              <h1 className="text-4xl font-extrabold text-slate-800 tracking-tight">
                Parent Portal
              </h1>
              <p className="mt-2 text-slate-500 text-lg">
                Monitor your child's academic performance and attendance.
              </p>
            </div>
            
            {students.length > 1 && (
              <select 
                value={selectedStudent?.id || ''}
                onChange={(e) => setSelectedStudent(students.find(s => s.id === e.target.value) || null)}
                className="bg-slate-50 border border-slate-200 text-slate-700 text-sm rounded-xl focus:ring-emerald-500 focus:border-emerald-500 p-3 font-semibold shadow-sm w-full md:w-64"
              >
                {students.map(s => (
                  <option key={s.id} value={s.id}>{s.firstName} {s.lastName}</option>
                ))}
              </select>
            )}
          </div>
        </div>

        {error && (
          <div className="p-4 bg-red-50 text-red-700 rounded-xl border border-red-200 font-semibold shadow-sm">
            {error}
          </div>
        )}

        {loading && students.length === 0 ? (
          <div className="flex justify-center p-12">
            <div className="w-8 h-8 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin"></div>
          </div>
        ) : !selectedStudent ? (
          <div className="bg-white p-12 rounded-2xl shadow-md border border-slate-200 text-center">
            <h2 className="text-xl font-bold text-slate-800">No Student Linked</h2>
            <p className="text-slate-500 mt-2">Please contact the school administrator to link your child to your account.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            
            {/* Student Profile Card */}
            <div className="lg:col-span-1 space-y-8">
              <div className="bg-white p-6 rounded-3xl shadow-md border border-slate-200 text-center">
                <div className="w-24 h-24 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center text-3xl font-bold border-4 border-white shadow-lg mx-auto mb-4">
                  {selectedStudent.firstName[0]}
                </div>
                <h2 className="text-2xl font-bold text-slate-800">{selectedStudent.firstName} {selectedStudent.lastName}</h2>
                <p className="text-slate-500 font-medium mt-1">{selectedStudent.grade} - {selectedStudent.section}</p>
                <div className="mt-6 pt-6 border-t border-slate-100 flex justify-between items-center px-4">
                  <div className="text-center">
                    <p className="text-sm text-slate-500 font-medium mb-1">Attendance</p>
                    <p className={`text-2xl font-bold ${calculateAttendancePercentage() >= 75 ? 'text-emerald-600' : 'text-rose-600'}`}>
                      {calculateAttendancePercentage()}%
                    </p>
                  </div>
                  <div className="w-px h-10 bg-slate-200"></div>
                  <div className="text-center">
                    <p className="text-sm text-slate-500 font-medium mb-1">Exams</p>
                    <p className="text-2xl font-bold text-indigo-600">{new Set(marks.map(m => m.examName)).size}</p>
                  </div>
                </div>
              </div>
              
              {/* Recent Absences Card */}
              <div className="bg-white p-6 rounded-3xl shadow-md border border-slate-200">
                <h3 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
                  <svg className="w-5 h-5 text-rose-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
                  Recent Absences
                </h3>
                <div className="space-y-3">
                  {attendance.filter(a => a.status === 'ABSENT').slice(0, 5).map((a, i) => (
                    <div key={i} className="flex justify-between items-center p-3 bg-rose-50 rounded-xl border border-rose-100">
                      <div>
                        <p className="text-sm font-bold text-rose-800">{new Date(a.date).toLocaleDateString()}</p>
                        <p className="text-xs font-medium text-rose-600">{a.sessionName}</p>
                      </div>
                      <span className="px-2 py-1 bg-rose-100 text-rose-700 text-[10px] font-bold uppercase rounded-md">Absent</span>
                    </div>
                  ))}
                  {attendance.filter(a => a.status === 'ABSENT').length === 0 && (
                    <p className="text-sm text-slate-500 italic text-center py-4">No recent absences recorded.</p>
                  )}
                </div>
              </div>
            </div>

            {/* Academic Performance */}
            <div className="lg:col-span-2">
              <div className="bg-white p-8 rounded-3xl shadow-md border border-slate-200 h-full">
                <h3 className="text-xl font-bold text-slate-800 mb-6 flex items-center gap-2">
                  <svg className="w-6 h-6 text-indigo-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"></path></svg>
                  Academic Performance
                </h3>
                
                {marks.length === 0 ? (
                   <p className="text-center text-slate-500 py-12">No academic records available yet.</p>
                ) : (
                  <div className="space-y-8">
                    {/* Group marks by examName */}
                    {Array.from(new Set(marks.map(m => m.examName))).map(exam => {
                      const examMarks = marks.filter(m => m.examName === exam);
                      return (
                        <div key={exam} className="bg-slate-50 rounded-2xl border border-slate-200 overflow-hidden">
                          <div className="bg-slate-100 px-6 py-4 border-b border-slate-200">
                            <h4 className="font-bold text-slate-800">{exam}</h4>
                          </div>
                          <table className="w-full text-left border-collapse">
                            <thead>
                              <tr className="text-xs uppercase tracking-wider font-semibold text-slate-500 border-b border-slate-100">
                                <th className="px-6 py-3">Subject</th>
                                <th className="px-6 py-3 text-right">Score</th>
                                <th className="px-6 py-3 text-right">Percentage</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                              {examMarks.map((m) => {
                                const percentage = Math.round((m.score / m.maxScore) * 100);
                                return (
                                  <tr key={m.id} className="bg-white hover:bg-slate-50/50 transition-colors">
                                    <td className="px-6 py-4 font-semibold text-slate-700">{m.subject}</td>
                                    <td className="px-6 py-4 text-right font-medium text-slate-600">
                                      <span className="font-bold text-slate-800">{m.score}</span> / {m.maxScore}
                                    </td>
                                    <td className="px-6 py-4 text-right">
                                      <span className={`inline-flex items-center justify-center px-2.5 py-1 rounded-full text-xs font-bold ${
                                        percentage >= 80 ? 'bg-emerald-100 text-emerald-700' :
                                        percentage >= 60 ? 'bg-amber-100 text-amber-700' :
                                        'bg-rose-100 text-rose-700'
                                      }`}>
                                        {percentage}%
                                      </span>
                                    </td>
                                  </tr>
                                );
                              })}
                            </tbody>
                          </table>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>

          </div>
        )}
        
        {/* Documents & Records Section */}
        {selectedStudent && (
          <div className="bg-white p-8 rounded-3xl shadow-md border border-slate-200 mt-8">
            <h3 className="text-xl font-bold text-slate-800 mb-6 flex items-center gap-2">
              <svg className="w-6 h-6 text-emerald-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13"></path></svg>
              Documents & Records
            </h3>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              {/* Upload Form */}
              <div className="lg:col-span-1 bg-slate-50 p-6 rounded-2xl border border-slate-200">
                <h4 className="font-bold text-slate-700 mb-4">Upload New Record</h4>
                <form onSubmit={handleUploadDocument} className="space-y-4">
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-1">Document Title</label>
                    <input 
                      required 
                      type="text" 
                      value={docTitle}
                      onChange={e => setDocTitle(e.target.value)}
                      placeholder="e.g. 10th Marks Card"
                      className="w-full bg-white border border-slate-200 p-2.5 rounded-lg focus:ring-emerald-500 focus:border-emerald-500 text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-1">File</label>
                    <input 
                      required 
                      id="file-upload"
                      type="file" 
                      onChange={e => setDocFile(e.target.files ? e.target.files[0] : null)}
                      className="w-full text-sm text-slate-500 file:mr-4 file:py-2.5 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-emerald-50 file:text-emerald-700 hover:file:bg-emerald-100"
                    />
                  </div>
                  <button 
                    disabled={uploading || !docFile || !docTitle}
                    type="submit" 
                    className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-lg transition-all active:scale-95 disabled:opacity-50"
                  >
                    {uploading ? 'Uploading...' : 'Upload Document'}
                  </button>
                </form>
              </div>

              {/* Documents List */}
              <div className="lg:col-span-2 space-y-3">
                <h4 className="font-bold text-slate-700 mb-4">Uploaded Records</h4>
                {documents.length === 0 ? (
                  <p className="text-sm text-slate-500 italic">No documents have been uploaded yet.</p>
                ) : (
                  documents.map(doc => (
                    <div key={doc.id} className="flex items-center justify-between p-4 bg-white border border-slate-200 rounded-xl hover:shadow-sm transition-all">
                      <div className="flex items-center gap-4">
                        <div className="w-10 h-10 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z"></path></svg>
                        </div>
                        <div>
                          <p className="font-bold text-slate-800 text-sm">{doc.title}</p>
                          <p className="text-xs text-slate-500">{new Date(doc.createdAt).toLocaleDateString()}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <a 
                          href={doc.fileUrl} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="px-3 py-1.5 text-xs font-bold bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg transition-colors"
                        >
                          View / Download
                        </a>
                        <button 
                          onClick={() => handleDeleteDocument(doc.id)}
                          className="px-3 py-1.5 text-xs font-bold bg-rose-50 hover:bg-rose-100 text-rose-600 rounded-lg transition-colors"
                        >
                          Delete
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
