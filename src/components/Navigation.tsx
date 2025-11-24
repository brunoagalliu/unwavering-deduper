'use client';

import { signOut, useSession } from 'next-auth/react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

export function Navigation() {
  const { data: session } = useSession();
  const pathname = usePathname();

  // Don't show nav on login page
  if (pathname === '/login') return null;

  return (
    <nav className="bg-purple-900 shadow-lg">
      <div className="max-w-7xl mx-auto px-6">
        <div className="flex justify-between items-center h-16">
          <Link href="/" className="text-2xl font-bold text-white hover:text-purple-200 transition-colors">
            📞 Unwavering Deduper
          </Link>
          <div className="flex items-center space-x-6">
            <Link 
              href="/" 
              className="text-white hover:text-purple-200 transition-colors font-medium"
            >
              Upload
            </Link>
            <Link 
              href="/masters" 
              className="text-white hover:text-purple-200 transition-colors font-medium"
            >
              Masters
            </Link>
            <Link 
              href="/history" 
              className="text-white hover:text-purple-200 transition-colors font-medium"
            >
              History
            </Link>
            {session && (
              <>
                <span className="text-purple-200 text-sm">
                  {session.user?.name}
                </span>
                <button
                  onClick={() => signOut({ callbackUrl: '/login' })}
                  className="text-white hover:text-purple-200 transition-colors font-medium"
                >
                  Logout
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
}