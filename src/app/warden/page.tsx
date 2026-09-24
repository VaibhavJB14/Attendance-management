'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

interface Student {
  id: string;
  firstName: string;
  lastName: string;
  rollNumber?: string;
  grade: string;
  section: string;
  roomNumber?: string;
}

interface Room {
  id: string;
  roomNumber: string;
  capacity: number;
  occupancy: number;
  isFull: boolean;
}

interface UserSession {
  id: string;
  email: string;
  role: string;
  tenantId: string;
}

export default function WardenAttendance() {
  const router = useRouter();
  const [session, setSession] = useState<UserSession | null>(null);
  
  const [hostelName, setHostelName] = useState('');
  const [roomNumber, setRoomNumber] = useState('');
  
  const [students, setStudents] = useState<Student[]>([]);
  const [attendance, setAttendance] = useState<Record<string, string>>({}); 
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const [sessionName, setSessionName] = useState('');
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [message, setMessage] = useState<{type: 'success' | 'error', text: string} | null>(null);
  const [availableRooms, setAvailableRooms] = useState<Room[]>([]);
  const [hostelStudents, setHostelStudents] = useState<Student[]>([]);

  // Unassigned Students Assignment State
  const [selectedRoomForStudent, setSelectedRoomForStudent] = useState<Record<string, string>>({});
  const [assigningStudent, setAssigningStudent] = useState(false);

  const searchRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
        setIsSearchOpen(false);
      }
    }
    
    if (isSearchOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isSearchOpen]);

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
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setSession(user);
  }, [router]);

  useEffect(() => {
    if (!session || !hostelName) return;
    
    // Fetch dynamic rooms and their occupancies
    const fetchRooms = async () => {
      try {
        const res = await fetch(`/api/rooms?hostelName=${encodeURIComponent(hostelName)}`, {
          headers: { 'x-tenant-id': session.tenantId }
        });
        const data = await res.json();
        if (res.ok) {
          setAvailableRooms(data.rooms);
        }
      } catch (error) {
        console.error('Failed to fetch rooms', error);
      }
    };
    fetchRooms();

    // Fetch all students in this hostel to populate the assignment dropdown
    const fetchHostelStudents = async () => {
      try {
        const res = await fetch(`/api/students?isHosteler=true&hostelName=${encodeURIComponent(hostelName)}`, {
          headers: { 'x-tenant-id': session.tenantId }
        });
        const data = await res.json();
        if (res.ok) {
          setHostelStudents(data.students);
        }
      } catch (error) {
        console.error('Failed to fetch hostel students', error);
      }
    };
    fetchHostelStudents();
  }, [session, hostelName]);

  const loadStudents = async (targetRoom?: string) => {
    const roomToLoad = targetRoom || roomNumber;
    if (!session || !roomToLoad) return;
    setRoomNumber(roomToLoad); // Ensure state is updated if called from quick link
    setLoading(true);
    setMessage(null);
    setHasSearched(true);
    try {
      const res = await fetch(`/api/students?isHosteler=true&hostelName=${encodeURIComponent(hostelName)}&roomNumber=${encodeURIComponent(roomToLoad)}`, {
        headers: {
          'x-tenant-id': session.tenantId,
        }
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to load students');
      
      setStudents(data.students);
      
      const initialMap: Record<string, string> = {};
      data.students.forEach((student: any) => {
        initialMap[student.id] = 'PRESENT';
      });
      setAttendance(initialMap);
      setIsSearchOpen(false);

    } catch (error: unknown) {
      setMessage({ type: 'error', text: error instanceof Error ? error.message : 'Unknown error' });
    } finally {
      setLoading(false);
    }
  };

  const handleStatusChange = (studentId: string, status: string) => {
    setAttendance(prev => ({
      ...prev,
      [studentId]: status
    }));
  };

  const handleSubmit = async () => {
    if (!session) return;
    if (Object.keys(attendance).length !== students.length) {
      setMessage({ type: 'error', text: 'Please mark attendance for all students in the room.' });
      return;
    }

    setSaving(true);
    setMessage(null);

    try {
      const records = Object.entries(attendance).map(([studentId, status]) => ({
        studentId,
        status
      }));

      const res = await fetch('/api/attendance', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-tenant-id': session.tenantId,
          'x-user-id': session.id
        },
        body: JSON.stringify({
          date: new Date().toISOString(),
          sessionName,
          records
        })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to save attendance');

      setMessage({ type: 'success', text: `Successfully saved ${sessionName.toLowerCase()} attendance for ${records.length} students.` });
      
    } catch (error: unknown) {
      setMessage({ type: 'error', text: error instanceof Error ? error.message : 'Unknown error' });
    } finally {
      setSaving(false);
    }
  };

  const handleAssignFromList = async (studentId: string) => {
    if (!session) return;
    const targetRoom = selectedRoomForStudent[studentId];
    if (!targetRoom) return;

    setAssigningStudent(true);
    setMessage(null);
    try {
      const studentToAssign = hostelStudents.find(s => s.id === studentId);
      if (!studentToAssign) throw new Error("Student not found.");

      const assignRes = await fetch(`/api/students/${studentToAssign.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'x-tenant-id': session.tenantId
        },
        body: JSON.stringify({
          isHosteler: true,
          hostelName: hostelName,
          roomNumber: targetRoom
        })
      });

      if (!assignRes.ok) throw new Error('Failed to assign student');
      
      setMessage({ type: 'success', text: `Successfully assigned ${studentToAssign.firstName} to Room ${targetRoom}.` });
      
      // Update local state to remove from unassigned list
      setHostelStudents(prev => prev.map(s => s.id === studentId ? { ...s, roomNumber: targetRoom } : s));
      
      // Update room occupancy
      setAvailableRooms(prev => prev.map(r => {
        if (r.roomNumber === targetRoom) {
          const newOccupancy = r.occupancy + 1;
          return { ...r, occupancy: newOccupancy, isFull: newOccupancy >= r.capacity };
        }
        return r;
      }));

      // If we are currently viewing the target room's roster, refresh it
      if (roomNumber === targetRoom) {
        loadStudents(targetRoom);
      }
      
    } catch (err: unknown) {
      setMessage({ type: 'error', text: err instanceof Error ? err.message : 'Unknown error' });
    } finally {
      setAssigningStudent(false);
    }
  };

  if (!session) return null;

  return (
    <main className="min-h-screen bg-slate-50 text-slate-900 p-8 font-sans">
      <div className="max-w-6xl mx-auto space-y-8 mt-10">
        
        {/* Navigation Header */}
        <div className="flex items-center justify-between">
          <Link href="/" className="flex items-center text-indigo-600 font-semibold hover:text-indigo-800 transition-colors">
            <svg className="w-5 h-5 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7"></path></svg>
            Back to Profile
          </Link>
          <div className="px-4 py-1.5 bg-indigo-100 text-indigo-800 rounded-full text-xs font-bold uppercase tracking-wider border border-indigo-200 shadow-sm flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-indigo-500 animate-pulse"></div>
            Warden Mode
          </div>
        </div>

        {/* Header */}
        <div className="bg-white p-8 rounded-3xl shadow-xl border border-slate-200 relative overflow-hidden">
          <div className="absolute top-0 right-0 p-8 opacity-10 pointer-events-none">
             <svg className="w-48 h-48 text-indigo-600" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 14H9v-2h2v2zm0-4H9V7h2v5z"/></svg>
          </div>
          
          <div className="relative z-10 flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-6">
            <div>
              <h1 className="text-4xl font-extrabold text-slate-800 tracking-tight">
                Hostel Attendance
              </h1>
              <p className="mt-2 text-slate-500 text-lg">
                Mark morning or night attendance for your designated hostel and room.
              </p>
            </div>
            
            {/* Filter Controls */}
            <div className="flex flex-col sm:flex-row gap-3 w-full md:w-auto">
              <select 
                value={hostelName}
                onChange={(e) => {
                  setHostelName(e.target.value); 
                  setAvailableRooms([]); 
                  setHasSearched(false);
                  setStudents([]);
                  setRoomNumber('');
                }}
                className="bg-slate-50 border border-slate-200 text-slate-700 text-sm rounded-xl focus:ring-indigo-500 focus:border-indigo-500 block w-full p-3 font-semibold shadow-sm"
              >
                <option value="" disabled>Select Hostel</option>
                <option value="Boys Hostel">Boys Hostel</option>
                <option value="Girls Hostel">Girls Hostel</option>
              </select>

              <select 
                value={sessionName}
                onChange={(e) => setSessionName(e.target.value)}
                className="bg-slate-50 border border-slate-200 text-slate-700 text-sm rounded-xl focus:ring-indigo-500 focus:border-indigo-500 block w-full p-3 font-semibold shadow-sm"
              >
                <option value="" disabled>Select Session</option>
                <option value="Hostel Morning">Morning Session</option>
                <option value="Hostel Night">Night Session</option>
              </select>
              
              {!isSearchOpen ? (
                <button
                  onClick={() => setIsSearchOpen(true)}
                  className="bg-white border border-slate-200 hover:bg-slate-50 hover:border-indigo-300 text-indigo-600 p-3 rounded-xl shadow-sm transition-colors flex items-center justify-center w-full md:w-auto"
                  title="Search Room"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path></svg>
                </button>
              ) : (
                <div ref={searchRef} className="flex w-full md:w-auto flex-1 min-w-[150px] animate-in fade-in slide-in-from-right-4 duration-300">
                  <select
                    value={roomNumber} 
                    onChange={e => { setRoomNumber(e.target.value); setHasSearched(false); }} 
                    className="bg-slate-50 border border-slate-200 border-r-0 text-slate-700 text-sm rounded-l-xl focus:ring-indigo-500 focus:border-indigo-500 block w-full min-w-[100px] p-3 font-semibold shadow-sm"
                    autoFocus
                  >
                    <option value="" disabled>Room</option>
                    {availableRooms.map(room => (
                      <option key={room.id} value={room.roomNumber}>{room.roomNumber}</option>
                    ))}
                  </select>
                  
                  <button 
                    onClick={() => loadStudents()}
                    disabled={loading || !roomNumber || !sessionName}
                    className="bg-indigo-400 hover:bg-indigo-500 text-white font-bold py-3 px-4 sm:px-6 shadow-md transition-colors whitespace-nowrap active:scale-95 disabled:opacity-50"
                  >
                    {loading ? '...' : 'Fetch'}
                  </button>
                  <button
                    onClick={() => { setIsSearchOpen(false); setRoomNumber(''); }}
                    className="bg-slate-100 hover:bg-slate-200 border border-l-0 border-slate-200 text-slate-500 p-3 rounded-r-xl shadow-md transition-colors active:scale-95"
                    title="Close Search"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path></svg>
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Quick Room Links */}
          {availableRooms.length > 0 && (
            <div className="relative z-10 pt-4 border-t border-slate-100 mt-6">
              <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">Available Rooms in {hostelName}</p>
              <div className="flex flex-wrap gap-3">
                {availableRooms.map(room => (
                  <button 
                    key={room.id}
                    onClick={() => loadStudents(room.roomNumber)}
                    className={`px-4 py-2 rounded-xl text-sm font-bold border shadow-sm transition-all flex flex-col items-start ${room.roomNumber === roomNumber && hasSearched ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-white text-slate-600 border-slate-200 hover:border-indigo-300 hover:text-indigo-600'}`}
                  >
                    <span>Room {room.roomNumber}</span>
                    <span className={`text-[10px] uppercase tracking-wider mt-0.5 ${room.roomNumber === roomNumber && hasSearched ? 'text-indigo-200' : (room.isFull ? 'text-rose-500' : 'text-slate-400')}`}>
                      {room.isFull ? 'Full' : `${room.occupancy}/${room.capacity} Seats`}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Unassigned Students Section */}
        {hostelStudents.filter(s => !s.roomNumber).length > 0 && (
          <div className="bg-white p-8 rounded-3xl shadow-xl border border-slate-200 mt-8 relative overflow-hidden">
            <div className="absolute top-0 right-0 p-8 opacity-5 pointer-events-none">
              <svg className="w-48 h-48 text-amber-500" fill="currentColor" viewBox="0 0 24 24"><path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/></svg>
            </div>
            
            <div className="relative z-10 mb-6 border-b border-slate-100 pb-4">
              <h2 className="text-2xl font-extrabold text-slate-800 tracking-tight flex items-center gap-2">
                <span className="w-3 h-3 rounded-full bg-amber-500 animate-pulse"></span>
                New Students
              </h2>
              <p className="text-sm text-slate-500 mt-1">These students have been enrolled into the {hostelName} but are not yet assigned a room.</p>
            </div>
            
            <ul className="divide-y divide-slate-100 relative z-10">
              {hostelStudents.filter(s => !s.roomNumber).map(student => (
                <li key={student.id} className="py-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div>
                    <p className="font-bold text-slate-800 text-lg">{student.firstName} {student.lastName}</p>
                    <p className="text-sm font-medium text-amber-600 mt-0.5">
                      {student.rollNumber ? `Roll No: ${student.rollNumber} | ` : ''}{student.grade} - {student.section}
                    </p>
                  </div>
                  <div className="flex gap-3 w-full sm:w-auto">
                    <select
                      value={selectedRoomForStudent[student.id] || ''}
                      onChange={e => setSelectedRoomForStudent(prev => ({...prev, [student.id]: e.target.value}))}
                      className="bg-slate-50 border border-slate-200 p-2.5 rounded-xl focus:ring-amber-500 focus:border-amber-500 text-slate-700 font-medium w-full sm:w-40"
                    >
                      <option value="">-- Room --</option>
                      {availableRooms.map(room => (
                        <option key={room.id} value={room.roomNumber} disabled={room.isFull}>
                          {room.roomNumber} {room.isFull ? '(Full)' : `(${room.capacity - room.occupancy} seats left)`}
                        </option>
                      ))}
                    </select>
                    <button
                      onClick={() => handleAssignFromList(student.id)}
                      disabled={assigningStudent || !selectedRoomForStudent[student.id]}
                      className="bg-indigo-600 text-white px-5 py-2.5 rounded-xl font-bold hover:bg-indigo-700 transition-all active:scale-95 shadow-sm disabled:opacity-50 whitespace-nowrap"
                    >
                      Assign
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Feedback Message */}
        {message && (
          <div className={`p-4 rounded-xl text-sm font-semibold border shadow-sm ${
            message.type === 'success' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-red-50 text-red-700 border-red-200'
          }`}>
            {message.text}
          </div>
        )}

        {/* Invalid Room State */}
        {hasSearched && students.length === 0 && !loading && !message && (
          <div className="bg-white p-12 rounded-2xl shadow-md border border-slate-200 text-center flex flex-col items-center">
            <div className="w-16 h-16 bg-slate-100 text-slate-400 rounded-full flex items-center justify-center mb-4">
              <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
            </div>
            <h2 className="text-xl font-bold text-slate-800">Room is Empty</h2>
            <p className="text-slate-500 mt-2 max-w-sm mb-6">No students are currently assigned to Room {roomNumber} at the {hostelName}. You can assign a student below.</p>
          </div>
        )}



        {/* Attendance Roster */}
        {students.length > 0 && (
          <div className="bg-white rounded-2xl shadow-xl border border-slate-200 overflow-hidden mt-8">
            <div className="p-6 border-b border-slate-200 bg-slate-50 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
              <div>
                <h2 className="text-xl font-bold text-slate-800">Room {roomNumber} Roster</h2>
                <p className="text-sm text-slate-500 mt-1">{new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</p>
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
                    Submit Attendance
                  </>
                )}
              </button>
            </div>
            
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50 text-slate-600 text-xs uppercase tracking-wider font-semibold border-b border-slate-200">
                    <th className="px-6 py-4">Student Name</th>
                    <th className="px-6 py-4">Roll No.</th>
                    <th className="px-6 py-4">Class</th>
                    <th className="px-6 py-4 text-right">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {students.map((student) => {
                    const status = attendance[student.id];
                    
                    return (
                      <tr key={student.id} className="hover:bg-slate-50/50 transition-colors">
                        <td className="px-6 py-4 font-semibold text-slate-800">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full bg-slate-100 text-slate-600 flex items-center justify-center text-sm font-bold border border-slate-200">
                              {student.firstName[0]}
                            </div>
                            {student.firstName} {student.lastName}
                          </div>
                        </td>
                        <td className="px-6 py-4 font-medium text-slate-500">{student.rollNumber || '-'}</td>
                        <td className="px-6 py-4 font-medium text-slate-600">{student.grade} - {student.section}</td>
                        <td className="px-6 py-4 text-right">
                          <div className="flex justify-end">
                            <button
                              onClick={() => handleStatusChange(student.id, status === 'PRESENT' ? 'ABSENT' : 'PRESENT')}
                              className={`px-6 py-2 rounded-xl font-bold text-xs tracking-widest uppercase transition-all border-2 w-28 ${
                                status === 'PRESENT' 
                                  ? 'bg-emerald-500 border-emerald-500 text-white shadow-md' 
                                  : status === 'ABSENT'
                                  ? 'bg-rose-500 border-rose-500 text-white shadow-md'
                                  : 'bg-white border-slate-200 text-slate-400 hover:border-slate-300'
                              }`}
                            >
                              {status || 'PRESENT'}
                            </button>
                          </div>
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
    </main>
  );
}
