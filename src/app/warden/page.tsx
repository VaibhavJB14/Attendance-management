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
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);
  const [availableRooms, setAvailableRooms] = useState<Room[]>([]);

  const searchRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!message) return;
    const timer = setTimeout(() => {
      setMessage(null);
    }, 4000);
    return () => clearTimeout(timer);
  }, [message]);

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

  const currentHour = new Date().getHours();
  let isWardenSessionActive = true;
  let wardenSessionError: string | null = null;

  if (sessionName === "Hostel Morning") {
    if (currentHour < 5 || currentHour >= 13) {
      isWardenSessionActive = false;
      wardenSessionError = "Hostel Morning attendance cannot be taken at night or during evening hours (after 1:00 PM).";
    }
  } else if (sessionName === "Hostel Night") {
    if (currentHour >= 5 && currentHour < 18) {
      isWardenSessionActive = false;
      wardenSessionError = "Hostel Night attendance cannot be taken in the morning or afternoon (allowed only between 6:00 PM and 4:00 AM).";
    }
  }

  return (
    <main className="pl-0 md:pl-8 pb-12 font-sans">
      <div className="max-w-6xl mx-auto space-y-8">

        {/* Header */}
        <div className="bg-white p-8 rounded-3xl shadow-xl border border-slate-200 relative overflow-hidden">
          <div className="absolute top-0 right-0 p-8 opacity-10 pointer-events-none">
            <svg className="w-48 h-48 text-indigo-600" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 14H9v-2h2v2zm0-4H9V7h2v5z" /></svg>
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
                <option value="Hostel Morning">Morning Session (5 AM - 1 PM)</option>
                <option value="Hostel Night">Night Session (6 PM - 4 AM)</option>
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
              <div className="flex flex-wrap gap-4">
                {availableRooms.map(room => (
                  <button
                    key={room.id}
                    onClick={() => loadStudents(room.roomNumber)}
                    className={`group relative rounded-3xl p-3 w-28 h-24 flex flex-col items-center justify-center transition-all border-2 shadow-sm hover:shadow-md ${room.roomNumber === roomNumber && hasSearched ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-white text-slate-800 border-slate-400 hover:border-indigo-600 hover:text-indigo-600'}`}
                  >
                    <span className="text-3xl font-extrabold tracking-tight">{room.roomNumber}</span>
                    <span className={`text-[11px] font-bold mt-1 uppercase tracking-wider ${room.roomNumber === roomNumber && hasSearched ? 'text-indigo-100' : (room.isFull ? 'text-rose-500' : 'text-slate-500')}`}>
                      {room.isFull ? 'Full' : `${room.occupancy}/${room.capacity} seats`}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Attendance Overview Progress Section (Hostels Only) */}
        <div className="bg-white p-6 sm:p-7 rounded-3xl border border-slate-200 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-indigo-50 border border-indigo-100 rounded-full text-xs font-bold text-indigo-700 mb-1">
                <span className="w-2 h-2 rounded-full bg-indigo-600 animate-pulse"></span>
                Hostel Roll-Call Statistics Only
              </div>
              <h2 className="text-xl font-extrabold text-slate-900 tracking-tight">Hostel Attendance Overview</h2>
            </div>
            <span className="text-xs font-extrabold text-slate-500 bg-slate-100 px-3 py-1.5 rounded-xl border border-slate-200">
              {hostelName || 'All Hostels'} (Hostel Residents Only)
            </span>
          </div>

          {/* Full width ratio bar matching reference screenshot */}
          <div className="w-full h-9 rounded-2xl bg-slate-100 overflow-hidden flex items-center justify-center relative font-bold text-xs shadow-inner">
            <div className="bg-emerald-500 h-full flex items-center justify-center text-white font-extrabold transition-all duration-500" style={{ width: '34%' }}>
              34%
            </div>
            <div className="bg-rose-500 h-full flex items-center justify-center text-white font-extrabold transition-all duration-500" style={{ width: '5%' }}>
              5%
            </div>
            <div className="bg-slate-200/90 h-full flex items-center justify-center text-slate-700 font-semibold transition-all duration-500" style={{ width: '61%' }}>
              61%
            </div>
          </div>

          {/* Legend Row matching reference screenshot */}
          <div className="flex flex-wrap items-center justify-between text-xs font-bold pt-1">
            <div className="flex items-center gap-6">
              <span className="flex items-center gap-2 text-emerald-600 font-extrabold">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500"></span>
                Present: 14 Hostelers
              </span>
              <span className="flex items-center gap-2 text-slate-400 font-semibold">
                <span className="w-2.5 h-2.5 rounded-full bg-slate-300"></span>
                Not Recorded: 25 Hostelers
              </span>
            </div>
            <span className="flex items-center gap-2 text-rose-600 font-extrabold">
              <span className="w-2.5 h-2.5 rounded-full bg-rose-500"></span>
              Absent: 2 Hostelers
            </span>
          </div>
        </div>



        {/* Feedback Message */}
        {message && (
          <div className={`p-4 rounded-xl text-sm font-semibold border shadow-sm ${message.type === 'success' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-red-50 text-red-700 border-red-200'
            }`}>
            {message.text}
          </div>
        )}

        {/* Warden Session Time Restriction Warning */}
        {!isWardenSessionActive && sessionName && (
          <div className="p-4 bg-rose-50 text-rose-700 border border-rose-200 rounded-xl text-sm font-bold flex items-center gap-2 shadow-xs">
            <svg className="w-5 h-5 text-rose-600 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span>{wardenSessionError}</span>
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
                disabled={saving || !isWardenSessionActive}
                className="bg-emerald-500 hover:bg-emerald-600 disabled:bg-slate-300 disabled:cursor-not-allowed text-white font-bold py-2.5 px-6 rounded-xl shadow-md transition-all active:scale-95 flex items-center gap-2"
              >
                {saving ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    Saving...
                  </>
                ) : (
                  <>
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path></svg>
                    {!isWardenSessionActive ? 'Window Closed' : 'Submit Attendance'}
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
                              disabled={saving || !isWardenSessionActive}
                              onClick={() => handleStatusChange(student.id, status === 'PRESENT' ? 'ABSENT' : 'PRESENT')}
                              className={`px-6 py-2 rounded-xl font-bold text-xs tracking-widest uppercase transition-all border-2 w-28 ${status === 'PRESENT'
                                ? 'bg-emerald-500 border-emerald-500 text-white shadow-md'
                                : status === 'ABSENT'
                                  ? 'bg-rose-500 border-rose-500 text-white shadow-md'
                                  : (!isWardenSessionActive) ? 'bg-slate-100 border-slate-200 text-slate-400 cursor-not-allowed opacity-60' : 'bg-white border-slate-200 text-slate-400 hover:border-slate-300'
                                }`}
                            >
                              {status === 'ABSENT' ? 'A' : 'P'}
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
