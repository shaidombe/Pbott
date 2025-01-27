'use client';

import { useApp } from '@/hooks/useApp';
import { Task, World, CalendarEvent } from '@/app/types';
import { format, isSameDay, parseISO, startOfDay, endOfDay } from 'date-fns';
import { getWorldColor } from '@/lib/utils/worldUtils';
import { useState, useEffect } from 'react';

interface ScheduleItem {
  id: string;
  type: 'task' | 'event';
  title: string;
  start: Date;
  end: Date;
  world?: World;
  isCompleted?: boolean;
}

export default function DailySchedule() {
  const { worlds, todaysPlan, googleCalendar } = useApp();
  const [calendarEvents, setCalendarEvents] = useState<CalendarEvent[]>([]);
  const today = new Date();

  useEffect(() => {
    const fetchEvents = async () => {
      if (!googleCalendar) {
        console.log('No googleCalendar service available');
        setCalendarEvents([]);
        return;
      }
      
      try {
        const todayStart = startOfDay(today);
        const todayEnd = endOfDay(today);
        console.log('Fetching events for range:', { todayStart, todayEnd });
        
        const response = await googleCalendar.getEvents(todayStart, todayEnd);
        console.log('Calendar events response:', response);
        
        setCalendarEvents(response.items);
      } catch (error) {
        console.error('Error fetching events:', error);
        setCalendarEvents([]);
      }
    };
    
    fetchEvents();
  }, [googleCalendar, today]);

  // מיזוג משימות ואירועי יומן
  const scheduleItems: ScheduleItem[] = [
    // המרת משימות לפריטי לוז
    ...(todaysPlan?.tasks || [])
      .filter((task: Task) => task.scheduledStart && task.scheduledEnd)
      .map((task: Task) => ({
        id: task.id,
        type: 'task' as const,
        title: task.title,
        start: new Date(task.scheduledStart!),
        end: new Date(task.scheduledEnd!),
        world: worlds.find(w => w.id === task.worldId),
        isCompleted: task.status === 'COMPLETED'
      })),
    // המרת אירועי יומן לפריטי לוז
    ...calendarEvents
      .filter(event => 
        event.start.dateTime && 
        event.end.dateTime &&
        isSameDay(parseISO(event.start.dateTime), today)
      )
      .map(event => {
        if (!event.start.dateTime || !event.end.dateTime) {
          return null;
        }
        
        return {
          id: event.id,
          type: 'event' as const,
          title: event.summary || 'אירוע ללא כותרת',
          start: parseISO(event.start.dateTime),
          end: parseISO(event.end.dateTime),
        };
      })
      .filter((event): event is NonNullable<typeof event> => event !== null)
  ].sort((a, b) => a.start.getTime() - b.start.getTime());

  // מציאת חלונות זמן פנויים
  const freeSlots: { start: Date; end: Date; duration: number }[] = [];
  for (let i = 0; i < scheduleItems.length - 1; i++) {
    const currentEnd = scheduleItems[i].end;
    const nextStart = scheduleItems[i + 1].start;
    const diffMinutes = (nextStart.getTime() - currentEnd.getTime()) / (1000 * 60);
    
    if (diffMinutes >= 30) { // רק חלונות של 30 דקות ומעלה
      freeSlots.push({
        start: currentEnd,
        end: nextStart,
        duration: diffMinutes
      });
    }
  }

  return (
    <div className="space-y-4">
      {/* זמן נוכחי */}
      <div className="text-center text-sm text-gray-500">
        {format(new Date(), 'HH:mm')}
      </div>

      {/* רשימת הפריטים */}
      <div className="space-y-2">
        {scheduleItems.map((item, index) => {
          const isPast = item.end < new Date();
          const isCurrent = item.start <= new Date() && item.end >= new Date();

          return (
            <div key={item.id}>
              {/* חלון זמן פנוי לפני */}
              {index > 0 && freeSlots.find(slot => 
                slot.start.getTime() === scheduleItems[index - 1].end.getTime() &&
                slot.end.getTime() === item.start.getTime()
              ) && (
                <div className="my-2 px-4 py-2 bg-gray-50 rounded-lg text-sm text-gray-500 text-center">
                  חלון זמן פנוי: {format(freeSlots[index - 1].start, 'HH:mm')} - {format(freeSlots[index - 1].end, 'HH:mm')}
                  <br />
                  ({Math.round(freeSlots[index - 1].duration)} דקות)
                </div>
              )}

              {/* פריט בלוז */}
              <div
                className={`
                  p-3 rounded-lg flex items-center gap-3
                  ${isPast ? 'opacity-50' : ''}
                  ${isCurrent ? 'ring-2 ring-primary-500' : ''}
                  ${item.type === 'task' ? 'bg-white border' : 'bg-gray-50'}
                `}
              >
                <div className="w-16 text-sm">
                  {format(item.start, 'HH:mm')}
                </div>

                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    {item.world && (
                      <span 
                        className="w-2 h-2 rounded-full"
                        style={{ backgroundColor: getWorldColor(item.world.category) }}
                      />
                    )}
                    <span className={item.isCompleted ? 'line-through text-gray-400' : ''}>
                      {item.title}
                    </span>
                  </div>
                  <div className="text-sm text-gray-500">
                    {format(item.start, 'HH:mm')} - {format(item.end, 'HH:mm')}
                    {' '}
                    ({Math.round((item.end.getTime() - item.start.getTime()) / (1000 * 60))} דקות)
                  </div>
                </div>

                {item.type === 'task' && (
                  <input
                    type="checkbox"
                    checked={item.isCompleted}
                    onChange={() => {/* TODO: Implement task completion */}}
                    className="w-5 h-5 rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                  />
                )}
              </div>
            </div>
          );
        })}
      </div>

      {scheduleItems.length === 0 && (
        <p className="text-center text-gray-500 py-4">
          אין משימות או אירועים מתוכננים להיום
        </p>
      )}
    </div>
  );
} 