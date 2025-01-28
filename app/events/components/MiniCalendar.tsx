import React from 'react';
import { ChevronLeftIcon, ChevronRightIcon } from '@heroicons/react/24/outline';
import { format, addMonths, subMonths, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isSameDay, startOfWeek, endOfWeek } from 'date-fns';
import { he } from 'date-fns/locale';

interface MiniCalendarProps {
  currentDate: Date;
  onDateChange: (date: Date) => void;
}

export default function MiniCalendar({ currentDate, onDateChange }: MiniCalendarProps) {
  const [displayMonth, setDisplayMonth] = React.useState(() => startOfMonth(new Date(currentDate)));
  
  const weekDays = ['א', 'ב', 'ג', 'ד', 'ה', 'ו', 'ש'];
  
  const start = startOfWeek(startOfMonth(displayMonth), { locale: he });
  const end = endOfWeek(endOfMonth(displayMonth), { locale: he });
  const days = eachDayOfInterval({ start, end });

  const handlePrevMonth = () => setDisplayMonth(prev => subMonths(prev, 1));
  const handleNextMonth = () => setDisplayMonth(prev => addMonths(prev, 1));

  return (
    <div className="p-4 bg-white rounded-lg shadow-sm">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <button onClick={handlePrevMonth} className="p-1 hover:bg-gray-100 rounded-full">
          <ChevronRightIcon className="w-4 h-4" />
        </button>
        <span className="text-sm font-medium">
          {format(displayMonth, 'MMMM yyyy', { locale: he })}
        </span>
        <button onClick={handleNextMonth} className="p-1 hover:bg-gray-100 rounded-full">
          <ChevronLeftIcon className="w-4 h-4" />
        </button>
      </div>

      {/* Calendar Grid */}
      <div className="grid grid-cols-7 gap-1">
        {/* Week days */}
        {weekDays.map(day => (
          <div key={day} className="text-center text-xs text-gray-500 font-medium p-1">
            {day}
          </div>
        ))}
        
        {/* Days */}
        {days.map(day => {
          const isCurrentMonth = isSameMonth(day, displayMonth);
          const isToday = isSameDay(day, new Date());
          const isSelected = isSameDay(day, currentDate);
          
          return (
            <button
              key={day.toISOString()}
              onClick={() => onDateChange(day)}
              className={`
                text-center p-1 text-sm rounded-full
                hover:bg-gray-100
                ${!isCurrentMonth ? 'text-gray-300' : 'text-gray-700'}
                ${isToday ? 'font-bold text-primary-600' : ''}
                ${isSelected ? 'bg-primary-100 text-primary-700' : ''}
              `}
            >
              {format(day, 'd')}
            </button>
          );
        })}
      </div>
    </div>
  );
} 