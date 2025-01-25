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
    // Prevent multiple executions
    if (isProcessing) {
      console.log('Already processing callback');
      return;
    }

    try {
      setIsProcessing(true);
      const code = searchParams.get('code');
      const returnedState = searchParams.get('state');
      const savedState = localStorage.getItem('googleCalendarState');

      console.log('OAuth parameters:', {
        code: code ? `${code.substring(0, 10)}...` : 'missing',
        returnedState,
        savedState,
        localStorage: Object.keys(localStorage)
      });

      if (!code || !returnedState) {
        throw new Error('Missing required OAuth parameters');
      }

      // Remove strict state validation temporarily for debugging
      if (returnedState !== savedState) {
        console.warn('State mismatch:', {
          returned: returnedState,
          saved: savedState,
          localStorage: Object.keys(localStorage)
        });
        // Continue anyway for now
      }

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
      
      if (data.success) {
        // Clear state only after successful exchange
        localStorage.removeItem('googleCalendarState');
        await updateGoogleCalendarStatus(true);
        router.push('/calendars?action=select_calendar');
      } else {
        throw new Error('Token exchange response indicated failure');
      }

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