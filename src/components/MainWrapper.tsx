'use client';

import { usePathname } from 'next/navigation';

export default function MainWrapper({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  if (pathname === '/login') {
    return <div className="min-h-screen w-full bg-white flex items-center justify-center">{children}</div>;
  }

  return (
    <main className="flex-1 lg:pl-60 pt-6 pb-20 lg:pb-8 px-4 sm:px-6 md:px-8 bg-white">
      {children}
    </main>
  );
}
