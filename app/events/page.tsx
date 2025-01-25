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

type ViewType = 'day' | 'week' | 'month';

export default function EventsCalendar() {
  const { user, connectedCalendars, updateGoogleCalendarStatus } = useApp();
  const [view, setView] = useState<ViewType>('week');
  const [currentDate, setCurrentDate] = useState(new Date());
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showSidebar, setShowSidebar] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const calendarRef = useRef<HTMLDivElement>(null);
  const authErrorHandled = useRef(false);
  const router = useRouter();

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
    const fetchEvents = async () => {
      if (!user) {
        console.log('No user found');
        return;
      }

      if (!user.googleCalendarConnected) {
        console.log('User not connected to Google Calendar');
        setError('נדרש חיבור מחדש ליומן גוגל');
        return;
      }

      if (authErrorHandled.current) {
        console.log('Auth error already handled, skipping fetch');
        return;
      }

      setIsLoading(true);
      setError(null);

      try {
        const activeCalendars = connectedCalendars.filter(cal => cal.isActive);
        console.log('Active calendars for fetching:', activeCalendars);

        if (activeCalendars.length === 0) {
          console.log('No active calendars found');
          setEvents([]);
          setError('לא נבחרו יומנים להצגה');
          return;
        }

        // קביעת טווח התאריכים לפי סוג התצוגה
        let startTime: Date, endTime: Date;
        switch (view) {
          case 'day':
            startTime = startOfDay(currentDate);
            endTime = endOfDay(currentDate);
            break;
          case 'week':
            startTime = startOfWeek(currentDate, { locale: he });
            endTime = endOfWeek(currentDate, { locale: he });
            break;
          case 'month':
            startTime = startOfMonth(currentDate);
            endTime = endOfMonth(currentDate);
            break;
        }

        console.log('Fetching events for time range:', { startTime, endTime, view });

        const allEvents: CalendarEvent[] = [];
        let hasAuthError = false;

        // Add reconnection button when error occurs
        const handleReconnect = () => {
          router.push('/calendars?action=reconnect');
        };

        for (const calendar of activeCalendars) {
          try {
            console.log(`Fetching events for calendar: ${calendar.id} (${calendar.name})`);
            const response = await fetch(
              `/api/calendar/events?` +
              `calendarId=${encodeURIComponent(calendar.id)}` +
              `&timeMin=${startTime.toISOString()}` +
              `&timeMax=${endTime.toISOString()}`
            );

            if (!response.ok) {
              const errorData = await response.json().catch(() => ({ error: response.statusText }));
              console.log('Raw error response:', JSON.stringify(errorData));
              console.log('Parsed error data:', errorData);

              if (response.status === 401 || 
                  (typeof errorData.error === 'string' && errorData.error.includes('auth'))) {
                console.log('Auth error detected, updating calendar status');
                authErrorHandled.current = true;
                await updateGoogleCalendarStatus(false);
                setError('נדרש חיבור מחדש ליומן גוגל');
                return;
              }

              console.error(`HTTP error for calendar ${calendar.id}:`, {
                status: response.status,
                statusText: response.statusText,
                error: errorData,
                url: response.url,
                headers: Object.fromEntries(response.headers.entries())
              });
              continue;
            }

            const data = await response.json();
            if (data.items) {
              const eventsWithColor = data.items.map((event: any) => ({
                ...event,
                backgroundColor: calendar.color,
                calendarId: calendar.id,
                calendarName: calendar.name
              }));
              
              allEvents.push(...eventsWithColor);
            }
          } catch (error) {
            console.error(`Error fetching events for calendar ${calendar.id}:`, error);
            if (error instanceof Error) {
              setError(`שגיאה בטעינת יומן ${calendar.name}: ${error.message}`);
            }
          }
        }

        if (hasAuthError) {
          console.log('Auth error detected, updating calendar status');
          authErrorHandled.current = true;
          await updateGoogleCalendarStatus(false);
          setError('נדרש חיבור מחדש ליומן גוגל');
          return;
        }

        setEvents(allEvents);
      } catch (error) {
        console.error('Error in fetchEvents:', error);
        setError('אירעה שגיאה בטעינת האירועים');
      } finally {
        setIsLoading(false);
      }
    };

    if (user && connectedCalendars.length > 0) {
      fetchEvents();
    }

    return () => {
      authErrorHandled.current = false;
    };
  }, [user, connectedCalendars, currentDate, view, updateGoogleCalendarStatus, router]);

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

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-2 rounded-lg mt-2 flex justify-between items-center">
              <span>{error}</span>
              {typeof error === 'string' && error.includes('חיבור מחדש') && (
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