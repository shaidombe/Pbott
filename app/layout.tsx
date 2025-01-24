import type { Metadata } from "next";
import "./globals.css";
import { Providers } from '@/app/components/providers'
import { AppProvider } from '@/app/contexts/AppContext';
import MainNavigation from '@/app/components/navigation/MainNavigation';
import AuthGuard from "@/app/components/auth/AuthGuard";

export const metadata: Metadata = {
  title: "Pbot - Life Planning System",
  description: "Efficient life planning integrated with Google Calendar",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="he" dir="rtl">
      <body>
        <AppProvider>
          <Providers>
            <AuthGuard>
              <div className="min-h-screen bg-gradient-to-br from-primary-50 via-white to-sunset-50">
                <MainNavigation />
                <main className="max-w-7xl mx-auto px-4 py-6 pt-20">
                  {children}
                </main>
              </div>
            </AuthGuard>
          </Providers>
        </AppProvider>
      </body>
    </html>
  )
}
