'use client';
import { useState, useEffect } from 'react';
import { Task, World, CalendarEvent } from '@/app/types';
import { useApp } from '@/hooks/useApp';
import { addDoc, collection, doc, updateDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase/config';
import DatePicker from 'react-datepicker';
import "react-datepicker/dist/react-datepicker.css";
import { TaskScheduler } from '@/app/services/TaskScheduler';
import { addMinutes, format } from 'date-fns';
import { he } from 'date-fns/locale';
import { GoogleCalendarService, GoogleCalendarResponse } from '@/app/types';
import { ExclamationCircleIcon, ExclamationTriangleIcon, InformationCircleIcon } from '@heroicons/react/24/outline';
import { useRouter } from 'next/navigation';

interface AddTaskFormProps {
  worldId: string;
  goalId: string;
  task?: Task; // אופציונלי - למקרה של עריכה
  world: World;  // הוספת world לפרופס
  onComplete: () => void;
  onCancel: () => void;
}

const DURATION_OPTIONS = [
  { value: 10, label: '10 דקות' },
  { value: 30, label: 'חצי שעה' },
  { value: 60, label: 'שעה' },
  { value: 120, label: 'שעתיים' },
  { value: 180, label: '3 שעות' },
  { value: 'custom', label: 'מותאם אישית' }
] as const;

const PRIORITY_OPTIONS = [
  { 
    value: 'HIGH', 
    label: 'דחוף', 
    icon: '⚡', 
    className: 'bg-red-50 text-red-700 border-red-200 hover:bg-red-100'
  },
  { 
    value: 'MEDIUM', 
    label: 'חשוב', 
    icon: '🎯', 
    className: 'bg-yellow-50 text-yellow-700 border-yellow-200 hover:bg-yellow-100'
  },
  { 
    value: 'LOW', 
    label: 'נחמד לעשות', 
    icon: '📝', 
    className: 'bg-green-50 text-green-700 border-green-200 hover:bg-green-100'
  }
] as const;

// מחוץ לקומפוננטה - פונקציית עזר
const getDateString = (date: Date | string) => {
  if (!date) return '';
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  return dateObj.toISOString();
};

export default function AddTaskForm({ worldId, goalId, task, world, onComplete, onCancel }: AddTaskFormProps) {
  const { user, googleCalendar, connectedCalendars } = useApp();
  const router = useRouter();
  const [title, setTitle] = useState(task?.title || '');
  const [selectedDuration, setSelectedDuration] = useState<string | number>(task?.estimatedDuration || 30);
  const [customDuration, setCustomDuration] = useState('');
  const [durationUnit, setDurationUnit] = useState<'minutes' | 'hours'>('minutes');
  const [priority, setPriority] = useState<Task['priority']>(task?.priority || 'MEDIUM');
  const [dueDateTime, setDueDateTime] = useState<Date | null>(() => {
    if (task?.deadline) {
      const date = new Date(task.deadline);
      return isNaN(date.getTime()) ? null : date;
    }
    return null;
  });
  const [isLoading, setIsLoading] = useState(false);
  const [suggestedTime, setSuggestedTime] = useState<Date | null>(null);
  const [conflicts, setConflicts] = useState<{
    events: CalendarEvent[];
    scheduledStart: Date;
  } | null>(null);
  const [error, setError] = useState<{
    title: string;
    message: string;
    type: 'error' | 'warning' | 'info';
    actionButton?: {
      text: string;
      action: () => void;
    };
  } | null>(null);

  const handleDurationChange = (value: string) => {
    setSelectedDuration(value === 'custom' ? 'custom' : Number(value));
  };

  const calculateFinalDuration = () => {
    if (selectedDuration === 'custom') {
      const duration = parseInt(customDuration);
      return durationUnit === 'hours' ? duration * 60 : duration;
    }
    return selectedDuration as number;
  };

  const findAvailableSlot = async () => {
    if (!googleCalendar || !user?.googleCalendarConnected) {
      console.error('Google Calendar not connected');
      return;
    }

    // מציאת היומן הראשי (או הראשון) מהיומנים המחוברים
    const primaryCalendar = connectedCalendars.find(cal => 
      cal.type === 'TASKS' || cal.isActive
    );

    if (!primaryCalendar) {
      console.error('No active calendar found');
      alert('לא נמצא יומן פעיל. אנא הגדר יומן ברירת מחדל בהגדרות.');
      return;
    }

    setIsLoading(true);
    try {
      const calendarWithId = {
        ...googleCalendar,
        calendarId: primaryCalendar.googleCalendarId
      };

      console.log('Creating TaskScheduler with calendar:', calendarWithId);
      const scheduler = new TaskScheduler([calendarWithId]);
      
      const taskData = {
        title,
        estimatedDuration: calculateFinalDuration(),
        priority,
        deadline: dueDateTime?.toISOString(),
        id: task?.id || '',
        worldId,
      } as Task;
      
      console.log('Finding slot for task:', taskData);
      
      const result = await scheduler.findNextAvailableSlot(taskData, world);
      console.log('Scheduler result:', result);
      
      if (result.success && result.scheduledStart) {
        setSuggestedTime(result.scheduledStart);
        
        if (result.conflictingEvents?.length) {
          setConflicts({
            events: result.conflictingEvents,
            scheduledStart: result.scheduledStart
          });
        }
      } else {
        setError({
          title: 'לא נמצא זמן פנוי',
          message: result.error || 'לא נמצא זמן פנוי מתאים למשימה',
          type: 'warning',
          actionButton: result.diagnosticInfo.failureReason === 'NO_TIME_SLOTS' ? {
            text: 'להגדרת זמנים',
            action: () => {
              router.push(`/worlds/${worldId}/settings#timeSlots`);
            }
          } : undefined
        });
      }
    } catch (error) {
      console.error('Detailed error in finding available slot:', error);
      setError({
        title: 'שגיאה',
        message: 'אירעה שגיאה בחיפוש זמן פנוי. אנא נסה שוב.',
        type: 'error'
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    setIsLoading(true);
    try {
      const taskData = {
        title,
        estimatedDuration: calculateFinalDuration(),
        priority,
        deadline: dueDateTime ? dueDateTime.toISOString() : null,
        status: task?.status || 'PENDING',
        worldId,
        goalId,
        updatedAt: new Date().toISOString(),
        createdAt: task?.createdAt || new Date().toISOString(),
        scheduledStart: suggestedTime?.toISOString(),
        scheduledEnd: suggestedTime ? 
          addMinutes(suggestedTime, calculateFinalDuration()).toISOString() : 
          null
      };

      if (task?.id) {
        const taskRef = doc(db, `users/${user.id}/worlds/${worldId}/goals/${goalId}/tasks/${task.id}`);
        await updateDoc(taskRef, taskData);
      } else {
        const tasksRef = collection(db, `users/${user.id}/worlds/${worldId}/goals/${goalId}/tasks`);
        await addDoc(tasksRef, taskData);
      }
      
      onComplete();
    } catch (error) {
      console.error('Error saving task:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const googleCalendarApi: GoogleCalendarService = {
    connect: async () => {
      // ... existing connect logic ...
    },
    disconnect: async () => {
      // ... existing disconnect logic ...
    },
    getEvents: async (timeMin: Date, timeMax: Date): Promise<GoogleCalendarResponse> => {
      if (!user) {
        return { items: [] };
      }
      
      try {
        const response = await fetch(
          `/api/calendar/events?timeMin=${timeMin.toISOString()}&timeMax=${timeMax.toISOString()}`
        );
        
        if (!response.ok) {
          throw new Error('Failed to fetch events');
        }
        
        const data = await response.json();
        
        // וידוא שיש לנו מערך items תקין
        const items = Array.isArray(data.items) ? data.items : [];
        
        // החזרת אובייקט בפורמט הנכון
        return {
          items: items.map((event: any) => ({
            id: event.id,
            source: 'google' as const,
            calendarId: event.calendarId,
            title: event.summary || '',
            start: new Date(event.start.dateTime || event.start.date),
            end: new Date(event.end.dateTime || event.end.date)
          }))
        };
      } catch (error) {
        console.error('Error fetching calendar events:', error);
        return { items: [] };
      }
    }
  };

  useEffect(() => {
    if (task?.deadline) {
      const createdAtString = getDateString(task.createdAt);
      const deadlineString = getDateString(task.deadline);
      
      // שימוש בערכים פרימיטיביים כדיפנדנסי
      console.log('Task Dates:', {
        createdAt: new Date(createdAtString),
        deadline: new Date(deadlineString)
      });
    }
  }, [task?.id]); // תלות רק ב-ID של המשימה

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          שם המשימה
        </label>
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          className="w-full p-2 border rounded-md"
          required
        />
      </div>

      <div className="space-y-2">
        <label className="block text-sm font-medium text-gray-700">
          משך זמן משוער
        </label>
        <select
          value={selectedDuration}
          onChange={(e) => handleDurationChange(e.target.value)}
          className="w-full p-2 border rounded-md"
        >
          {DURATION_OPTIONS.map(option => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>

        {selectedDuration === 'custom' && (
          <div className="flex gap-2 mt-2">
            <input
              type="number"
              value={customDuration}
              onChange={(e) => setCustomDuration(e.target.value)}
              placeholder="הזן משך זמן"
              className="flex-1 p-2 border rounded-md"
              min="1"
            />
            <select
              value={durationUnit}
              onChange={(e) => setDurationUnit(e.target.value as 'minutes' | 'hours')}
              className="w-32 p-2 border rounded-md"
            >
              <option value="minutes">דקות</option>
              <option value="hours">שעות</option>
            </select>
          </div>
        )}
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          תאריך ושעת יעד
        </label>
        <div className="relative">
          <DatePicker
            selected={dueDateTime}
            onChange={(date) => setDueDateTime(date)}
            showTimeSelect
            timeFormat="HH:mm"
            timeIntervals={15}
            dateFormat="dd/MM/yyyy HH:mm"
            placeholderText="בחר תאריך ושעה"
            className="w-full p-2 border rounded-md text-right"
            timeCaption="שעה"
            calendarStartDay={0}
            nextMonthButtonLabel="→"
            previousMonthButtonLabel="←"
            popperPlacement="bottom-end"
            customInput={
              <input
                className="w-full p-2 border rounded-md text-right hover:border-primary-500 focus:border-primary-500 focus:ring-1 focus:ring-primary-500 transition-colors"
                placeholder="בחר תאריך ושעה"
              />
            }
          />
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          דחיפות
        </label>
        <div className="grid grid-cols-3 gap-2">
          {PRIORITY_OPTIONS.map((option) => (
            <button
              key={option.value}
              type="button"
              onClick={() => setPriority(option.value)}
              className={`
                p-3 rounded-lg flex flex-col items-center justify-center
                transition-all duration-200 ease-in-out
                ${priority === option.value 
                  ? option.className
                  : 'bg-gray-50 border border-gray-200 hover:bg-gray-100'
                }
              `}
            >
              <span className="text-2xl mb-1">{option.icon}</span>
              <span className="text-sm font-medium">{option.label}</span>
            </button>
          ))}
        </div>
      </div>

      {suggestedTime && (
        <div className="bg-green-50 p-4 rounded-lg">
          <h3 className="font-medium text-green-800 mb-2">זמן מוצע למשימה:</h3>
          <p className="text-green-700">
            {format(suggestedTime, 'EEEE, d בMMMM בשעה HH:mm', { locale: he })}
          </p>
          <button
            type="button"
            onClick={findAvailableSlot}
            className="mt-2 text-sm text-green-600 hover:text-green-800"
          >
            חפש זמן אחר
          </button>
        </div>
      )}

      <div className="flex gap-2 justify-end">
        <button
          type="button"
          onClick={onCancel}
          className="px-4 py-2 text-gray-600 hover:bg-gray-50 rounded-md"
        >
          ביטול
        </button>
        {!suggestedTime ? (
          <button
            type="button"
            onClick={findAvailableSlot}
            disabled={isLoading}
            className="px-4 py-2 bg-primary-500 text-white rounded-md hover:bg-primary-600 disabled:opacity-50"
          >
            {isLoading ? 'מחפש זמן פנוי...' : 'מצא זמן פנוי'}
          </button>
        ) : (
          <button
            type="submit"
            disabled={isLoading}
            className="px-4 py-2 bg-primary-500 text-white rounded-md hover:bg-primary-600 disabled:opacity-50"
          >
            {isLoading ? 'שומר...' : task?.id ? 'עדכן משימה' : 'הוסף משימה'}
          </button>
        )}
      </div>

      {error && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full">
            <div className="flex items-center mb-4">
              {error.type === 'error' && <ExclamationCircleIcon className="w-6 h-6 text-red-500 mr-2" />}
              {error.type === 'warning' && <ExclamationTriangleIcon className="w-6 h-6 text-yellow-500 mr-2" />}
              {error.type === 'info' && <InformationCircleIcon className="w-6 h-6 text-blue-500 mr-2" />}
              <h3 className="text-lg font-medium">{error.title}</h3>
            </div>
            <div className="whitespace-pre-wrap text-gray-600">
              {error.message}
            </div>
            <div className="mt-6 flex justify-end">
              {error.actionButton && (
                <button
                  onClick={error.actionButton.action}
                  className="px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-md text-gray-800"
                >
                  {error.actionButton.text}
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </form>
  );
} 