'use client';

import { AppProvider } from '@/app/contexts/AppContext';
import { GoogleOAuthProvider } from '@react-oauth/google';

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <GoogleOAuthProvider clientId={process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID!}>
      <AppProvider>
        {children}
      </AppProvider>
    </GoogleOAuthProvider>
  );
} 