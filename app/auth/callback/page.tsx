'use client';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { doc, updateDoc } from 'firebase/firestore';
import { db, auth } from '@/lib/firebase/config';

export default function AuthCallback() {
  const router = useRouter();

  useEffect(() => {
    const handleCallback = async () => {
      // קבלת הטוקן מה-URL
      const hash = window.location.hash.substring(1);
      const params = new URLSearchParams(hash);
      const accessToken = params.get('access_token');

      if (accessToken && auth.currentUser) {
        // עדכון הטוקן ב-Firestore
        await updateDoc(doc(db, 'users', auth.currentUser.uid), {
          googleCalendarConnected: true,
          googleAccessToken: accessToken,
        });

        // חזרה לדף היומנים
        router.push('/dashboard/calendars');
      }
    };

    handleCallback();
  }, [router]);

  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center">
        <h1 className="text-2xl mb-4">מחבר את היומן שלך...</h1>
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-500 mx-auto"></div>
      </div>
    </div>
  );
} 