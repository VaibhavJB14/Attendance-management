'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

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

interface Student {
  id: string;
  firstName: string;
  lastName: string;
  rollNumber?: string;
  grade: string;
  section: string;
  roomNumber?: string;
}

export default function ManageRooms() {
  const router = useRouter();
  const [session, setSession] = useState<UserSession | null>(null);

  const [hostelName, setHostelName] = useState('Boys Hostel');
  const [rooms, setRooms] = useState<Room[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);

  // Unassigned Students State
  const [hostelStudents, setHostelStudents] = useState<Student[]>([]);
  const [selectedRoomForStudent, setSelectedRoomForStudent] = useState<Record<string, string>>({});
  const [assigningStudent, setAssigningStudent] = useState(false);

  // Room Management State
  const [newRoomNumber, setNewRoomNumber] = useState('');
  const [newRoomCapacity, setNewRoomCapacity] = useState('4');
  const [creatingRoom, setCreatingRoom] = useState(false);
  const [deletingRoomId, setDeletingRoomId] = useState<string | null>(null);
  const [selectedRoomNumber, setSelectedRoomNumber] = useState<string | null>(null);
  const [activeActionTab, setActiveActionTab] = useState<'addRoom' | 'addStudents'>('addRoom');

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
    if (!message) return;
    const timer = setTimeout(() => {
      setMessage(null);
    }, 4000);
    return () => clearTimeout(timer);
  }, [message]);

  useEffect(() => {
    if (!session) return;
    setSelectedRoomNumber(null);

    const fetchRooms = async () => {
      setLoading(true);
      try {
        const res = await fetch(`/api/rooms?hostelName=${encodeURIComponent(hostelName)}`, {
          headers: { 'x-tenant-id': session.tenantId }
        });
        const data = await res.json();
        if (res.ok) {
          setRooms(data.rooms);
        } else {
          setMessage({ type: 'error', text: data.error || 'Failed to fetch rooms' });
        }
      } catch (error) {
        console.error('Failed to fetch rooms', error);
      } finally {
        setLoading(false);
      }
    };

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

    fetchRooms();
    fetchHostelStudents();
  }, [session, hostelName]);

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
      setRooms(prev => prev.map(r => {
        if (r.roomNumber === targetRoom) {
          const newOccupancy = r.occupancy + 1;
          return { ...r, occupancy: newOccupancy, isFull: newOccupancy >= r.capacity };
        }
        return r;
      }));

    } catch (err: unknown) {
      setMessage({ type: 'error', text: err instanceof Error ? err.message : 'Unknown error' });
    } finally {
      setAssigningStudent(false);
    }
  };

  const handleUnassignStudent = async (studentId: string) => {
    if (!session) return;
    try {
      const res = await fetch(`/api/students/${studentId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'x-tenant-id': session.tenantId
        },
        body: JSON.stringify({
          isHosteler: true,
          hostelName: hostelName,
          roomNumber: null
        })
      });
      if (res.ok) {
        setHostelStudents(prev => prev.map(s => s.id === studentId ? { ...s, roomNumber: undefined } : s));
        if (selectedRoomNumber) {
          setRooms(prev => prev.map(r => {
            if (r.roomNumber === selectedRoomNumber) {
              const newOcc = Math.max(0, r.occupancy - 1);
              return { ...r, occupancy: newOcc, isFull: newOcc >= r.capacity };
            }
            return r;
          }));
        }
      }
    } catch (err) {
      console.error('Failed to unassign student', err);
    }
  };

  const handleCreateRoom = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!session) return;
    setCreatingRoom(true);
    setMessage(null);
    try {
      const res = await fetch('/api/rooms', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-tenant-id': session.tenantId
        },
        body: JSON.stringify({
          hostelName,
          roomNumber: newRoomNumber,
          capacity: newRoomCapacity
        })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to create room');

      setMessage({ type: 'success', text: `Room ${newRoomNumber} created successfully.` });
      setNewRoomNumber('');

      // Add the new room to state
      setRooms(prev => [...prev, {
        id: data.room.id,
        roomNumber: data.room.roomNumber,
        capacity: data.room.capacity,
        occupancy: 0,
        isFull: false
      }].sort((a, b) => a.roomNumber.localeCompare(b.roomNumber, undefined, { numeric: true })));

    } catch (err: unknown) {
      setMessage({ type: 'error', text: err instanceof Error ? err.message : 'Unknown error' });
    } finally {
      setCreatingRoom(false);
    }
  };

  const handleDeleteRoom = async (roomId: string, roomNumber: string) => {
    if (!session) return;
    if (!confirm(`Are you sure you want to delete Room ${roomNumber}? This cannot be undone.`)) return;

    setDeletingRoomId(roomId);
    setMessage(null);
    try {
      const res = await fetch(`/api/rooms?roomId=${roomId}`, {
        method: 'DELETE',
        headers: {
          'x-tenant-id': session.tenantId
        }
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to delete room');

      setMessage({ type: 'success', text: `Room ${roomNumber} deleted successfully.` });

      // Remove room from state
      setRooms(prev => prev.filter(r => r.id !== roomId));

    } catch (err: unknown) {
      setMessage({ type: 'error', text: err instanceof Error ? err.message : 'Unknown error' });
    } finally {
      setDeletingRoomId(null);
    }
  };

  if (!session) return null;

  return (
    <main className="pl-0 md:pl-8 pb-12 font-sans">
      <div className="max-w-6xl mx-auto space-y-8">

        {/* Header */}
        <div className="bg-white p-8 rounded-3xl shadow-xl border border-slate-200 relative overflow-hidden">
          <div className="absolute top-0 right-0 p-8 opacity-10 pointer-events-none">
            <svg className="w-48 h-48 text-amber-600" fill="currentColor" viewBox="0 0 24 24"><path d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" /></svg>
          </div>

          <div className="relative z-10 flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-6">
            <div>
              <h1 className="text-4xl font-extrabold text-slate-800 tracking-tight">
                Room Management
              </h1>
              <p className="mt-2 text-slate-500 text-lg">
                Add, configure, or delete rooms in your hostels.
              </p>
            </div>

            {/* Filter Controls */}
            <div className="w-full md:w-48">
              <select
                value={hostelName}
                onChange={(e) => setHostelName(e.target.value)}
                className="bg-slate-50 border border-slate-200 text-slate-700 text-sm rounded-xl focus:ring-amber-500 focus:border-amber-500 block w-full p-3 font-semibold shadow-sm"
              >
                <option value="Boys Hostel">Boys Hostel</option>
                <option value="Girls Hostel">Girls Hostel</option>
              </select>
            </div>
          </div>
        </div>

        {/* Feedback Message */}
        {message && (
          <div className={`p-4 rounded-xl text-sm font-semibold border shadow-sm ${message.type === 'success' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-red-50 text-red-700 border-red-200'
            }`}>
            {message.text}
          </div>
        )}

        {/* Action Toggle Buttons */}
        <div className="flex flex-wrap gap-3">
          <button
            onClick={() => setActiveActionTab('addRoom')}
            className={`px-6 py-3 rounded-2xl font-extrabold text-sm transition-all flex items-center gap-2 shadow-sm cursor-pointer ${
              activeActionTab === 'addRoom'
                ? 'bg-slate-800 text-white shadow-slate-300'
                : 'bg-white text-slate-700 hover:bg-slate-50 border border-slate-200'
            }`}
          >
            <span className="text-amber-400 font-black text-lg">+</span>
            Add New Room
          </button>

          <button
            onClick={() => setActiveActionTab('addStudents')}
            className={`px-6 py-3 rounded-2xl font-extrabold text-sm transition-all flex items-center gap-2 shadow-sm cursor-pointer ${
              activeActionTab === 'addStudents'
                ? 'bg-indigo-600 text-white shadow-indigo-200'
                : 'bg-white text-slate-700 hover:bg-slate-50 border border-slate-200'
            }`}
          >
            <svg className="w-5 h-5 text-indigo-200" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z"></path></svg>
            Add Students
          </button>
        </div>

        {/* Add New Room Tab */}
        {activeActionTab === 'addRoom' && (
          <div className="bg-white p-8 rounded-3xl shadow-xl border border-slate-200 relative overflow-hidden">
            <div className="mb-6 border-b border-slate-100 pb-4">
              <h2 className="text-2xl font-extrabold text-slate-800 tracking-tight flex items-center gap-2">
                <span className="text-amber-500">+</span> Add New Room
              </h2>
              <p className="text-sm text-slate-500 mt-1">Define a new room&apos;s number and capacity for the {hostelName}.</p>
            </div>

            <form onSubmit={handleCreateRoom} className="flex flex-col sm:flex-row gap-4 items-end">
              <div className="w-full sm:w-1/3">
                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">Room Number</label>
                <input required type="text" value={newRoomNumber} onChange={e => setNewRoomNumber(e.target.value)} className="w-full bg-slate-50 border border-slate-200 p-3 rounded-xl focus:ring-amber-500 focus:border-amber-500 font-medium" placeholder="e.g. 101" />
              </div>
              <div className="w-full sm:w-1/4">
                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">Capacity</label>
                <input required type="number" min="1" max="20" value={newRoomCapacity} onChange={e => setNewRoomCapacity(e.target.value)} className="w-full bg-slate-50 border border-slate-200 p-3 rounded-xl focus:ring-amber-500 focus:border-amber-500 font-medium" placeholder="e.g. 4" />
              </div>
              <button
                type="submit"
                disabled={creatingRoom || !newRoomNumber}
                className="bg-slate-800 text-white px-8 py-3 rounded-xl font-bold hover:bg-slate-900 transition-all active:scale-95 shadow-md disabled:opacity-50 w-full sm:w-auto"
              >
                {creatingRoom ? 'Adding...' : 'Add Room'}
              </button>
            </form>
          </div>
        )}

        {/* Add Students Tab */}
        {activeActionTab === 'addStudents' && (
          <div className="bg-white p-8 rounded-3xl shadow-xl border border-slate-200 relative overflow-hidden">
            <div className="relative z-10 mb-6 border-b border-slate-100 pb-4">
              <h2 className="text-2xl font-extrabold text-slate-800 tracking-tight flex items-center gap-2">
                <span className="w-3 h-3 rounded-full bg-indigo-500 animate-pulse"></span>
                Add Students to Rooms
              </h2>
              <p className="text-sm text-slate-500 mt-1">Assign unassigned hostel students to available rooms in {hostelName}.</p>
            </div>

            {hostelStudents.filter(s => !s.roomNumber).length === 0 ? (
              <div className="p-8 text-center text-slate-500 font-semibold bg-slate-50 rounded-2xl border border-slate-200">
                All enrolled students for {hostelName} are currently assigned to rooms.
              </div>
            ) : (
              <ul className="divide-y divide-slate-100 relative z-10">
                {hostelStudents.filter(s => !s.roomNumber).map(student => (
                  <li key={student.id} className="py-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div>
                      <p className="font-bold text-slate-800 text-lg">{student.firstName} {student.lastName}</p>
                      <p className="text-sm font-medium text-indigo-600 mt-0.5">
                        {student.rollNumber ? `Roll No: ${student.rollNumber} | ` : ''}{student.grade} - {student.section}
                      </p>
                    </div>
                    <div className="flex gap-3 w-full sm:w-auto">
                      <select
                        value={selectedRoomForStudent[student.id] || ''}
                        onChange={e => setSelectedRoomForStudent(prev => ({ ...prev, [student.id]: e.target.value }))}
                        className="bg-slate-50 border border-slate-200 p-2.5 rounded-xl focus:ring-indigo-500 focus:border-indigo-500 text-slate-700 font-medium w-full sm:w-40"
                      >
                        <option value="">-- Room --</option>
                        {rooms.map(room => (
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
            )}
          </div>
        )}

        {/* Rooms List */}
        <div className="bg-white rounded-3xl shadow-xl border border-slate-200 overflow-hidden">
          <div className="p-6 border-b border-slate-200 bg-slate-50">
            <h2 className="text-xl font-bold text-slate-800">Existing Rooms in {hostelName}</h2>
          </div>

          {loading ? (
            <div className="p-12 text-center text-slate-500 font-semibold animate-pulse">Loading rooms...</div>
          ) : rooms.length === 0 ? (
            <div className="p-12 text-center text-slate-500 font-medium">No rooms have been added to this hostel yet.</div>
          ) : (
            <>
              <div className="p-8 flex flex-wrap gap-4">
                {rooms.map(room => {
                  const isSelected = selectedRoomNumber === room.roomNumber;
                  return (
                    <div
                      key={room.id}
                      onClick={() => setSelectedRoomNumber(prev => prev === room.roomNumber ? null : room.roomNumber)}
                      className={`group relative border-2 rounded-3xl p-4 w-28 h-24 flex flex-col items-center justify-center transition-all cursor-pointer shadow-sm hover:shadow-md ${
                        isSelected
                          ? 'bg-indigo-50 border-indigo-600 ring-2 ring-indigo-500/20'
                          : 'bg-white border-slate-400 hover:border-indigo-600'
                      }`}
                    >
                      <span className={`text-3xl font-extrabold tracking-tight ${isSelected ? 'text-indigo-600' : 'text-slate-800 group-hover:text-indigo-600'}`}>
                        {room.roomNumber}
                      </span>
                      <span className={`text-[11px] font-bold mt-1 ${room.isFull ? 'text-rose-500' : (isSelected ? 'text-indigo-600' : 'text-slate-500')}`}>
                        {room.occupancy}/{room.capacity} seats
                      </span>

                      {/* Delete Badge */}
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteRoom(room.id, room.roomNumber);
                        }}
                        disabled={deletingRoomId === room.id}
                        className="absolute -top-2 -right-2 bg-rose-500 text-white rounded-full p-1 shadow-md opacity-0 group-hover:opacity-100 transition-opacity hover:bg-rose-600"
                        title={`Delete Room ${room.roomNumber}`}
                      >
                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M6 18L18 6M6 6l12 12"></path></svg>
                      </button>
                    </div>
                  );
                })}
              </div>

              {/* Selected Room Students Roster */}
              {selectedRoomNumber && (
                <div className="border-t border-slate-200 p-8 bg-slate-50/70">
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <h3 className="text-xl font-extrabold text-slate-800 flex items-center gap-2">
                        <span className="w-2.5 h-2.5 rounded-full bg-indigo-600"></span>
                        Students in Room {selectedRoomNumber}
                      </h3>
                      <p className="text-xs text-slate-500 mt-1">
                        {hostelStudents.filter(s => s.roomNumber === selectedRoomNumber).length} student(s) currently assigned
                      </p>
                    </div>
                    <button
                      onClick={() => setSelectedRoomNumber(null)}
                      className="text-xs font-bold text-slate-600 hover:text-slate-900 bg-white border border-slate-200 hover:border-slate-300 px-3.5 py-2 rounded-xl shadow-xs transition-colors"
                    >
                      Close List
                    </button>
                  </div>

                  {hostelStudents.filter(s => s.roomNumber === selectedRoomNumber).length === 0 ? (
                    <div className="p-8 text-center text-slate-500 font-semibold bg-white rounded-2xl border border-slate-200">
                      No students are currently assigned to Room {selectedRoomNumber}.
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                      {hostelStudents.filter(s => s.roomNumber === selectedRoomNumber).map(student => (
                        <div key={student.id} className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex items-center justify-between">
                          <div>
                            <p className="font-bold text-slate-800">{student.firstName} {student.lastName}</p>
                            <p className="text-xs font-semibold text-indigo-600 mt-0.5">
                              {student.rollNumber ? `Roll No: ${student.rollNumber} | ` : ''}{student.grade} - {student.section}
                            </p>
                          </div>
                          <button
                            onClick={() => handleUnassignStudent(student.id)}
                            className="text-xs font-bold text-rose-500 hover:text-rose-700 bg-rose-50 hover:bg-rose-100 px-2.5 py-1.5 rounded-lg transition-colors"
                            title="Remove student from room"
                          >
                            Unassign
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </main>
  );
}
