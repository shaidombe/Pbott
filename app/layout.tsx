import type { Metadata } from "next";
import "./globals.css";
import { Providers } from '@/app/components/providers'
import { AppProvider } from '@/app/contexts/AppContext';

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
            {children}
          </Providers>
        </AppProvider>
      </body>
    </html>
  )
}
