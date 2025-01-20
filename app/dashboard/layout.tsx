'use client';
import { useApp } from '@/app/lib/hooks/useApp';
import { signOut } from 'firebase/auth';
import { auth } from '@/app/lib/firebase/config';
import { useState } from 'react';
import AuthGuard from "@/app/components/auth/AuthGuard";
import Link from 'next/link';
import Image from 'next/image';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user } = useApp();
  const [isProfileOpen, setIsProfileOpen] = useState(false);

  const handleSignOut = async () => {
    try {
      await signOut(auth);
      window.location.href = '/';
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };

  return (
    <AuthGuard>
      <div className="min-h-screen bg-gradient-to-br from-primary-50 via-white to-sunset-50">
        {/* Mobile Navigation */}
        <nav className="fixed bottom-0 left-0 right-0 bg-white/80 backdrop-blur-md border-t border-primary-100 md:hidden z-50">
          <div className="flex justify-around items-center h-16">
            <Link href="/dashboard" className="flex flex-col items-center justify-center w-16 h-16 text-neutral-600 hover:text-primary-500">
              <span className="text-2xl">🏠</span>
              <span className="text-xs mt-1">בית</span>
            </Link>
            <Link href="/dashboard/worlds" className="flex flex-col items-center justify-center w-16 h-16 text-neutral-600 hover:text-primary-500">
              <span className="text-2xl">🌍</span>
              <span className="text-xs mt-1">עולמות</span>
            </Link>
            <button className="flex flex-col items-center justify-center w-16 h-16">
              <div className="w-12 h-12 bg-gradient-to-r from-primary-500 to-sunset-400 rounded-full flex items-center justify-center text-white shadow-lg">
                <span className="text-2xl">+</span>
              </div>
            </button>
            <Link href="/dashboard/tasks" className="flex flex-col items-center justify-center w-16 h-16 text-neutral-600 hover:text-primary-500">
              <span className="text-2xl">📋</span>
              <span className="text-xs mt-1">משימות</span>
            </Link>
            <button 
              onClick={() => setIsProfileOpen(!isProfileOpen)}
              className="flex flex-col items-center justify-center w-16 h-16 text-neutral-600 hover:text-primary-500"
            >
              <span className="text-2xl">👤</span>
              <span className="text-xs mt-1">פרופיל</span>
            </button>
          </div>
        </nav>

        {/* Desktop Navigation */}
        <nav className="hidden md:block fixed top-0 left-0 right-0 bg-white/80 backdrop-blur-md border-b border-primary-100 z-50">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="flex h-16 justify-between items-center">
              <div className="flex-shrink-0 flex items-center">
                <Link href="/dashboard" className="text-2xl font-bold bg-gradient-to-r from-primary-500 to-sunset-500 bg-clip-text text-transparent">
                  Pbot
                </Link>
              </div>
              <div className="flex items-center space-x-8 rtl:space-x-reverse">
                <Link href="/dashboard" className="text-neutral-600 hover:text-primary-500 transition-colors inline-flex items-center gap-2">
                  <span>🏠</span>
                  <span>בית</span>
                </Link>
                <Link href="/dashboard/worlds" className="text-neutral-600 hover:text-primary-500 transition-colors inline-flex items-center gap-2">
                  <span>🌍</span>
                  <span>עולמות</span>
                </Link>
                <Link href="/dashboard/tasks" className="text-neutral-600 hover:text-primary-500 transition-colors inline-flex items-center gap-2">
                  <span>📋</span>
                  <span>משימות</span>
                </Link>
                <Link href="/dashboard/calendars" className="text-neutral-600 hover:text-primary-500 transition-colors inline-flex items-center gap-2">
                  <span>📅</span>
                  <span>יומנים</span>
                </Link>

                {/* Profile Menu */}
                <div className="relative">
                  <button 
                    onClick={() => setIsProfileOpen(!isProfileOpen)}
                    className="flex items-center space-x-2 text-neutral-600 hover:text-primary-500 transition-colors"
                  >
                    {user?.photoURL ? (
                      <Image
                        src={user.photoURL}
                        alt={user.name || 'תמונת משתמש'}
                        width={32}
                        height={32}
                        className="rounded-full"
                        onError={(e) => {
                          // Fallback to default avatar if image fails to load
                          const target = e.target as HTMLImageElement;
                          target.src = '/default-avatar.png';
                        }}
                      />
                    ) : (
                      <Image
                        src="/default-avatar.png"
                        alt="תמונת ברירת מחדל"
                        width={32}
                        height={32}
                        className="rounded-full"
                      />
                    )}
                    <span className="text-sm text-neutral-900">{user?.name}</span>
                  </button>

                  {/* Dropdown Menu */}
                  {isProfileOpen && (
                    <div className="absolute left-0 mt-2 w-48 rounded-md shadow-lg py-1 bg-white ring-1 ring-black ring-opacity-5">
                      <div className="px-4 py-2 text-sm text-neutral-900 border-b">
                        {user?.email}
                      </div>
                      <button
                        onClick={handleSignOut}
                        className="block w-full text-right px-4 py-2 text-sm text-red-600 hover:bg-neutral-100"
                      >
                        התנתק
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </nav>

        {/* Main Content */}
        <main className="max-w-7xl mx-auto px-4 py-6 pt-20">
          {children}
        </main>
      </div>
    </AuthGuard>
  );
} 