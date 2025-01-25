'use client';
import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useApp } from '@/app/contexts/AppContext';

const CalendarCallback = () => {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isProcessing, setIsProcessing] = useState(false);
  const { updateGoogleCalendarStatus } = useApp();

  const handleCallback = async () => {
    try {
      setIsProcessing(true);
      const code = searchParams.get('code');
      const returnedState = searchParams.get('state');
      const savedState = localStorage.getItem('googleCalendarState');

      if (!code || !returnedState) {
        throw new Error('Missing required OAuth parameters');
      }

      console.log('Sending token exchange request with:', {
        code: code.substring(0, 10) + '...',
        redirectUri: window.location.origin + '/auth/calendar-callback'
      });

      const response = await fetch('/api/auth/google-calendar', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          code,
          redirectUri: window.location.origin + '/auth/calendar-callback'
        })
      });

      const data = await response.json();
      
      console.log('Token exchange response:', {
        status: response.status,
        ok: response.ok,
        data: {
          success: data.success,
          hasError: !!data.error,
          hasToken: !!data.token
        }
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
      setIsProcessing(false);
    }
  };

  // Use useEffect with empty dependency array to run only once
  useEffect(() => {
    handleCallback();
    // Clean up function
    return () => {
      setIsProcessing(false);
    };
  }, []); // Empty dependency array

  return <div>מאמת את החיבור לגוגל קלנדר...</div>;
};

export default CalendarCallback; 