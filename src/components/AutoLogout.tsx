'use client';

import { useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';

export default function AutoLogout() {
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    // Don't auto-logout if we're already on the login page
    if (pathname === '/login') return;

    let timeoutId: NodeJS.Timeout;

    const resetTimer = () => {
      clearTimeout(timeoutId);
      // 15 minutes = 15 * 60 * 1000 = 900000 ms
      timeoutId = setTimeout(async () => {
        // Clear local session
        localStorage.removeItem('session');
        // Clear secure server session
        await fetch('/api/auth/logout', { method: 'POST' });
        // Redirect to login
        router.push('/login');
      }, 900000);
    };

    // Initialize timer
    resetTimer();

    // Events to track activity
    const events = ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart'];

    const handleActivity = () => {
      resetTimer();
    };

    events.forEach(event => {
      window.addEventListener(event, handleActivity);
    });

    return () => {
      clearTimeout(timeoutId);
      events.forEach(event => {
        window.removeEventListener(event, handleActivity);
      });
    };
  }, [router, pathname]);

  return null; // This component doesn't render anything
}
