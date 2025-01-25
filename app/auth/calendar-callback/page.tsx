'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { GoogleCalendarService } from '@/lib/services/googleCalendar';
import { useApp } from '@/lib/hooks/useApp';

export default function CalendarCallback() {
  const router = useRouter();
  const { updateGoogleCalendarStatus } = useApp();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const handleCallback = async () => {
      try {
        // קבלת הטוקן מה-URL
        const hash = window.location.hash.substring(1);
        const params = new URLSearchParams(hash);
        const accessToken = params.get('access_token');

        if (!accessToken) {
          throw new Error('No access token received');
        }

        // יצירת שירות Calendar זמני לבדיקת הטוקן
        const calendarService = new GoogleCalendarService(accessToken);
        
        try {
          // בדיקה שהטוקן עובד
          await calendarService.getCalendarList();
          
          // שמירת הטוקן ב-localStorage לשימוש זמני
          localStorage.setItem('temp_calendar_token', accessToken);
          
          // עדכון סטטוס חיבור הקלנדר
          await updateGoogleCalendarStatus(true);
          
          // חזרה לדף היומנים עם פרמטר שמציין שיש לבחור סוג יומן
          router.push('/calendars?action=select_calendar');
        } catch (error) {
          console.error('Error validating token:', error);
          throw new Error('Token validation failed');
        }
      } catch (error) {
        console.error('Error in calendar callback:', error);
        setError('אירעה שגיאה בתהליך חיבור היומן');
      }
    };

    handleCallback();
  }, [router, updateGoogleCalendarStatus]);

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center text-red-600">
          <h1 className="text-2xl mb-4">{error}</h1>
          <button 
            onClick={() => router.push('/calendars')}
            className="text-primary-500 hover:underline"
          >
            חזור לדף היומנים
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center">
        <h1 className="text-2xl mb-4">מחבר את היומן...</h1>
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-500 mx-auto"></div>
      </div>
    </div>
  );
} 