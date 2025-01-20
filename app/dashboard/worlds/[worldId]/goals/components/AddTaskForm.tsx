'use client';
import { useState } from 'react';
import { Task } from '@/app/types';
import { useApp } from '@/app/lib/hooks/useApp';
import { addDoc, collection } from 'firebase/firestore';
import { db } from '@/app/lib/firebase/config';
import DatePicker from 'react-datepicker';
import "react-datepicker/dist/react-datepicker.css";

interface AddTaskFormProps {
  worldId: string;
  goalId: string;
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
  { value: 'HIGH', label: 'דחוף', icon: '🔥', className: 'bg-red-500 text-white' },
  { value: 'MEDIUM', label: 'חשוב מאוד', icon: '🔥🔥', className: 'bg-yellow-500 text-black' },
  { value: 'LOW', label: 'צריך לעשות', icon: '🔥🔥🔥', className: 'bg-green-500 text-white' }
] as const;

export default function AddTaskForm({ worldId, goalId, onComplete, onCancel }: AddTaskFormProps) {
  const { user } = useApp();
  const [title, setTitle] = useState('');
  const [selectedDuration, setSelectedDuration] = useState<string | number>(30);
  const [customDuration, setCustomDuration] = useState('');
  const [durationUnit, setDurationUnit] = useState<'minutes' | 'hours'>('minutes');
  const [priority, setPriority] = useState<Task['priority']>('MEDIUM');
  const [dueDateTime, setDueDateTime] = useState<Date | null>(null);
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
    if (!user || !title.trim()) return;

    const finalDuration = calculateFinalDuration();
    if (isNaN(finalDuration) || finalDuration <= 0) return;

    setIsLoading(true);
    try {
      const tasksRef = collection(db, `users/${user.id}/worlds/${worldId}/goals/${goalId}/tasks`);
      const newTask: Omit<Task, 'id'> = {
        worldId,
        goalId,
        title: title.trim(),
        description: '',
        estimatedDuration: finalDuration,
        priority,
        status: 'PENDING',
        deadline: dueDateTime || undefined,
        createdAt: new Date(),
        updatedAt: new Date()
      };

      await addDoc(tasksRef, newTask);
      onComplete();
    } catch (err) {
      console.error('Error adding task:', err);
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
        <div className="flex gap-2">
          {PRIORITY_OPTIONS.map((option) => (
            <button
              key={option.value}
              type="button"
              onClick={() => setPriority(option.value)}
              data-selected={priority === option.value}
              className={`
                flex-1 px-4 py-3 rounded-lg border-2 transition-all
                flex items-center justify-center gap-2
                ${option.className}
              `}
            >
              <span className="text-lg">{option.icon}</span>
              <span className="font-medium">{option.label}</span>
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
          {isLoading ? 'שומר...' : 'הוסף משימה'}
        </button>
      </div>
    </form>
  );
} 