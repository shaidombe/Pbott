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
      
      console.log('Starting token exchange with params:', {
        code: code.substring(0, 10) + '...',
        redirectUri,
        timestamp: new Date().toISOString()
      });

      const response = await fetch('/api/auth/google-calendar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code, redirectUri })
      });

      const data = await response.json();
      console.log('API Response:', { 
        status: response.status, 
        statusText: response.statusText,
        data 
      });

      if (!response.ok) {
        throw new Error(`Token exchange failed: ${data.error || response.statusText}`);
      }

      if (!data.token) {
        throw new Error('No token received from server');
      }

      // שמירת הטוקן והמשך התהליך
      localStorage.removeItem('googleCalendarState');
      localStorage.setItem('temp_calendar_token', data.token);
      await updateGoogleCalendarStatus(true);
      router.push('/calendars?action=select_calendar');

    } catch (error: unknown) {
      console.error('Calendar authentication error:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      router.push(`/calendars?error=auth_failed&details=${encodeURIComponent(errorMessage)}`);
    } finally {
      isProcessingRef.current = false;
    }
  }, [searchParams, router, updateGoogleCalendarStatus]);

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