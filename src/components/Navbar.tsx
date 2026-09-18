'use client';

import { useState, useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';

interface UserSession {
  id: string;
  email: string;
  role: string;
  tenantId: string;
  tenantName: string;
  plan: string;
}

export default function Navbar() {
  const router = useRouter();
  const pathname = usePathname();
  const [session, setSession] = useState<UserSession | null>(null);

  useEffect(() => {
    // Only check localStorage if we're not on the login page
    if (pathname === '/login') return;
    
    const stored = localStorage.getItem('session');
    if (stored) {
      setSession(JSON.parse(stored));
    }
  }, [pathname]);

  const handleLogout = async () => {
    localStorage.removeItem('session');
    await fetch('/api/auth/logout', { method: 'POST' });
    router.push('/login');
  };

  // Do not render navbar on login page
  if (pathname === '/login') return null;
  // If not logged in yet, don't show navbar to avoid flashing empty state
  if (!session) return null;

  return (
    <nav className="bg-white border-b border-slate-200 sticky top-0 z-50 shadow-sm">
      <div className="max-w-6xl mx-auto px-6 py-4 flex justify-between items-center">
        <Link href="/" className="flex items-center gap-3 hover:opacity-90 transition-opacity">
          <div className="w-10 h-10 bg-gradient-to-br from-indigo-600 to-blue-500 rounded-xl flex items-center justify-center shadow-lg shadow-indigo-200">
            <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 14l9-5-9-5-9 5 9 5z"></path></svg>
          </div>
          <span className="font-bold text-xl tracking-tight text-slate-800">School ERP</span>
        </Link>
        <div className="flex items-center gap-4">
          <div className="hidden md:flex items-center gap-4 mr-2">
            <div className="flex flex-col items-end">
              <span className="text-sm font-bold text-slate-800 leading-tight">{session.email}</span>
              <span className="text-xs font-medium text-slate-500 leading-tight">{session.tenantName}</span>
            </div>
            <span className="px-3 py-1 bg-indigo-50 text-indigo-700 rounded-full text-xs font-bold uppercase tracking-wider">{session.role}</span>
          </div>
          <div className="w-px h-8 bg-slate-200 hidden md:block"></div>
          <button 
            onClick={handleLogout}
            className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-sm rounded-lg transition-colors flex items-center gap-2"
          >
            Sign out
          </button>
        </div>
      </div>
    </nav>
  );
}
