'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

interface Student {
  id: string;
  firstName: string;
  lastName: string;
  rollNumber?: string;
}

interface Mark {
  id?: string;
  studentId: string;
  score: number | string;
  maxScore: number | string;
  examCategory?: string;
  syllabusCoverage?: string;
  subject: string;
  examName: string;
}

interface UserSession {
  id: string;
  email: string;
  role: string;
  tenantId: string;
}

export default function AcademicMarks() {
  const router = useRouter();
  const [session, setSession] = useState<UserSession | null>(null);
  
  const [activeTab, setActiveTab] = useState<'single' | 'master'>('single');
  
  const [grade, setGrade] = useState('');
  const [section, setSection] = useState('');
  
  // Single Test Entry Fields
  const [examCategory, setExamCategory] = useState('Competitive');
  const [examName, setExamName] = useState('JEE');
  const [syllabusCoverage, setSyllabusCoverage] = useState('');
  const [subject, setSubject] = useState('PHYSICS');
  const [customSubject, setCustomSubject] = useState('');
  const [maxScore, setMaxScore] = useState('100');
  const [maxScores, setMaxScores] = useState<Record<string, string>>({});
  const [examDate, setExamDate] = useState<string>(new Date().toISOString().split('T')[0]);
  
  // Master Gradebook Filters
  const [filterCategory, setFilterCategory] = useState('All');
  const [filterExam, setFilterExam] = useState('All');
  const [filterSubject, setFilterSubject] = useState('All');
  const [filterExamDate, setFilterExamDate] = useState('All');
  
  const [students, setStudents] = useState<Student[]>([]);
  const [marksMap, setMarksMap] = useState<Record<string, string>>({}); 
  const [allMarks, setAllMarks] = useState<any[]>([]);
  
  // Class Teacher Status
  const [isClassTeacher, setIsClassTeacher] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const isSuperAdmin = session?.role === 'SYSTEM_ADMIN' || session?.role === 'SCHOOL_ADMIN';

  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const [message, setMessage] = useState<{type: 'success' | 'error', text: string} | null>(null);

  // Messaging state
  const [messagingStudentId, setMessagingStudentId] = useState<string | null>(null);
  const [messageText, setMessageText] = useState('');
  const [messagingStatus, setMessagingStatus] = useState<'idle'|'sending'|'success'|'error'>('idle');

  useEffect(() => {
    const stored = localStorage.getItem('session');
    if (!stored) {
      router.push('/login');
      return;
    }
    const user = JSON.parse(stored);
    
    // Allow Teachers and Admins
    if (user.role === 'STUDENT' || user.role === 'PARENT' || user.role === 'WARDEN') {
      router.push('/');
      return;
    }
    setSession(user);
  }, [router]);

  const loadStudentsAndMarks = async () => {
    if (activeTab === 'single') {
      if (!session || !grade || !section) {
        setMessage({ type: 'error', text: 'Please select a Grade and Section.' });
        return;
      }
    } else {
      if (!session || !grade || !section) {
        setMessage({ type: 'error', text: 'Please select a Grade and Section.' });
        return;
      }
    }
    
    setLoading(true);
    setMessage(null);
    setHasSearched(true);
    setIsClassTeacher(false); // Reset

    try {
      // 1. Fetch Class Teacher Status for this grade/section
      if (session.role === 'TEACHER') {
        const ctRes = await fetch(`/api/class-teachers?checkUser=true&grade=${encodeURIComponent(grade)}&section=${encodeURIComponent(section)}`, {
          headers: { 'x-tenant-id': session.tenantId }
        });
        const ctData = await ctRes.json();
        setIsClassTeacher(ctData.isClassTeacher || false);
      } else {
        // Admins always have messaging rights
        setIsClassTeacher(true); 
      }

      // 2. Fetch Students and Marks
      const finalSubject = subject === 'Other' ? customSubject : subject;
      let url = `/api/marks?grade=${encodeURIComponent(grade)}&section=${encodeURIComponent(section)}`;
      
      if (activeTab === 'single') {
        url += `&examName=${encodeURIComponent(examName)}&examDate=${encodeURIComponent(examDate)}`;
        if (examCategory !== 'Competitive') {
          url += `&subject=${encodeURIComponent(finalSubject)}`;
        }
      }
        
      const res = await fetch(url, {
        headers: {
          'x-tenant-id': session.tenantId,
        }
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to load data');
      
      setStudents(data.students);
      setAllMarks(data.marks || []);
      
      if (activeTab === 'single') {
        const newMarksMap: Record<string, string> = {};
        if (data.marks && data.marks.length > 0) {
          data.marks.forEach((m: any) => {
            if (examCategory === 'Competitive') {
               if (m.examName === examName) {
                 newMarksMap[`${m.studentId}_${m.subject}`] = m.score.toString();
               }
            } else {
               if (m.examName === examName && m.subject === finalSubject) {
                 newMarksMap[`${m.studentId}_${finalSubject}`] = m.score.toString();
               }
            }
          });
        }
        setMarksMap(newMarksMap);
      }

    } catch (error: unknown) {
      setMessage({ type: 'error', text: error instanceof Error ? error.message : 'Unknown error' });
    } finally {
      setLoading(false);
    }
  };

  const handleScoreChange = (studentId: string, subjectKey: string, value: string) => {
    let parsedValue = parseFloat(value);
    const max = examCategory === 'Competitive' 
      ? parseFloat(maxScores[subjectKey] || '100')
      : parseFloat(maxScore || '100');
      
    if (!isNaN(parsedValue) && parsedValue > max) {
      value = max.toString();
    }

    setMarksMap(prev => ({
      ...prev,
      [`${studentId}_${subjectKey}`]: value
    }));
  };

  const handleMaxScoreChange = (subjectKey: string, value: string) => {
    setMaxScores(prev => ({
      ...prev,
      [subjectKey]: value
    }));
  };

  const getCompetitiveSubjects = (exam: string) => {
    if (exam === 'JEE') return ['PHYSICS', 'CHEMISTRY', 'MATHS'];
    if (exam === 'NEET') return ['PHYSICS', 'CHEMISTRY', 'BIOLOGY'];
    if (exam === 'K-CET') return ['PHYSICS', 'CHEMISTRY', 'MATHS', 'BIOLOGY'];
    return [];
  };

  const handleSubmit = async () => {
    if (!session) return;
    
    const finalSubject = subject === 'Other' ? customSubject : subject;
    
    if (!examName || (examCategory !== 'Competitive' && !finalSubject)) {
      setMessage({ type: 'error', text: 'Please provide Exam Name and Subject before saving.' });
      return;
    }

    let records: any[] = [];
    
    if (examCategory === 'Competitive') {
      const subjects = getCompetitiveSubjects(examName);
      students.forEach(s => {
        subjects.forEach(sub => {
          const score = marksMap[`${s.id}_${sub}`];
          if (score !== undefined && score !== '') {
            records.push({
              studentId: s.id,
              subject: sub,
              score: parseFloat(score),
              maxScore: maxScores[sub] || '100'
            });
          }
        });
      });
    } else {
      records = students.map(s => {
        const score = marksMap[`${s.id}_${finalSubject}`];
        return {
          studentId: s.id,
          subject: finalSubject,
          score: score ? parseFloat(score) : 0
        };
      });
    }

    setSaving(true);
    setMessage(null);

    try {
      const res = await fetch('/api/marks', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-tenant-id': session.tenantId
        },
        body: JSON.stringify({
          examName,
          examCategory,
          syllabusCoverage,
          subject: finalSubject,
          maxScore,
          examDate,
          records
        })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to save marks');

      if (examCategory === 'Competitive') {
        const uniqueStudents = new Set(records.map(r => r.studentId)).size;
        setMessage({ type: 'success', text: `Successfully saved ${examName} marks for ${uniqueStudents} student(s) (${records.length} subject records).` });
      } else {
        setMessage({ type: 'success', text: `Successfully saved ${finalSubject} marks for ${records.length} student(s).` });
      }
      
    } catch (error: unknown) {
      setMessage({ type: 'error', text: error instanceof Error ? error.message : 'Unknown error' });
    } finally {
      setSaving(false);
    }
  };

  // Open Messaging Modal and Auto-Generate Summary
  const openMessagingModal = (studentId: string) => {
    setMessagingStudentId(studentId);
    setMessagingStatus('idle');

    // Generate a summary based on currently visible columns (filter applied)
    const studentMarks = allMarks.filter(m => m.studentId === studentId);
    
    let summaryText = `Performance Report for ${grade} ${section}\n\n`;
    
    let hasMarks = false;
    uniqueTests.forEach(test => {
      const [cat, name, sub, mDate] = test.split(' | ');
      const mark = studentMarks.find(m => 
        m.examName === name && 
        m.subject === sub &&
        (m.examCategory || 'Custom') === cat &&
        (mDate ? new Date(m.examDate).toISOString().split('T')[0] === mDate : true)
      );

      if (mark) {
        hasMarks = true;
        summaryText += `• ${sub} (${cat} - ${name}): ${mark.score}/${mark.maxScore}\n`;
      }
    });

    if (hasMarks) {
      summaryText += `\nPlease review and let us know if you have any questions.\n- Class Teacher`;
      setMessageText(summaryText);
    } else {
      setMessageText('');
    }
  };

  const handleSendMessage = async () => {
    if (!session || !messagingStudentId || !messageText) return;
    
    setMessagingStatus('sending');
    try {
      const res = await fetch('/api/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-tenant-id': session.tenantId
        },
        body: JSON.stringify({
          studentId: messagingStudentId,
          message: messageText
        })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to send message');
      
      setMessagingStatus('success');
      setTimeout(() => {
        setMessagingStudentId(null);
        setMessageText('');
        setMessagingStatus('idle');
      }, 2000);
      
    } catch (error: unknown) {
      setMessagingStatus('error');
    }
  };

  // Simple CSV parser that handles quoted strings
  const parseCSVRow = (str: string) => {
    const result = [];
    let current = '';
    let inQuotes = false;
    for (let i = 0; i < str.length; i++) {
      if (str[i] === '"') {
        inQuotes = !inQuotes;
      } else if (str[i] === ',' && !inQuotes) {
        result.push(current);
        current = '';
      } else {
        current += str[i];
      }
    }
    result.push(current);
    return result;
  };

  const downloadTemplate = () => {
    if (students.length === 0) {
      alert('Please load a class first before downloading a template.');
      return;
    }

    const finalSubject = subject === 'Other' ? customSubject : subject;
    let headers = ['Roll Number', 'Student Name'];
    
    if (examCategory === 'Competitive') {
      const selectedMax = maxScores['PHYSICS'] || maxScore;
      headers.push(`PHYSICS Score (Max: ${selectedMax})`);
      headers.push(`CHEMISTRY Score (Max: ${maxScores['CHEMISTRY'] || maxScore})`);
      headers.push(`MATHS Score (Max: ${maxScores['MATHS'] || maxScore})`);
    } else {
      headers.push(`${finalSubject} Score (Max: ${maxScore})`);
    }

    let csvContent = headers.join(',') + '\n';
    
    students.forEach(student => {
      const row = [`"${student.rollNumber || ''}"`, `"${student.firstName} ${student.lastName}"`];
      if (examCategory === 'Competitive') {
        row.push('', '', ''); // Empty slots for scores
      } else {
        row.push(''); // Empty slot for score
      }
      csvContent += row.join(',') + '\n';
    });
    
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    const safeSubject = examCategory === 'Competitive' ? 'Competitive' : finalSubject;
    link.setAttribute('download', `Marks_Template_${grade}_${section}_${safeSubject}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleCSVUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      if (!text) return;
      
      const lines = text.split(/\r?\n/).filter(line => line.trim() !== '');
      if (lines.length < 2) {
        alert('Invalid CSV file or empty data.');
        return;
      }
      
      const headers = parseCSVRow(lines[0]);
      
      // Validation to ensure it's our template
      if (!headers[0].includes('Roll Number') || !headers[1].includes('Student Name')) {
        alert('Invalid template format. Please download the template and use it.');
        return;
      }

      const newMarksMap = { ...marksMap };
      const finalSubject = subject === 'Other' ? customSubject : subject;

      for (let i = 1; i < lines.length; i++) {
        const row = parseCSVRow(lines[i]);
        if (row.length < 3) continue;
        
        const rollNum = row[0].replace(/"/g, '').trim();
        const student = students.find(s => s.rollNumber === rollNum);
        
        if (!student) continue;

        if (examCategory === 'Competitive') {
          // Expecting PHYSICS, CHEMISTRY, MATHS at index 2, 3, 4
          const phy = row[2] ? row[2].replace(/"/g, '').trim() : '';
          const chem = row[3] ? row[3].replace(/"/g, '').trim() : '';
          const math = row[4] ? row[4].replace(/"/g, '').trim() : '';
          
          if (phy) newMarksMap[`${student.id}_PHYSICS`] = phy;
          if (chem) newMarksMap[`${student.id}_CHEMISTRY`] = chem;
          if (math) newMarksMap[`${student.id}_MATHS`] = math;
        } else {
          // Regular subject
          const score = row[2] ? row[2].replace(/"/g, '').trim() : '';
          if (score) newMarksMap[`${student.id}_${finalSubject}`] = score;
        }
      }
      
      setMarksMap(newMarksMap);
      alert('CSV Data loaded into the grid! Please review and click Save Marks.');
      
      // Reset input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    };
    reader.readAsText(file);
  };

  const downloadCSV = (type: 'filtered' | 'all' = 'filtered') => {
    if (students.length === 0 || allMarks.length === 0) return;
    
    let testsToExport: string[] = [];
    if (type === 'filtered') {
      testsToExport = uniqueTests;
    } else {
      const tests = new Set<string>();
      allMarks.forEach(m => {
        const mDate = m.examDate ? new Date(m.examDate).toISOString().split('T')[0] : '';
        tests.add(`${m.examCategory || 'Custom'} | ${m.examName} | ${m.subject} | ${mDate}`);
      });
      testsToExport = Array.from(tests);
    }

    if (testsToExport.length === 0) return;

    // Header row
    const headers = ['Student Name', 'Roll Number'];
    testsToExport.forEach(test => {
      const [cat, name, sub, mDate] = test.split(' | ');
      const dateStr = mDate ? ` [${mDate}]` : '';
      headers.push(`${sub} - ${name} (${cat})${dateStr}`);
    });
    
    let csvContent = headers.join(',') + '\n';
    
    // Data rows
    students.forEach(student => {
      const row = [`"${student.firstName} ${student.lastName}"`, `"${student.rollNumber || ''}"`];
      
      testsToExport.forEach(test => {
        const [cat, name, sub, mDate] = test.split(' | ');
        const mark = allMarks.find(m => 
          m.studentId === student.id && 
          m.examName === name && 
          m.subject === sub &&
          (m.examCategory || 'Custom') === cat &&
          (mDate ? new Date(m.examDate).toISOString().split('T')[0] === mDate : true)
        );
        
        row.push(mark ? `"${mark.score}/${mark.maxScore}"` : '""');
      });
      
      csvContent += row.join(',') + '\n';
    });
    
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    const fileNameSuffix = type === 'filtered' ? 'Filtered' : 'All';
    link.setAttribute('download', `Marks_${grade}_${section}_${fileNameSuffix}_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Generate subjects, categories and exams for filters
  const getFilterOptions = () => {
    const subjects = new Set<string>();
    const categories = new Set<string>();
    const exams = new Set<string>();
    const examDates = new Set<string>();
    allMarks.forEach(m => {
      subjects.add(m.subject);
      if (m.examCategory) categories.add(m.examCategory);
      if (m.examName) exams.add(m.examName);
      if (m.examDate) examDates.add(new Date(m.examDate).toISOString().split('T')[0]);
    });
    return { 
      subjects: Array.from(subjects), 
      categories: Array.from(categories),
      exams: Array.from(exams),
      examDates: Array.from(examDates).sort((a,b) => b.localeCompare(a)) // sort descending
    };
  };
  const filterOptions = getFilterOptions();

  // Get unique tests for Master Gradebook columns based on filters
  const getUniqueTests = () => {
    const tests = new Set<string>();
    allMarks.forEach(m => {
      const matchCat = filterCategory === 'All' || m.examCategory === filterCategory;
      const matchExam = filterExam === 'All' || m.examName === filterExam;
      const matchSub = filterSubject === 'All' || m.subject === filterSubject;
      const mDate = m.examDate ? new Date(m.examDate).toISOString().split('T')[0] : '';
      const matchDate = filterExamDate === 'All' || mDate === filterExamDate;
      if (matchCat && matchExam && matchSub && matchDate) {
        tests.add(`${m.examCategory || 'Custom'} | ${m.examName} | ${m.subject} | ${mDate}`);
      }
    });
    return Array.from(tests);
  };
  const uniqueTests = getUniqueTests();

  const showMessagingButton = isClassTeacher || isSuperAdmin;

  if (!session) return null;

  return (
    <main className="min-h-screen bg-slate-50 text-slate-900 p-8 font-sans">
      <div className="max-w-7xl mx-auto space-y-8 mt-10">
        {/* Navigation Header */}
        <div className="flex items-center justify-between mb-8">
          {isSuperAdmin ? (
            <Link href="/admin/reports" className="flex items-center text-indigo-600 font-semibold hover:text-indigo-800 transition-colors">
              <svg className="w-5 h-5 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7"></path></svg>
              Back to Reports Hub
            </Link>
          ) : (
            <Link href="/" className="flex items-center text-indigo-600 font-semibold hover:text-indigo-800 transition-colors">
              <svg className="w-5 h-5 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7"></path></svg>
              Back to Dashboard
            </Link>
          )}
        </div>

        {/* Header */}
        <div className="bg-white p-8 rounded-3xl shadow-xl border border-slate-200 relative overflow-hidden">
          <div className="absolute top-0 right-0 p-8 opacity-10 pointer-events-none">
             <svg className="w-48 h-48 text-indigo-600" fill="currentColor" viewBox="0 0 24 24"><path d="M12 3L1 9l4 2.18v6L12 21l7-3.82v-6l2.12-1.15V17h2V9L12 3zm6.82 6L12 12.72 5.18 9 12 5.28 18.82 9zM17 15.99l-5 2.73-5-2.73v-3.72L12 15l5-2.73v3.72z"/></svg>
          </div>
          
          <div className="relative z-10">
            <h1 className="text-4xl font-extrabold text-slate-800 tracking-tight">
              Academic Performance
            </h1>
            <p className="mt-2 text-slate-500 text-lg mb-8">
              Record and manage student exam scores securely.
            </p>

            {/* Tabs */}
            <div className="flex border-b border-slate-200 mb-6 gap-2">
              <button 
                onClick={() => { setActiveTab('single'); setHasSearched(false); setMessage(null); setStudents([]); }}
                className={`px-6 py-3 font-semibold text-sm transition-colors border-b-2 ${activeTab === 'single' ? 'border-indigo-500 text-indigo-600' : 'border-transparent text-slate-500 hover:text-slate-700'}`}
              >
                Single Test Entry
              </button>
              <button 
                onClick={() => { setActiveTab('master'); setHasSearched(false); setMessage(null); setStudents([]); }}
                className={`px-6 py-3 font-semibold text-sm transition-colors border-b-2 ${activeTab === 'master' ? 'border-indigo-500 text-indigo-600' : 'border-transparent text-slate-500 hover:text-slate-700'}`}
              >
                Master Gradebook (Excel View)
              </button>
            </div>
            
            {/* Filter Controls */}
            <div className="flex flex-col sm:flex-row gap-3 w-full flex-wrap">
              <select 
                value={grade}
                onChange={(e) => { setGrade(e.target.value); setHasSearched(false); }}
                className="bg-slate-50 border border-slate-200 text-slate-700 text-sm rounded-xl focus:ring-indigo-500 focus:border-indigo-500 p-3 font-semibold shadow-sm"
              >
                <option value="" disabled>Select Grade</option>
                <option value="Year 1">Year 1</option>
                <option value="Year 2">Year 2</option>
                <option value="Year 3">Year 3</option>
              </select>

              <select 
                value={section}
                onChange={(e) => { setSection(e.target.value); setHasSearched(false); }}
                className="bg-slate-50 border border-slate-200 text-slate-700 text-sm rounded-xl focus:ring-indigo-500 focus:border-indigo-500 p-3 font-semibold shadow-sm"
              >
                <option value="" disabled>Select Section</option>
                <option value="Sec A">Sec A</option>
                <option value="Sec B">Sec B</option>
                <option value="Sec C">Sec C</option>
                <option value="Sec D">Sec D</option>
              </select>

              <button 
                onClick={loadStudentsAndMarks}
                disabled={loading || !grade || !section}
                className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3 px-6 rounded-xl shadow-md transition-all active:scale-95 disabled:opacity-50"
              >
                {loading ? '...' : 'Load Sheet'}
              </button>
            </div>
            
            {/* Single Test Extended Controls */}
            {activeTab === 'single' && (
              <div className="mt-4 p-5 bg-indigo-50/50 rounded-2xl border border-indigo-100 flex flex-wrap gap-4 items-center">
                <div className="w-full flex justify-between items-center">
                  <div className="text-xs font-bold text-indigo-600 uppercase tracking-wider">Test Details</div>
                  <div className="flex items-center gap-2">
                    <button 
                      onClick={downloadTemplate}
                      title="Download CSV Template"
                      className="bg-white border border-indigo-200 text-indigo-600 hover:bg-indigo-50 px-3 py-1.5 rounded-lg text-sm font-bold shadow-sm transition-colors"
                    >
                      <svg className="w-4 h-4 inline-block mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"></path></svg>
                      Template
                    </button>
                    
                    <label className="bg-indigo-100 text-indigo-700 hover:bg-indigo-200 cursor-pointer px-3 py-1.5 rounded-lg text-sm font-bold shadow-sm transition-colors">
                      <svg className="w-4 h-4 inline-block mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12"></path></svg>
                      Upload CSV
                      <input 
                        type="file"
                        accept=".csv"
                        className="hidden"
                        ref={fileInputRef}
                        onChange={handleCSVUpload}
                      />
                    </label>

                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wider ml-4">Exam Conduct Date</label>
                    <input 
                      type="date"
                      value={examDate}
                      onChange={(e) => { setExamDate(e.target.value); setHasSearched(false); }}
                      className="bg-white border border-slate-200 text-slate-800 text-sm rounded-lg focus:ring-indigo-500 focus:border-indigo-500 p-1.5 shadow-sm font-semibold"
                    />
                  </div>
                </div>
                
                <select 
                  value={examCategory}
                  onChange={(e) => { 
                    const newCat = e.target.value;
                    setExamCategory(newCat); 
                    if (newCat === 'Competitive') {
                      setExamName('JEE');
                    } else {
                      setExamName('');
                    }
                    setHasSearched(false); 
                  }}
                  className="bg-white border border-slate-200 text-slate-700 text-sm rounded-xl focus:ring-indigo-500 focus:border-indigo-500 p-3 font-semibold shadow-sm w-full sm:w-40"
                >
                  <option value="Competitive">Competitive</option>
                  <option value="Theory">Theory</option>
                  <option value="Practical">Practical</option>
                </select>

                {examCategory === 'Competitive' ? (
                  <select
                    value={examName}
                    onChange={(e) => { setExamName(e.target.value); setHasSearched(false); }}
                    className="bg-white border border-slate-200 text-slate-800 text-sm rounded-xl focus:ring-indigo-500 focus:border-indigo-500 p-3 shadow-sm font-semibold w-full sm:w-48"
                  >
                    <option value="JEE">JEE</option>
                    <option value="NEET">NEET</option>
                    <option value="K-CET">K-CET</option>
                  </select>
                ) : (
                  <input 
                    type="text" 
                    placeholder="Exam Name (e.g. Unit Test 1)"
                    value={examName}
                    onChange={(e) => { setExamName(e.target.value); setHasSearched(false); }}
                    className="bg-white border border-slate-200 text-slate-800 text-sm rounded-xl focus:ring-indigo-500 focus:border-indigo-500 p-3 shadow-sm font-semibold w-full sm:w-48"
                  />
                )}

                {examCategory !== 'Competitive' && (
                  <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
                    <select
                      value={subject}
                      onChange={(e) => { setSubject(e.target.value); setHasSearched(false); }}
                      className="bg-white border border-slate-200 text-slate-800 text-sm rounded-xl focus:ring-indigo-500 focus:border-indigo-500 p-3 shadow-sm font-semibold w-full sm:w-48"
                    >
                      <option value="PHYSICS">PHYSICS</option>
                      <option value="MATHS">MATHS</option>
                      <option value="CHEMISTRY">CHEMISTRY</option>
                      <option value="BIOLOGY/COMPUTER SCIENCE">BIOLOGY/COMPUTER SCIENCE</option>
                      <option value="KANNADA/SANSKRITH">KANNADA/SANSKRITH</option>
                      <option value="ENGLISH">ENGLISH</option>
                      <option value="Other">Other...</option>
                    </select>
                    
                    {subject === 'Other' && (
                      <input 
                        type="text" 
                        placeholder="Custom Subject"
                        value={customSubject}
                        onChange={(e) => { setCustomSubject(e.target.value); setHasSearched(false); }}
                        className="bg-white border border-slate-200 text-slate-800 text-sm rounded-xl focus:ring-indigo-500 focus:border-indigo-500 p-3 shadow-sm font-semibold w-full sm:w-40"
                      />
                    )}
                  </div>
                )}
                
                <input 
                  type="text" 
                  placeholder="Syllabus (e.g. Ch 1-3)"
                  value={syllabusCoverage}
                  onChange={(e) => { setSyllabusCoverage(e.target.value); setHasSearched(false); }}
                  className="bg-white border border-slate-200 text-slate-800 text-sm rounded-xl focus:ring-indigo-500 focus:border-indigo-500 p-3 shadow-sm font-semibold w-full sm:w-48"
                />
              </div>
            )}
            
            {/* Master Gradebook Extended Controls */}
            {activeTab === 'master' && allMarks.length > 0 && (
               <div className="mt-4 p-5 bg-indigo-50/50 rounded-2xl border border-indigo-100 flex flex-wrap gap-4 items-center">
                 <div className="w-full flex justify-between items-center">
                   <div className="text-xs font-bold text-indigo-600 uppercase tracking-wider flex items-center gap-2">
                     <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z"></path></svg>
                     Filter Grid
                   </div>
                   {isClassTeacher && (
                     <div className="text-xs font-bold text-emerald-600 bg-emerald-100 px-3 py-1 rounded-full border border-emerald-200">
                       ✓ Verified Class Teacher
                     </div>
                   )}
                 </div>
                 
                 <div className="flex items-center gap-2">
                   <label className="text-sm font-semibold text-slate-600">Category:</label>
                   <select 
                     value={filterCategory}
                     onChange={(e) => setFilterCategory(e.target.value)}
                     className="bg-white border border-slate-200 text-slate-700 text-sm rounded-xl focus:ring-indigo-500 focus:border-indigo-500 p-2 font-semibold shadow-sm"
                   >
                     <option value="All">All Categories</option>
                     {filterOptions.categories.map(c => (
                       <option key={c} value={c}>{c}</option>
                     ))}
                   </select>
                 </div>

                 <div className="flex items-center gap-2">
                   <label className="text-sm font-semibold text-slate-600">Exam:</label>
                   <select 
                     value={filterExam}
                     onChange={(e) => setFilterExam(e.target.value)}
                     className="bg-white border border-slate-200 text-slate-700 text-sm rounded-xl focus:ring-indigo-500 focus:border-indigo-500 p-2 font-semibold shadow-sm"
                   >
                     <option value="All">All Exams</option>
                     {filterOptions.exams.map(e => (
                       <option key={e} value={e}>{e}</option>
                     ))}
                   </select>
                 </div>
                 
                 <div className="flex items-center gap-2">
                   <label className="text-sm font-semibold text-slate-600">Subject:</label>
                   <select 
                     value={filterSubject}
                     onChange={(e) => setFilterSubject(e.target.value)}
                     className="bg-white border border-slate-200 text-slate-700 text-sm rounded-xl focus:ring-indigo-500 focus:border-indigo-500 p-2 font-semibold shadow-sm"
                   >
                     <option value="All">All Subjects</option>
                     {filterOptions.subjects.map(s => (
                       <option key={s} value={s}>{s}</option>
                     ))}
                   </select>
                 </div>
                 
                 <div className="flex items-center gap-2">
                   <label className="text-sm font-semibold text-slate-600">Exam Date:</label>
                   <select 
                     value={filterExamDate}
                     onChange={(e) => setFilterExamDate(e.target.value)}
                     className="bg-white border border-slate-200 text-slate-700 text-sm rounded-xl focus:ring-indigo-500 focus:border-indigo-500 p-2 font-semibold shadow-sm"
                   >
                     <option value="All">All Dates</option>
                     {filterOptions.examDates.map(d => (
                       <option key={d} value={d}>{new Date(d).toLocaleDateString()}</option>
                     ))}
                   </select>
                 </div>
               </div>
            )}
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

        {/* Invalid State */}
        {hasSearched && students.length === 0 && !loading && !message && (
          <div className="bg-white p-12 rounded-2xl shadow-md border border-slate-200 text-center flex flex-col items-center">
            <div className="w-16 h-16 bg-slate-100 text-slate-400 rounded-full flex items-center justify-center mb-4">
              <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z"></path></svg>
            </div>
            <h2 className="text-xl font-bold text-slate-800">No Students Found</h2>
            <p className="text-slate-500 mt-2 max-w-sm mb-6">No students are currently enrolled in {grade} {section}.</p>
          </div>
        )}

        {/* Single Test Input Grid */}
        {activeTab === 'single' && students.length > 0 && hasSearched && (
          <div className="bg-white rounded-2xl shadow-xl border border-slate-200 overflow-hidden mt-8">
            <div className="p-6 border-b border-slate-200 bg-slate-50 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
              <div>
                <h2 className="text-xl font-bold text-slate-800">{examName} <span className="text-slate-400 font-normal">({examCategory})</span> {examCategory !== 'Competitive' && `- ${subject === 'Other' ? customSubject : subject}`}</h2>
                <p className="text-sm text-slate-500 mt-1">{grade} {section} {syllabusCoverage && `• Syllabus: ${syllabusCoverage}`}</p>
              </div>
              
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2">
                  {examCategory === 'Competitive' ? (
                    <>
                      <label className="text-sm font-semibold text-slate-600">Total Max Score:</label>
                      <span className="text-lg font-bold text-indigo-600 bg-indigo-50 px-3 py-1 rounded-lg border border-indigo-100">
                        {getCompetitiveSubjects(examName).reduce((sum, sub) => sum + (parseFloat(maxScores[sub] !== undefined ? maxScores[sub] : '100') || 0), 0)}
                      </span>
                    </>
                  ) : (
                    <>
                      <label className="text-sm font-semibold text-slate-600">Max Score:</label>
                      <input 
                        type="number" 
                        value={maxScore}
                        onChange={(e) => setMaxScore(e.target.value)}
                        className="bg-white border border-slate-300 text-slate-800 text-sm rounded-lg focus:ring-indigo-500 focus:border-indigo-500 p-2 w-20 font-bold text-center shadow-inner"
                      />
                    </>
                  )}
                </div>
                
                <button 
                  onClick={handleSubmit}
                  disabled={saving}
                  className="bg-emerald-500 hover:bg-emerald-600 text-white font-bold py-2.5 px-6 rounded-xl shadow-md transition-all active:scale-95 disabled:opacity-50 flex items-center gap-2"
                >
                  {saving ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                      Saving...
                    </>
                  ) : (
                    <>
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path></svg>
                      Save Marks
                    </>
                  )}
                </button>
              </div>
            </div>
            
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50 text-slate-600 text-xs uppercase tracking-wider font-semibold border-b border-slate-200">
                    <th className="px-6 py-4">Student Name</th>
                    <th className="px-6 py-4">Roll No.</th>
                    {examCategory === 'Competitive' ? (
                      getCompetitiveSubjects(examName).map(sub => (
                        <th key={sub} className="px-6 py-4 text-center">
                          <div className="flex flex-col items-center gap-2">
                            <span>{sub} Score</span>
                            <div className="flex items-center gap-2">
                              <span className="text-[10px] text-slate-400">MAX:</span>
                              <input 
                                type="number" 
                                value={maxScores[sub] !== undefined ? maxScores[sub] : '100'}
                                onChange={(e) => handleMaxScoreChange(sub, e.target.value)}
                                className="bg-white border border-slate-300 text-slate-800 text-xs rounded focus:ring-indigo-500 focus:border-indigo-500 p-1 w-16 text-center font-bold"
                              />
                            </div>
                          </div>
                        </th>
                      ))
                    ) : (
                      <th className="px-6 py-4 text-center">Score</th>
                    )}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {students.map((student) => {
                    const finalSubject = subject === 'Other' ? customSubject : subject;
                    return (
                      <tr key={student.id} className="hover:bg-slate-50/50 transition-colors">
                        <td className="px-6 py-4 font-semibold text-slate-800">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-slate-100 text-slate-600 flex items-center justify-center text-xs font-bold border border-slate-200">
                              {student.firstName[0]}
                            </div>
                            {student.firstName} {student.lastName}
                          </div>
                        </td>
                        <td className="px-6 py-4 font-medium text-slate-500">{student.rollNumber || '-'}</td>
                        {examCategory === 'Competitive' ? (
                          getCompetitiveSubjects(examName).map(sub => {
                            const score = marksMap[`${student.id}_${sub}`] || '';
                            return (
                              <td key={sub} className="px-6 py-4 text-center">
                                <input
                                  type="number"
                                  value={score}
                                  onChange={(e) => handleScoreChange(student.id, sub, e.target.value)}
                                  placeholder="0"
                                  className="bg-white border border-slate-300 text-slate-800 text-sm rounded-lg focus:ring-indigo-500 focus:border-indigo-500 p-2 w-24 font-bold text-center shadow-inner inline-block"
                                />
                              </td>
                            );
                          })
                        ) : (
                          <td className="px-6 py-4 text-center">
                            <input
                              type="number"
                              value={marksMap[`${student.id}_${finalSubject}`] || ''}
                              onChange={(e) => handleScoreChange(student.id, finalSubject, e.target.value)}
                              placeholder="0"
                              className="bg-white border border-slate-300 text-slate-800 text-sm rounded-lg focus:ring-indigo-500 focus:border-indigo-500 p-2 w-24 font-bold text-center shadow-inner inline-block"
                            />
                          </td>
                        )}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Master Gradebook Grid */}
        {activeTab === 'master' && students.length > 0 && hasSearched && (
          <div className="bg-white rounded-2xl shadow-xl border border-slate-200 overflow-hidden mt-8">
            <div className="p-6 border-b border-slate-200 bg-slate-50 flex justify-between items-center flex-wrap gap-4">
              <div>
                <h2 className="text-xl font-bold text-slate-800">Master Gradebook</h2>
                <p className="text-sm text-slate-500 mt-1">{grade} {section}</p>
              </div>
              
              <div className="flex items-center gap-2">
                <button 
                  onClick={() => downloadCSV('filtered')}
                  className="bg-indigo-100 hover:bg-indigo-200 text-indigo-700 font-bold py-2.5 px-5 rounded-xl transition-colors flex items-center gap-2 shadow-sm"
                  title="Export currently filtered view"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"></path></svg>
                  Export Filtered
                </button>
                <button 
                  onClick={() => downloadCSV('all')}
                  className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2.5 px-5 rounded-xl transition-colors flex items-center gap-2 shadow-sm"
                  title="Export all marks for this class"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path></svg>
                  Export All
                </button>
              </div>
            </div>
            
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50 text-slate-600 text-xs uppercase tracking-wider font-semibold border-b border-slate-200">
                    <th className="px-6 py-4 sticky left-0 bg-slate-50 z-10 border-r border-slate-200">Student Name</th>
                    {uniqueTests.length > 0 ? (
                      uniqueTests.map(test => {
                        const [cat, name, sub] = test.split(' | ');
                        return (
                          <th key={test} className="px-4 py-3 text-center border-r border-slate-200 min-w-[140px]">
                            <div className="text-[10px] font-bold text-indigo-500 uppercase">{cat}</div>
                            <div className="text-sm font-bold text-slate-700">{sub}</div>
                            <div className="text-xs font-medium text-slate-500 truncate" title={name}>{name}</div>
                          </th>
                        )
                      })
                    ) : (
                      <th className="px-4 py-4 text-center border-r border-slate-200 min-w-[120px]">No Tests Match Filters</th>
                    )}
                    {showMessagingButton && (
                      <th className="px-6 py-4 text-center sticky right-0 bg-slate-50 z-10 border-l border-slate-200 shadow-sm">Actions</th>
                    )}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {students.map((student) => (
                    <tr key={student.id} className="hover:bg-slate-50/50 transition-colors">
                      <td className="px-6 py-4 font-semibold text-slate-800 sticky left-0 bg-white z-10 border-r border-slate-200">
                        {student.firstName} {student.lastName}
                      </td>
                      {uniqueTests.length > 0 ? (
                        uniqueTests.map(test => {
                          const [cat, name, sub] = test.split(' | ');
                          // Use examCategory if present, otherwise default to "Custom" comparison
                          const mark = allMarks.find(m => 
                            m.studentId === student.id && 
                            m.examName === name && 
                            m.subject === sub &&
                            (m.examCategory || 'Custom') === cat
                          );
                          return (
                            <td key={test} className="px-4 py-4 text-center border-r border-slate-200 font-medium text-slate-700" title={mark?.syllabusCoverage ? `Syllabus: ${mark.syllabusCoverage}` : ''}>
                              {mark ? (
                                <span className="bg-indigo-50 text-indigo-700 px-2.5 py-1.5 rounded-md font-bold border border-indigo-100 shadow-sm">
                                  {mark.score}/{mark.maxScore}
                                </span>
                              ) : (
                                <span className="text-slate-300">-</span>
                              )}
                            </td>
                          );
                        })
                      ) : (
                        <td className="px-4 py-4 text-center border-r border-slate-200 text-slate-400 italic">N/A</td>
                      )}
                      
                      {showMessagingButton && (
                        <td className="px-6 py-4 text-center sticky right-0 bg-white z-10 border-l border-slate-200">
                          <button 
                            onClick={() => openMessagingModal(student.id)}
                            className="px-3 py-1.5 bg-emerald-100 hover:bg-emerald-200 text-emerald-700 text-xs font-bold rounded-lg transition-colors flex items-center justify-center mx-auto gap-1 shadow-sm"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"></path></svg>
                            Message
                          </button>
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

      </div>

      {/* Messaging Modal */}
      {messagingStudentId && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
          <div className="bg-white rounded-3xl shadow-2xl max-w-lg w-full overflow-hidden border border-slate-200">
            <div className="p-6 border-b border-slate-100 bg-slate-50 flex justify-between items-center">
              <h3 className="text-xl font-bold text-slate-800">Send Report to Parent</h3>
              <button onClick={() => setMessagingStudentId(null)} className="text-slate-400 hover:text-slate-600 transition-colors">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path></svg>
              </button>
            </div>
            
            <div className="p-6 space-y-4">
              {messagingStatus === 'success' ? (
                <div className="flex flex-col items-center justify-center py-6 text-center">
                  <div className="w-16 h-16 bg-emerald-100 text-emerald-500 rounded-full flex items-center justify-center mb-4">
                    <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path></svg>
                  </div>
                  <h4 className="text-lg font-bold text-slate-800">Report Sent!</h4>
                  <p className="text-slate-500 mt-1">The parent will be notified shortly.</p>
                </div>
              ) : (
                <>
                  <p className="text-sm font-semibold text-slate-700">The message below has been auto-generated based on your current Master Gradebook filters. You can edit it before sending:</p>
                  <textarea 
                    value={messageText}
                    onChange={(e) => setMessageText(e.target.value)}
                    placeholder="Type your message here..."
                    rows={8}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl focus:ring-emerald-500 focus:border-emerald-500 p-3 shadow-inner resize-y text-slate-800 font-medium"
                  ></textarea>
                  
                  {messagingStatus === 'error' && (
                    <p className="text-red-500 text-sm font-semibold">Failed to send report. Try again.</p>
                  )}
                  
                  <div className="flex justify-end gap-3 pt-2">
                    <button 
                      onClick={() => setMessagingStudentId(null)}
                      className="px-5 py-2.5 text-slate-600 font-semibold hover:bg-slate-100 rounded-xl transition-colors"
                    >
                      Cancel
                    </button>
                    <button 
                      onClick={handleSendMessage}
                      disabled={messagingStatus === 'sending' || !messageText}
                      className="px-5 py-2.5 bg-emerald-500 hover:bg-emerald-600 text-white font-bold rounded-xl shadow-md transition-all active:scale-95 disabled:opacity-50 flex items-center gap-2"
                    >
                      {messagingStatus === 'sending' ? 'Sending...' : 'Send Report'}
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}

    </main>
  );
}
