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

export default function ManageRooms() {
  const router = useRouter();
  const [session, setSession] = useState<UserSession | null>(null);
  
  const [hostelName, setHostelName] = useState('Boys Hostel');
  const [rooms, setRooms] = useState<Room[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState<{type: 'success' | 'error', text: string} | null>(null);

  // Room Management State
  const [newRoomNumber, setNewRoomNumber] = useState('');
  const [newRoomCapacity, setNewRoomCapacity] = useState('4');
  const [creatingRoom, setCreatingRoom] = useState(false);
  const [deletingRoomId, setDeletingRoomId] = useState<string | null>(null);

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
    if (!session) return;
    
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
    fetchRooms();
  }, [session, hostelName]);

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
      }].sort((a, b) => a.roomNumber.localeCompare(b.roomNumber, undefined, {numeric: true})));

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
    <main className="min-h-screen bg-slate-50 text-slate-900 p-8 font-sans">
      <div className="max-w-6xl mx-auto space-y-8 mt-10">
        
        {/* Navigation Header */}
        <div className="flex items-center justify-between">
          <Link href="/" className="flex items-center text-indigo-600 font-semibold hover:text-indigo-800 transition-colors">
            <svg className="w-5 h-5 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7"></path></svg>
            Back to Dashboard
          </Link>
          <div className="px-4 py-1.5 bg-amber-100 text-amber-800 rounded-full text-xs font-bold uppercase tracking-wider border border-amber-200 shadow-sm flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-amber-500 animate-pulse"></div>
            Manage Rooms
          </div>
        </div>

        {/* Header */}
        <div className="bg-white p-8 rounded-3xl shadow-xl border border-slate-200 relative overflow-hidden">
          <div className="absolute top-0 right-0 p-8 opacity-10 pointer-events-none">
             <svg className="w-48 h-48 text-amber-600" fill="currentColor" viewBox="0 0 24 24"><path d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"/></svg>
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
          <div className={`p-4 rounded-xl text-sm font-semibold border shadow-sm ${
            message.type === 'success' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-red-50 text-red-700 border-red-200'
          }`}>
            {message.text}
          </div>
        )}

        {/* Create Room Form */}
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
            <ul className="divide-y divide-slate-100">
              {rooms.map(room => (
                <li key={room.id} className="p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-slate-50 transition-colors">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-xl bg-indigo-100 text-indigo-700 flex items-center justify-center font-bold text-lg">
                      {room.roomNumber}
                    </div>
                    <div>
                      <p className="font-bold text-slate-800 text-lg">Room {room.roomNumber}</p>
                      <p className={`text-sm font-medium mt-0.5 ${room.isFull ? 'text-rose-500' : 'text-slate-500'}`}>
                        {room.occupancy} / {room.capacity} students ({room.isFull ? 'Full' : `${room.capacity - room.occupancy} seats left`})
                      </p>
                    </div>
                  </div>
                  <div>
                    <button
                      onClick={() => handleDeleteRoom(room.id, room.roomNumber)}
                      disabled={deletingRoomId === room.id}
                      className="text-rose-600 bg-rose-50 hover:bg-rose-100 px-4 py-2 rounded-lg font-bold text-sm transition-colors disabled:opacity-50 flex items-center gap-2 border border-rose-200 shadow-sm"
                    >
                      {deletingRoomId === room.id ? 'Deleting...' : (
                        <>
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path></svg>
                          Delete
                        </>
                      )}
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </main>
  );
}
