'use client';
import { useEffect, useCallback, useRef } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useApp } from '@/app/contexts/AppContext';

const CalendarCallback = () => {
  const searchParams = useSearchParams();
  const router = useRouter();
  const isProcessingRef = useRef(false);
  const { updateGoogleCalendarStatus } = useApp();
  
  const handleCallback = useCallback(async () => {
    if (isProcessingRef.current) {
      console.log('Already processing callback, skipping');
      return;
    }

    isProcessingRef.current = true;

    try {
      const code = searchParams.get('code');
      if (!code) {
        console.error('No authorization code received');
        router.push('/calendars?error=no_code');
        return;
      }

      const redirectUri = window.location.origin + '/auth/calendar-callback';
      
      const response = await fetch('/api/auth/google-calendar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code, redirectUri })
      });

      const data = await response.json();

      if (!response.ok || !data.token) {
        throw new Error(`Token exchange failed: ${data.error || response.statusText}`);
      }

      // שמירת הטוקן
      localStorage.removeItem('googleCalendarState');
      localStorage.setItem('temp_calendar_token', data.token);
      await updateGoogleCalendarStatus(true);

      // בדיקה איזו פעולה צריך לבצע
      const action = localStorage.getItem('calendar_action');
      const calendarToDelete = localStorage.getItem('calendar_to_delete');
      localStorage.removeItem('calendar_action');

      if (action === 'delete_tasks' && calendarToDelete) {
        // חזרה לדף היומנים בלי פרמטרים נוספים
        router.push('/calendars');
      } else if (action === 'create_tasks') {
        router.push('/calendars?action=create_tasks');
      } else {
        router.push('/calendars?action=select_calendar');
      }

    } catch (error) {
      console.error('Error in calendar callback:', error);
      router.push('/calendars?error=callback_failed');
    } finally {
      isProcessingRef.current = false;
    }
  }, [router, searchParams, updateGoogleCalendarStatus]);

  useEffect(() => {
    handleCallback();
  }, [handleCallback]);

  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center">
        <h1 className="text-2xl mb-4">מאמת את החיבור לגוגל קלנדר...</h1>
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-500 mx-auto"></div>
      </div>
    </div>
  );
};

export default CalendarCallback; 