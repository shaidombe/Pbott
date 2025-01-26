'use client';

import { usePathname } from 'next/navigation';
import AuthGuard from "@/app/components/auth/AuthGuard";
import MainNavigation from '@/app/components/navigation/MainNavigation';

export default function ClientLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isAuthPage = pathname.startsWith('/auth/');

  if (isAuthPage) {
    return children;
  }

  return (
    <AuthGuard>
      <div className="min-h-screen bg-gradient-to-br from-primary-50 via-white to-sunset-50">
        <MainNavigation />
        <main className="max-w-7xl mx-auto px-4 py-6 pt-20">
          {children}
        </main>
      </div>
    </AuthGuard>
  );
} 