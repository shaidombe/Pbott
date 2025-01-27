'use client';
import { useState, useEffect, useRef, useCallback } from 'react';
import { useApp } from '@/app/contexts/AppContext';
import { 
  format, 
  startOfWeek, 
  endOfWeek, 
  addDays, 
  subDays, 
  addMonths, 
  subMonths,
  startOfMonth,
  endOfMonth,
  startOfDay,
  endOfDay
} from 'date-fns';
import { he } from 'date-fns/locale';
import { CalendarEvent } from '@/app/types';
import CalendarView from './components/CalendarView';
import Link from 'next/link';
import { Cog6ToothIcon, ChevronLeftIcon, ChevronRightIcon } from '@heroicons/react/24/outline';
import Sidebar from './components/Sidebar';
import { useRouter } from 'next/navigation';
import { auth } from '@/lib/firebase/config';

type ViewType = 'day' | 'week' | 'month';

export default function EventsCalendar() {
  const { user, connectedCalendars, updateGoogleCalendarStatus, isLoading } = useApp();
  const [view, setView] = useState<ViewType>('week');
  const [currentDate, setCurrentDate] = useState(new Date());
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [showSidebar, setShowSidebar] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const calendarRef = useRef<HTMLDivElement>(null);
  const authErrorHandled = useRef(false);
  const router = useRouter();

  useEffect(() => {
    console.log('Events page state:', {
      isLoading,
      user: {
        exists: !!user,
        calendarConnected: user?.googleCalendarConnected
      },
      calendars: {
        count: connectedCalendars.length,
        details: connectedCalendars.map(cal => ({
          id: cal.id,
          name: cal.name,
          isActive: cal.isActive
        }))
      }
    });
  }, [user, connectedCalendars, isLoading]);

  // פונקציה לגלילה לשעה הנוכחית
  const scrollToCurrentTime = useCallback(() => {
    if (!calendarRef.current) return;
    
    const now = new Date();
    const minutes = now.getHours() * 60 + now.getMinutes();
    const percentage = (minutes / 1440) * 100;
    const scrollPosition = (percentage / 100) * 1440;
    
    calendarRef.current.scrollTop = scrollPosition - 300; // גלילה קצת מעל השעה הנוכחית
  }, []);

  // פטצ' אירועים מכל היומנים המחוברים והפעילים
  useEffect(() => {
    const fetchCalendarEvents = async () => {
      if (!connectedCalendars.length) return;

      try {
        const firebaseUser = auth.currentUser;
        if (!firebaseUser) {
          console.error('No Firebase user found');
          return;
        }

        const idToken = await firebaseUser.getIdToken(true);
        console.log('Got Firebase token for user:', {
          uid: firebaseUser.uid,
          hasToken: !!idToken
        });

        setEvents([]);
        setFetchError(null);

        // הגדרת טווח התאריכים
        const startTime = new Date();
        const endTime = new Date();
        endTime.setDate(endTime.getDate() + 7); // שבוע קדימה

        for (const calendar of connectedCalendars) {
          if (!calendar.isActive) {
            console.log(`Skipping inactive calendar: ${calendar.id}`);
            continue;
          }

          console.log(`Fetching events for calendar: ${calendar.id}`);
          
          const response = await fetch(
            `/api/calendar/events?` +
            `calendarId=${encodeURIComponent(calendar.id)}` +
            `&timeMin=${startTime.toISOString()}` +
            `&timeMax=${endTime.toISOString()}`,
            {
              headers: {
                'Authorization': `Bearer ${idToken}`,
                'Content-Type': 'application/json',
              }
            }
          );

          const responseData = await response.json();

          if (!response.ok) {
            console.error('Calendar API error:', {
              status: response.status,
              error: responseData,
              calendarId: calendar.id
            });
            throw new Error(responseData.error || 'Failed to fetch events');
          }

          console.log('Got calendar events:', {
            calendarId: calendar.id,
            eventCount: responseData.items?.length
          });
          
          if (responseData.items?.length) {
            const eventsWithColor = responseData.items.map((event: CalendarEvent) => ({
              ...event,
              calendarColor: calendar.color
            }));
            setEvents(prev => [...prev, ...eventsWithColor]);
          }
        }
      } catch (error) {
        console.error('Error fetching events:', error);
        setFetchError(error instanceof Error ? error.message : 'Failed to fetch events');
      }
    };

    if (connectedCalendars.length > 0) {
      fetchCalendarEvents();
    }
  }, [connectedCalendars]);

  // גלילה לשעה הנוכחית בטעינה ראשונית ובמעבר בין תצוגות
  useEffect(() => {
    scrollToCurrentTime();
  }, [view, scrollToCurrentTime]);

  const renderTimeIndicator = () => {
    const now = new Date();
    const minutes = now.getHours() * 60 + now.getMinutes();
    const percentage = (minutes / 1440) * 100;

    return (
      <div 
        className="absolute w-full border-t-2 border-red-500 z-50"
        style={{ top: `${percentage}%` }}
      >
        <div className="relative">
          <span className="absolute -left-12 -top-2.5 text-red-500 text-sm">
            {format(now, 'HH:mm')}
          </span>
        </div>
      </div>
    );
  };

  const goToToday = () => {
    setCurrentDate(new Date());
    scrollToCurrentTime();
  };

  // מצב טעינה
  if (isLoading) {
    return <div>טוען...</div>;
  }

  // אם אין משתמש מחובר, נחזיר לדף הראשי
  if (!user) {
    router.push('/');
    return null;
  }

  // אם יש משתמש אבל אין יומנים מחוברים, נפנה לדף החיבור
  if (!user.googleCalendarConnected || connectedCalendars.length === 0) {
    return (
      <div className="text-center p-4">
        <h2 className="text-xl mb-4">אין יומנים מחוברים</h2>
        <Link 
          href="/calendars" 
          className="text-blue-500 hover:text-blue-700 underline"
        >
          לחץ כאן כדי לחבר יומן
        </Link>
      </div>
    );
  }

  return (
    <div className="fixed top-16 bottom-0 left-0 right-0 flex">
      <Sidebar showSidebar={showSidebar} />

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <div className="bg-white border-b p-4 flex flex-col">
          <div className="flex justify-between items-center mb-4">
            <div className="flex items-center gap-4">
              <button
                onClick={() => setShowSidebar(!showSidebar)}
                className="text-gray-600 hover:text-gray-900 p-2 rounded-full hover:bg-gray-100"
              >
                ☰
              </button>
              
              <button
                onClick={goToToday}
                className="px-4 py-2 rounded-lg bg-primary-100 text-primary-700 hover:bg-primary-200"
              >
                היום
              </button>

              <div className="flex gap-2 mr-4">
                <button
                  onClick={() => setView('day')}
                  className={`px-4 py-2 rounded-lg ${
                    view === 'day' ? 'bg-primary-500 text-white' : 'bg-gray-100 hover:bg-gray-200'
                  }`}
                >
                  יום
                </button>
                <button
                  onClick={() => setView('week')}
                  className={`px-4 py-2 rounded-lg ${
                    view === 'week' ? 'bg-primary-500 text-white' : 'bg-gray-100 hover:bg-gray-200'
                  }`}
                >
                  שבוע
                </button>
                <button
                  onClick={() => setView('month')}
                  className={`px-4 py-2 rounded-lg ${
                    view === 'month' ? 'bg-primary-500 text-white' : 'bg-gray-100 hover:bg-gray-200'
                  }`}
                >
                  חודש
                </button>
              </div>
            </div>

            <Link 
              href="/calendars"
              className="text-gray-600 hover:text-gray-900 p-2 rounded-full hover:bg-gray-100"
              title="הגדרות יומן"
            >
              <Cog6ToothIcon className="w-6 h-6" />
            </Link>
          </div>

          <div className="flex justify-between items-center">
            <button
              onClick={() => setCurrentDate(prev => {
                switch (view) {
                  case 'day': return subDays(prev, 1);
                  case 'week': return subDays(prev, 7);
                  case 'month': return subMonths(prev, 1);
                }
              })}
              className="p-2 hover:bg-gray-100 rounded-full"
            >
              <ChevronRightIcon className="w-5 h-5" />
            </button>
            <h2 className="text-xl font-bold">
              {format(currentDate, 'MMMM yyyy', { locale: he })}
            </h2>
            <button
              onClick={() => setCurrentDate(prev => {
                switch (view) {
                  case 'day': return addDays(prev, 1);
                  case 'week': return addDays(prev, 7);
                  case 'month': return addMonths(prev, 1);
                }
              })}
              className="p-2 hover:bg-gray-100 rounded-full"
            >
              <ChevronLeftIcon className="w-5 h-5" />
            </button>
          </div>

          {fetchError && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-2 rounded-lg mt-2 flex justify-between items-center">
              <span>{fetchError}</span>
              {typeof fetchError === 'string' && fetchError.includes('חיבור מחדש') && (
                <Link 
                  href="/calendars"
                  className="text-red-700 hover:text-red-800 underline text-sm"
                >
                  התחבר מחדש
                </Link>
              )}
            </div>
          )}
        </div>

        {/* Calendar */}
        <div ref={calendarRef} className="flex-1 overflow-y-auto relative">
          {isLoading ? (
            <div className="absolute inset-0 flex items-center justify-center bg-white bg-opacity-75">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-500"></div>
            </div>
          ) : (
            <CalendarView
              view={view}
              currentDate={currentDate}
              events={events}
              renderTimeIndicator={renderTimeIndicator}
            />
          )}
        </div>
      </div>
    </div>
  );
} 