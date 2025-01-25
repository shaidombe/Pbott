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
  endOfMonth 
} from 'date-fns';
import { he } from 'date-fns/locale';
import { CalendarEvent } from '@/app/types';
import CalendarView from './components/CalendarView';
import Link from 'next/link';
import { Cog6ToothIcon, ChevronLeftIcon, ChevronRightIcon } from '@heroicons/react/24/outline';
import Sidebar from './components/Sidebar';

type ViewType = 'day' | 'week' | 'month';

export default function EventsCalendar() {
  const { user, connectedCalendars } = useApp();
  const [view, setView] = useState<ViewType>('week');
  const [currentDate, setCurrentDate] = useState(new Date());
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showSidebar, setShowSidebar] = useState(true);
  const calendarRef = useRef<HTMLDivElement>(null);

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
      if (!user?.googleCalendarConnected) return;
      setIsLoading(true);

      try {
        const activeCalendars = connectedCalendars.filter(cal => cal.isActive);
        const allEvents: CalendarEvent[] = [];

        for (const calendar of activeCalendars) {
          const response = await fetch(`/api/calendar/events?calendarId=${calendar.id}`);
          if (!response.ok) throw new Error('Failed to fetch events');
          const calendarEvents = await response.json();
          
          // הוספת צבע היומן לכל האירועים שלו
          const eventsWithColor = calendarEvents.map((event: CalendarEvent) => ({
            ...event,
            backgroundColor: calendar.color
          }));
          
          allEvents.push(...eventsWithColor);
        }

        setEvents(allEvents);
      } catch (error) {
        console.error('Error fetching events:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchEvents();
  }, [user, connectedCalendars]);

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
        </div>

        {/* Calendar */}
        <div ref={calendarRef} className="flex-1 overflow-y-auto">
          <CalendarView
            view={view}
            currentDate={currentDate}
            events={events}
            renderTimeIndicator={renderTimeIndicator}
          />
        </div>
      </div>
    </div>
  );
} 