'use client';
import { format, parseISO, startOfWeek, addDays, isSameDay, startOfMonth, endOfMonth, eachDayOfInterval, startOfWeek as startOfWeekFns, endOfWeek, isSameMonth } from 'date-fns';
import { he } from 'date-fns/locale';
import { CalendarEvent } from '@/app/types';
import React, { useRef, useCallback, useEffect } from 'react';

interface CalendarViewProps {
  view: 'day' | 'week' | 'month';
  currentDate: Date;
  events: CalendarEvent[];
}

export default function CalendarView({ view, currentDate, events }: CalendarViewProps) {
  const hours = Array.from({ length: 24 }, (_, i) => i);
  const containerRef = useRef<HTMLDivElement>(null);
  
  // פונקציה לגלילה לשעה הנוכחית
  const scrollToCurrentTime = useCallback(() => {
    if (!containerRef.current) return;
    
    const now = new Date();
    const currentHour = now.getHours();
    
    // נגלול לשעה שעה לפני הזמן הנוכחי
    const scrollHour = Math.max(currentHour - 1, 0);
    const scrollPosition = scrollHour * 80; // כל שעה היא 80px
    
    containerRef.current.scrollTo({
      top: scrollPosition,
      behavior: 'smooth'
    });
  }, []);

  // גלילה אוטומטית בטעינה ובשינוי תצוגה
  useEffect(() => {
    if (view === 'month') return;
    
    const timer = setTimeout(() => {
      scrollToCurrentTime();
    }, 300);
    
    return () => clearTimeout(timer);
  }, [view, scrollToCurrentTime]);

  const getEventStyle = (event: CalendarEvent) => {
    const startDate = parseISO(event.start.dateTime || event.start.date || '');
    const endDate = parseISO(event.end.dateTime || event.end.date || '');
    
    const duration = (endDate.getTime() - startDate.getTime()) / (1000 * 60);
    const startMinutes = startDate.getHours() * 60 + startDate.getMinutes();
    const height = (duration / (60)) * (100/24);
    const top = (startMinutes / (60)) * (100/24);

    return {
      top: `${top}%`,
      height: `${height}%`,
      backgroundColor: event.calendarColor || event.backgroundColor || '#4285f4',
    };
  };

  const renderTimeIndicator = () => {
    const now = new Date();
    const hours = now.getHours();
    const minutes = now.getMinutes();
    
    // החישוב מתבצע ישירות בהתאם לגריד
    const top = `${(hours * 80) + (minutes * 80/60)}px`;

    return (
      <div 
        className="absolute w-full border-t-2 border-red-500 z-50 pointer-events-none"
        style={{ top }}
      >
        <div className="relative">
          <div className="absolute right-0 -top-4 bg-red-500 text-white px-2 py-1 rounded-md shadow-md">
            <span className="font-medium text-sm">
              {`${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`}
            </span>
          </div>
          <div className="absolute left-0 -top-1 h-2 w-2 bg-red-500 rounded-full" />
        </div>
      </div>
    );
  };

  const renderDayView = () => {
    // מיון האירועים ליום מלא ואירועים רגילים
    const dayEvents = events.reduce((acc, event) => {
      const eventDate = parseISO(event.start.dateTime || event.start.date || '');
      if (isSameDay(eventDate, currentDate)) {
        if (!event.start.dateTime) {
          acc.allDay.push(event);
        } else {
          acc.timed.push(event);
        }
      }
      return acc;
    }, { allDay: [] as CalendarEvent[], timed: [] as CalendarEvent[] });

    const { allDay, timed } = dayEvents;

    return (
      <div className="flex flex-col h-full">
        {/* Header Section - Fixed */}
        <div className="border-b p-3 text-center bg-white">
          <div className="text-xl font-semibold">
            {format(currentDate, 'EEEE', { locale: he })}
          </div>
          <div className="text-gray-500">
            {format(currentDate, 'd בMMMM yyyy', { locale: he })}
          </div>
        </div>

        {/* All-day events section */}
        {allDay.length > 0 && (
          <div className="grid grid-cols-[4rem_1fr] border-b bg-gray-50">
            <div className="border-r text-sm p-2 text-gray-500">יום מלא</div>
            <div className="p-1">
              {allDay.map(event => (
                <div
                  key={`${event.id}_${event.calendarId}`}
                  className="px-1 py-0.5 mb-1 text-xs bg-primary-100 text-primary-800 rounded-sm truncate hover:bg-primary-200 transition-colors cursor-pointer"
                  title={event.summary}
                >
                  {event.summary}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Time grid - Scrollable */}
        <div ref={containerRef} className="flex-1 overflow-y-auto">
          <div className="relative h-[1440px]">
            <div className="absolute inset-0 grid grid-cols-[4rem_1fr] divide-x divide-gray-200">
              {/* Time column */}
              <div className="grid grid-rows-24 text-sm text-gray-500">
                {hours.map(hour => (
                  <div key={hour} className="relative h-20">
                    <span className="absolute -top-2.5 right-2">
                      {format(new Date().setHours(hour, 0), 'HH:mm')}
                    </span>
                  </div>
                ))}
              </div>

              {/* Events column */}
              <div className="relative">
                {/* Grid lines */}
                <div className="absolute inset-0 grid grid-rows-24">
                  {hours.map(hour => (
                    <div key={hour} className="border-t border-gray-100" />
                  ))}
                </div>

                {/* Regular events */}
                {timed.map(event => (
                  <div
                    key={`${event.id}_${event.calendarId}`}
                    className="absolute left-0 right-0 px-2 rounded overflow-hidden"
                    style={getEventStyle(event)}
                  >
                    <div className="h-full p-1 text-white text-sm overflow-hidden">
                      <div className="font-semibold">{event.summary}</div>
                      <div className="text-xs opacity-90">
                        {format(parseISO(event.start.dateTime || ''), 'HH:mm')}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
            {renderTimeIndicator()}
          </div>
        </div>
      </div>
    );
  };

  const renderWeekView = () => {
    const weekStart = startOfWeek(currentDate, { locale: he });
    const weekDays = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));

    return (
      <div className="flex flex-col h-full">
        {/* Header Section - Fixed */}
        <div className="grid grid-cols-[4rem_repeat(7,1fr)] border-b">
          {/* Empty cell for time column */}
          <div className="border-r" />
          
          {/* Days row */}
          {weekDays.map(day => (
            <div key={format(day, 'yyyy-MM-dd')} className="border-r p-2 text-center">
              <div>{format(day, 'EEEE', { locale: he })}</div>
              <div className="text-sm text-gray-500">
                {format(day, 'd MMM', { locale: he })}
              </div>
            </div>
          ))}
        </div>

        {/* All-day events row */}
        <div className="grid grid-cols-[4rem_repeat(7,1fr)] border-b bg-gray-50">
          <div className="border-r text-sm p-2 text-gray-500">יום מלא</div>
          {weekDays.map(day => {
            const dayEvents = events.filter(event => {
              const eventDate = parseISO(event.start.dateTime || event.start.date || '');
              return isSameDay(eventDate, day) && !event.start.dateTime;
            });

            return (
              <div key={format(day, 'yyyy-MM-dd')} className="border-r p-1">
                {dayEvents.map(event => (
                  <div
                    key={`${event.id}_${event.calendarId}`}
                    className="px-1 py-0.5 mb-1 text-xs bg-primary-100 text-primary-800 rounded-sm truncate hover:bg-primary-200 transition-colors cursor-pointer"
                    title={event.summary}
                  >
                    {event.summary}
                  </div>
                ))}
              </div>
            );
          })}
        </div>

        {/* Time grid - Scrollable */}
        <div className="flex-1 overflow-y-auto">
          <div className="relative h-[1440px]">
            <div className="absolute inset-0 grid grid-cols-[4rem_repeat(7,1fr)] divide-x divide-gray-200">
              {/* Time column */}
              <div className="grid grid-rows-24 text-sm text-gray-500">
                {hours.map(hour => (
                  <div key={hour} className="relative h-20">
                    <span className="absolute -top-2.5 right-2">
                      {format(new Date().setHours(hour, 0), 'HH:mm')}
                    </span>
                  </div>
                ))}
              </div>

              {/* Days columns with events */}
              {weekDays.map(day => (
                <div key={format(day, 'yyyy-MM-dd')} className="relative">
                  {/* Grid lines */}
                  <div className="absolute inset-0 grid grid-rows-24">
                    {hours.map(hour => (
                      <div key={hour} className="border-t border-gray-100" />
                    ))}
                  </div>

                  {/* Regular events */}
                  {events
                    .filter(event => {
                      const eventDate = parseISO(event.start.dateTime || event.start.date || '');
                      return isSameDay(eventDate, day) && event.start.dateTime;
                    })
                    .map(event => (
                      <div
                        key={`${event.id}_${event.calendarId}`}
                        className="absolute left-0 right-0 px-2 rounded overflow-hidden"
                        style={getEventStyle(event)}
                      >
                        <div className="h-full p-1 text-white text-sm overflow-hidden">
                          <div className="font-semibold">{event.summary}</div>
                          <div className="text-xs opacity-90">
                            {format(parseISO(event.start.dateTime || ''), 'HH:mm')}
                          </div>
                        </div>
                      </div>
                    ))}
                </div>
              ))}
            </div>
            {renderTimeIndicator()}
          </div>
        </div>
      </div>
    );
  };

  const renderMonthView = () => {
    const start = startOfMonth(currentDate);
    const end = endOfMonth(currentDate);
    const firstDay = startOfWeek(start, { locale: he });
    
    const days = eachDayOfInterval({
      start: firstDay,
      end: endOfWeek(end, { locale: he })
    });

    const weeks = Array.from({ length: Math.ceil(days.length / 7) }, (_, i) =>
      days.slice(i * 7, (i + 1) * 7)
    );

    return (
      <div className="h-full flex flex-col">
        {/* Grid Header */}
        <div className="grid grid-cols-7 border-b">
          {['ראשון', 'שני', 'שלישי', 'רביעי', 'חמישי', 'שישי', 'שבת'].map(day => (
            <div key={day} className="py-2 px-2 text-sm font-medium text-gray-500 text-center">
              {day}
            </div>
          ))}
        </div>

        {/* Calendar Grid */}
        <div className="flex-1 grid grid-rows-6">
          {weeks.map((week, weekIndex) => (
            <div key={weekIndex} className="grid grid-cols-7 h-full">
              {week.map(day => {
                const isCurrentMonth = isSameMonth(day, currentDate);
                const isToday = isSameDay(day, new Date());
                const dayEvents = events.filter(event => {
                  const eventDate = parseISO(event.start.dateTime || event.start.date || '');
                  return isSameDay(eventDate, day);
                });

                return (
                  <div
                    key={format(day, 'yyyy-MM-dd')}
                    className={`relative border-b border-r h-full min-h-[120px] ${
                      isCurrentMonth ? 'bg-white' : 'bg-gray-50'
                    }`}
                  >
                    {/* Date Number */}
                    <div className={`absolute top-1 right-1 flex items-center justify-center ${
                      isToday 
                        ? 'w-7 h-7 rounded-full bg-primary-500 text-white' 
                        : 'text-gray-600'
                    } ${!isCurrentMonth ? 'text-gray-400' : ''}`}>
                      <span className="text-sm">{format(day, 'd')}</span>
                    </div>

                    {/* Events Container */}
                    <div className="pt-8 px-1 space-y-1">
                      {dayEvents.map((event, index) => {
                        const startTime = parseISO(event.start.dateTime || event.start.date || '');
                        const isAllDay = !event.start.dateTime;
                        const eventKey = `${event.id}_${event.calendarId || 'default'}_${format(startTime, 'yyyyMMdd')}`;
                        
                        return (
                          <div
                            key={eventKey}
                            className={`text-xs rounded-lg overflow-hidden ${
                              isAllDay ? 'bg-opacity-20' : 'hover:bg-opacity-90'
                            }`}
                            style={{ 
                              backgroundColor: event.calendarColor || event.backgroundColor || '#4285f4',
                              color: isAllDay ? 'inherit' : 'white'
                            }}
                          >
                            <div className="px-2 py-1 truncate">
                              {!isAllDay && (
                                <span className="inline-block ml-1">
                                  {format(startTime, 'HH:mm')}
                                </span>
                              )}
                              <span className="font-medium">
                                {event.summary}
                              </span>
                            </div>
                          </div>
                        );
                      })}
                      
                      {dayEvents.length > 4 && (
                        <button className="text-xs text-gray-500 hover:text-gray-700 px-2">
                          +{dayEvents.length - 4} נוספים
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      </div>
    );
  };

  switch (view) {
    case 'week':
      return renderWeekView();
    case 'month':
      return renderMonthView();
    default:
      return renderDayView();
  }
} 