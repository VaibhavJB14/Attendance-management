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

export default function ExamSeating() {
  const router = useRouter();
  const [session, setSession] = useState<UserSession | null>(null);

  // Form State
  // Form State
  const [selectedGrades, setSelectedGrades] = useState<string[]>([]);
  const [selectedSections, setSelectedSections] = useState<string[]>([]);
  
  const [schoolClasses, setSchoolClasses] = useState<any[]>([]);
  const uniqueGrades = Array.from(new Set(schoolClasses.map((c: any) => c.grade)));
  const uniqueSections = Array.from(new Set(schoolClasses.map((c: any) => c.section)));
  
  const [numClassrooms, setNumClassrooms] = useState(10);
  const [benchesPerClassroom, setBenchesPerClassroom] = useState(20);
  const [studentsPerBench, setStudentsPerBench] = useState(2);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const [arrangement, setArrangement] = useState<any[] | null>(null);

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

    fetch('/api/classes', {
      headers: { 'x-tenant-id': user.tenantId }
    })
    .then(res => res.json())
    .then(data => {
      if (data.classes) setSchoolClasses(data.classes);
    })
    .catch(console.error);

  }, [router]);

  const toggleSelection = (setter: React.Dispatch<React.SetStateAction<string[]>>, item: string) => {
    setter(prev => 
      prev.includes(item) ? prev.filter(i => i !== item) : [...prev, item]
    );
  };

  const handleGenerate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!session) return;
    setLoading(true);
    setError(null);
    setArrangement(null);

    try {
      const res = await fetch('/api/exams/seating', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-tenant-id': session.tenantId
        },
        body: JSON.stringify({
          grades: selectedGrades,
          sections: selectedSections,
          numClassrooms,
          benchesPerClassroom,
          studentsPerBench
        })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to generate seating');

      setArrangement(data.arrangement);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const downloadCSV = (sectionName: string, records: any[]) => {
    // Define CSV Headers
    const headers = ['Student Name', 'Roll Number', 'Grade', 'Section', 'Assigned Classroom', 'Bench Number', 'Seat Position'];
    
    // Map records to CSV rows
    const rows = records.map(r => [
      `"${r.name}"`, 
      `"${r.rollNumber}"`, 
      `"${r.grade}"`, 
      `"${r.section}"`, 
      `"${r.classroom}"`, 
      `"${r.bench}"`, 
      `"${r.seatPosition}"`
    ]);

    // Combine headers and rows
    const csvContent = [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
    
    // Create Blob and Download
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    
    link.setAttribute('href', url);
    link.setAttribute('download', `Exam_Seating_${sectionName.replace(/\s+/g, '_')}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  if (!session) return null;

  // Group arrangement by section
  const sectionGroups: Record<string, any[]> = {};
  if (arrangement) {
    arrangement.forEach(student => {
      const key = `${student.grade} - ${student.section}`;
      if (!sectionGroups[key]) sectionGroups[key] = [];
      sectionGroups[key].push(student);
    });
  }

  return (
    <main className="min-h-screen bg-slate-50 text-slate-900 p-8 font-sans">
      <div className="max-w-6xl mx-auto space-y-8 mt-10">
        
        {/* Navigation */}
        <div className="flex items-center justify-between mb-8">
          <Link href="/admin/extra-features" className="flex items-center text-indigo-600 font-semibold hover:text-indigo-800 transition-colors">
            <svg className="w-5 h-5 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7"></path></svg>
            Back to Extra Features Hub
          </Link>
        </div>

        <div className="bg-white p-8 rounded-3xl shadow-xl border border-slate-200">
          <div className="flex items-center gap-4 mb-2">
            <div className="w-12 h-12 bg-indigo-100 text-indigo-600 rounded-2xl flex items-center justify-center shadow-sm">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"></path></svg>
            </div>
            <h1 className="text-3xl font-extrabold text-slate-800 tracking-tight">
              Exam Seating Allotment
            </h1>
          </div>
          <p className="text-slate-500 mb-8 ml-16">Automatically assign students to classrooms and benches for examinations.</p>

          <form onSubmit={handleGenerate} className="space-y-8">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              
              {/* Target Students */}
              <div className="bg-slate-50 p-6 rounded-2xl border border-slate-200">
                <h3 className="font-bold text-slate-700 mb-4">1. Select Target Students</h3>
                
                <div className="space-y-4">
                  <div>
                    <p className="text-sm font-semibold text-slate-600 mb-2">Grades / Years</p>
                    <div className="flex flex-wrap gap-2">
                      {uniqueGrades.length > 0 ? uniqueGrades.map((g: any) => (
                        <button
                          key={g}
                          type="button"
                          onClick={() => toggleSelection(setSelectedGrades, g)}
                          className={`px-4 py-2 rounded-xl text-sm font-bold transition-all border ${
                            selectedGrades.includes(g) 
                            ? 'bg-indigo-600 text-white border-indigo-600 shadow-md shadow-indigo-200' 
                            : 'bg-white text-slate-600 border-slate-200 hover:border-indigo-300 hover:text-indigo-600'
                          }`}
                        >
                          {g}
                        </button>
                      )) : <span className="text-sm text-slate-400">No grades available</span>}
                    </div>
                  </div>
                  
                  <div>
                    <p className="text-sm font-semibold text-slate-600 mb-2">Sections</p>
                    <div className="flex flex-wrap gap-2">
                      {uniqueSections.length > 0 ? uniqueSections.map((s: any) => (
                        <button
                          key={s}
                          type="button"
                          onClick={() => toggleSelection(setSelectedSections, s)}
                          className={`px-4 py-2 rounded-xl text-sm font-bold transition-all border ${
                            selectedSections.includes(s) 
                            ? 'bg-indigo-600 text-white border-indigo-600 shadow-md shadow-indigo-200' 
                            : 'bg-white text-slate-600 border-slate-200 hover:border-indigo-300 hover:text-indigo-600'
                          }`}
                        >
                          {s}
                        </button>
                      )) : <span className="text-sm text-slate-400">No sections available</span>}
                    </div>
                  </div>
                </div>
              </div>

              {/* Infrastructure */}
              <div className="bg-slate-50 p-6 rounded-2xl border border-slate-200">
                <h3 className="font-bold text-slate-700 mb-4">2. Seating Infrastructure</h3>
                
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-semibold text-slate-600 mb-1">Number of Classrooms Available</label>
                    <input 
                      type="number" min="1" required
                      value={numClassrooms} onChange={e => setNumClassrooms(parseInt(e.target.value) || 0)}
                      className="w-full bg-white border border-slate-200 p-2.5 rounded-lg focus:ring-indigo-500 focus:border-indigo-500 text-sm font-bold text-slate-800" 
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-semibold text-slate-600 mb-1">Benches per Room</label>
                      <input 
                        type="number" min="1" required
                        value={benchesPerClassroom} onChange={e => setBenchesPerClassroom(parseInt(e.target.value) || 0)}
                        className="w-full bg-white border border-slate-200 p-2.5 rounded-lg focus:ring-indigo-500 focus:border-indigo-500 text-sm font-bold text-slate-800" 
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-slate-600 mb-1">Students per Bench</label>
                      <input 
                        type="number" min="1" max="10" required
                        value={studentsPerBench} onChange={e => setStudentsPerBench(parseInt(e.target.value) || 0)}
                        className="w-full bg-white border border-slate-200 p-2.5 rounded-lg focus:ring-indigo-500 focus:border-indigo-500 text-sm font-bold text-slate-800" 
                      />
                    </div>
                  </div>
                  
                  <div className="pt-2">
                    <div className="p-3 bg-indigo-50 border border-indigo-100 rounded-lg flex items-center justify-between">
                      <span className="text-sm font-medium text-indigo-800">Total Seating Capacity:</span>
                      <span className="text-lg font-black text-indigo-700">{numClassrooms * benchesPerClassroom * studentsPerBench}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {error && (
              <div className="p-4 bg-red-50 text-red-700 border border-red-200 rounded-xl font-semibold flex items-center gap-2">
                <svg className="w-5 h-5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
                {error}
              </div>
            )}

            <button 
              disabled={loading || selectedGrades.length === 0 || selectedSections.length === 0}
              type="submit" 
              className="w-full py-4 bg-gradient-to-r from-indigo-600 to-blue-500 hover:from-indigo-700 hover:to-blue-600 text-white font-extrabold text-lg rounded-xl shadow-xl shadow-indigo-200 transition-all active:scale-[0.98] disabled:opacity-50"
            >
              {loading ? 'Generating Arrangement...' : 'Generate Seating Arrangement'}
            </button>
          </form>
        </div>

        {/* Results Section */}
        {arrangement && (
          <div className="bg-white p-8 rounded-3xl shadow-xl border border-emerald-200 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-100 rounded-bl-full -mr-16 -mt-16 z-0"></div>
            
            <div className="relative z-10">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 bg-emerald-500 text-white rounded-full flex items-center justify-center shadow-md">
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path></svg>
                </div>
                <h2 className="text-2xl font-bold text-slate-800">Seating Generated Successfully!</h2>
              </div>
              
              <p className="text-slate-600 mb-8 font-medium">
                Successfully assigned seats for <span className="font-bold text-slate-800">{arrangement.length}</span> students.
                Download the spreadsheets below to print and stick on notice boards.
              </p>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {Object.keys(sectionGroups).sort().map(sectionKey => (
                  <div key={sectionKey} className="p-5 border border-slate-200 rounded-2xl bg-slate-50 flex flex-col justify-between hover:shadow-md transition-all hover:border-emerald-300">
                    <div>
                      <h4 className="font-bold text-lg text-slate-800">{sectionKey}</h4>
                      <p className="text-sm text-slate-500 mt-1">{sectionGroups[sectionKey].length} Students</p>
                    </div>
                    <button 
                      onClick={() => downloadCSV(sectionKey, sectionGroups[sectionKey])}
                      className="mt-6 flex items-center justify-center w-full gap-2 py-2.5 bg-white border border-emerald-500 text-emerald-700 font-bold rounded-xl hover:bg-emerald-50 transition-colors"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"></path></svg>
                      Download CSV
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
