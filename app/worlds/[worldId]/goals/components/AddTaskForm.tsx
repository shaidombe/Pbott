'use client';
import { useState } from 'react';
import { Task } from '@/app/types';
import { useApp } from '@/lib/hooks/useApp';
import { addDoc, collection, doc, updateDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase/config';
import DatePicker from 'react-datepicker';
import "react-datepicker/dist/react-datepicker.css";

interface AddTaskFormProps {
  worldId: string;
  goalId: string;
  task?: Task; // אופציונלי - למקרה של עריכה
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

export default function AddTaskForm({ worldId, goalId, task, onComplete, onCancel }: AddTaskFormProps) {
  const { user } = useApp();
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
        createdAt: task?.createdAt || new Date().toISOString()
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

      <div className="flex gap-2 justify-end">
        <button
          type="button"
          onClick={onCancel}
          className="px-4 py-2 text-gray-600 hover:bg-gray-50 rounded-md"
        >
          ביטול
        </button>
        <button
          type="submit"
          disabled={isLoading}
          className="px-4 py-2 bg-primary-500 text-white rounded-md hover:bg-primary-600 disabled:opacity-50"
        >
          {isLoading ? 'שומר...' : task?.id ? 'עדכן משימה' : 'הוסף משימה'}
        </button>
      </div>
    </form>
  );
} 