'use client';
import { useApp } from '@/app/contexts/AppContext';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase/config';
import { ConnectedCalendar } from '@/app/types';
import MiniCalendar from './MiniCalendar';

interface SidebarProps {
  showSidebar: boolean;
  currentDate: Date;
  onDateChange: (date: Date) => void;
}

export default function Sidebar({ showSidebar, currentDate, onDateChange }: SidebarProps) {
  const { user, connectedCalendars } = useApp();

  const toggleCalendarActive = async (calendar: ConnectedCalendar) => {
    if (!user) return;
    
    try {
      const calendarRef = doc(db, 'users', user.id, 'connectedCalendars', calendar.id);
      await updateDoc(calendarRef, {
        isActive: !calendar.isActive,
        updatedAt: new Date()
      });
    } catch (error) {
      console.error('Error toggling calendar:', error);
    }
  };

  if (!showSidebar) return null;

  return (
    <div className="w-64 border-l bg-gray-50 overflow-y-auto">
      <div className="p-4">
        <MiniCalendar 
          currentDate={currentDate}
          onDateChange={onDateChange}
        />
        <div className="mb-6">
          <h3 className="text-lg font-semibold mb-2">יומנים מחוברים</h3>
          <div className="space-y-2">
            {connectedCalendars.map(calendar => (
              <div 
                key={calendar.id}
                className="flex items-center justify-between p-2 rounded hover:bg-gray-50"
              >
                <div className="flex items-center gap-2">
                  <div 
                    className="w-3 h-3 rounded-full"
                    style={{ backgroundColor: calendar.color || '#666' }}
                  />
                  <span className="text-sm">{calendar.name}</span>
                </div>
                <button
                  onClick={() => toggleCalendarActive(calendar)}
                  className={`
                    w-4 h-4 rounded border flex items-start justify-center
                    ${calendar.isActive 
                      ? 'bg-primary-500 border-primary-500' 
                      : 'bg-white border-gray-300'
                    }
                  `}
                >
                  {calendar.isActive && (
                    <span className="text-white text-[10px] leading-3">✓</span>
                  )}
                </button>
              </div>
            ))}
          </div>
        </div>
        
        <div>
          <h3 className="text-lg font-semibold mb-2">משימות להיום</h3>
          <p className="text-sm text-gray-500">בקרוב...</p>
        </div>
      </div>
    </div>
  );
} 