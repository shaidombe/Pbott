'use client';
import { format, parseISO, startOfWeek, addDays, isSameDay, startOfMonth, endOfMonth, eachDayOfInterval, startOfWeek as startOfWeekFns, endOfWeek, isSameMonth } from 'date-fns';
import { he } from 'date-fns/locale';
import { CalendarEvent } from '@/app/types';
import React from 'react';

interface CalendarViewProps {
  view: 'day' | 'week' | 'month';
  currentDate: Date;
  events: CalendarEvent[];
  renderTimeIndicator: () => React.ReactNode;
}

export default function CalendarView({ view, currentDate, events, renderTimeIndicator }: CalendarViewProps) {
  const hours = Array.from({ length: 24 }, (_, i) => i);
  
  const getEventStyle = (event: CalendarEvent) => {
    const startDate = parseISO(event.start.dateTime || event.start.date || '');
    const endDate = parseISO(event.end.dateTime || event.end.date || '');
    
    const duration = (endDate.getTime() - startDate.getTime()) / (1000 * 60);
    const startMinutes = startDate.getHours() * 60 + startDate.getMinutes();
    const height = (duration / 1440) * 100;
    const top = (startMinutes / 1440) * 100;

    return {
      top: `${top}%`,
      height: `${height}%`,
      backgroundColor: event.backgroundColor || '#4285f4',
    };
  };

  const renderDayView = () => {
    return (
      <div className="relative h-[1440px]"> {/* 24 שעות * 60 פיקסלים */}
        <div className="absolute inset-0 grid grid-cols-[4rem_1fr] divide-x divide-gray-200">
          {/* עמודת שעות */}
          <div className="grid grid-rows-24 text-sm text-gray-500">
            {hours.map(hour => (
              <div key={hour} className="relative h-20">
                <span className="absolute -top-2.5 right-2">
                  {format(new Date().setHours(hour, 0), 'HH:mm')}
                </span>
              </div>
            ))}
          </div>

          {/* אזור אירועים */}
          <div className="relative">
            {renderTimeIndicator()}
            
            {/* קווי רשת */}
            <div className="absolute inset-0 grid grid-rows-24 pointer-events-none">
              {hours.map(hour => (
                <div key={hour} className="border-t border-gray-100" />
              ))}
            </div>

            {/* אירועים */}
            {events
              .filter(event => {
                const eventDate = parseISO(event.start.dateTime || event.start.date || '');
                return isSameDay(eventDate, currentDate);
              })
              .map(event => (
                <div
                  key={event.id}
                  className="absolute left-0 right-0 px-2 rounded overflow-hidden"
                  style={getEventStyle(event)}
                >
                  <div className="h-full p-1 text-white text-sm overflow-hidden">
                    <div className="font-semibold">{event.summary}</div>
                    <div className="text-xs opacity-90">
                      {format(parseISO(event.start.dateTime || event.start.date || ''), 'HH:mm')} - 
                      {format(parseISO(event.end.dateTime || event.end.date || ''), 'HH:mm')}
                    </div>
                  </div>
                </div>
              ))}
          </div>
        </div>
      </div>
    );
  };

  const renderWeekView = () => {
    const weekStart = startOfWeek(currentDate, { locale: he });
    const weekDays = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));

    return (
      <div className="relative h-[1440px]">
        <div className="absolute inset-0 grid grid-cols-[4rem_repeat(7,1fr)] divide-x divide-gray-200">
          {/* עמודת שעות */}
          <div className="grid grid-rows-24 text-sm text-gray-500">
            {hours.map(hour => (
              <div key={hour} className="relative h-20">
                <span className="absolute -top-2.5 right-2">
                  {format(new Date().setHours(hour, 0), 'HH:mm')}
                </span>
              </div>
            ))}
          </div>

          {/* ימי השבוע */}
          {weekDays.map(day => (
            <div key={format(day, 'yyyy-MM-dd')} className="relative">
              <div className="sticky top-0 z-10 bg-white border-b p-2 text-center">
                {format(day, 'EEEE', { locale: he })}
                <div className="text-sm text-gray-500">
                  {format(day, 'd MMM', { locale: he })}
                </div>
              </div>

              {/* קווי רשת */}
              <div className="absolute inset-0 grid grid-rows-24 pointer-events-none">
                {hours.map(hour => (
                  <div key={hour} className="border-t border-gray-100" />
                ))}
              </div>

              {/* אירועים */}
              {events
                .filter(event => {
                  const eventDate = parseISO(event.start.dateTime || event.start.date || '');
                  return isSameDay(eventDate, day);
                })
                .map(event => (
                  <div
                    key={event.id}
                    className="absolute left-0 right-0 px-2 rounded overflow-hidden"
                    style={getEventStyle(event)}
                  >
                    <div className="h-full p-1 text-white text-sm overflow-hidden">
                      <div className="font-semibold">{event.summary}</div>
                      <div className="text-xs opacity-90">
                        {format(parseISO(event.start.dateTime || event.start.date || ''), 'HH:mm')}
                      </div>
                    </div>
                  </div>
                ))}
            </div>
          ))}
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
                        
                        return (
                          <div
                            key={event.id}
                            className={`text-xs rounded-lg overflow-hidden ${
                              isAllDay ? 'bg-opacity-20' : 'hover:bg-opacity-90'
                            }`}
                            style={{ 
                              backgroundColor: event.backgroundColor || '#4285f4',
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