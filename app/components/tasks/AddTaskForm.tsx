'use client';

import { useState } from 'react';
import { Task, World, CalendarEvent } from '@/app/types';
import { useApp } from '@/app/lib/hooks/useApp';
import { TaskScheduler } from '@/app/services/TaskScheduler';
import { addDoc, collection } from 'firebase/firestore';
import { db } from '@/app/lib/firebase/config';
import DatePicker from 'react-datepicker';
import "react-datepicker/dist/react-datepicker.css";

interface AddTaskFormProps {
  worldId: string;
  goalId: string;
  world: World;
  existingEvents: CalendarEvent[];
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
  { value: 'HIGH', label: 'דחוף', icon: '🔥' },
  { value: 'MEDIUM', label: 'חשוב', icon: '⭐' },
  { value: 'LOW', label: 'רגיל', icon: '📝' }
] as const;

export default function AddTaskForm({ worldId, goalId, world, existingEvents, onComplete, onCancel }: AddTaskFormProps) {
  const { user } = useApp();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [priority, setPriority] = useState<Task['priority']>('MEDIUM');
  const [duration, setDuration] = useState(30);
  const [deadline, setDeadline] = useState<Date | null>(null);
  const [customDuration, setCustomDuration] = useState(30);
  const [showCustomDuration, setShowCustomDuration] = useState(false);
  const [isScheduling, setIsScheduling] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user?.id) {
      setError('משתמש לא מחובר');
      return;
    }

    try {
      setIsScheduling(true);
      setError('');

      const scheduler = new TaskScheduler();
      const taskData: Partial<Task> = {
        title,
        description,
        priority,
        estimatedDuration: showCustomDuration ? customDuration : duration,
        deadline: deadline || undefined,
        status: 'PENDING',
        worldId,
        goalId,
        createdAt: new Date(),
        updatedAt: new Date()
      };

      // מצא זמן פנוי למשימה
      const scheduleResult = await scheduler.findNextAvailableSlot(
        taskData as Task,
        world,
        existingEvents
      );

      if (!scheduleResult.success) {
        setError('לא נמצא זמן פנוי למשימה. נסה לשנות את משך המשימה או את התאריך היעד.');
        return;
      }

      if (scheduleResult.isOutOfPreferredTime) {
        const shouldSchedule = window.confirm(
          'הזמן היחיד שנמצא הוא מחוץ לשעות המועדפות. האם ברצונך לקבוע את המשימה בכל זאת?'
        );
        if (!shouldSchedule) return;
      }

      // עדכן את זמני המשימה
      taskData.scheduledStart = scheduleResult.scheduledStart;
      taskData.scheduledEnd = scheduleResult.scheduledEnd;
      taskData.isOutOfPreferredTime = scheduleResult.isOutOfPreferredTime;

      // שמור את המשימה
      const tasksRef = collection(db, `users/${user.id}/worlds/${worldId}/goals/${goalId}/tasks`);
      await addDoc(tasksRef, taskData);

      onComplete();
    } catch (err) {
      console.error('Error adding task:', err);
      setError('אירעה שגיאה בהוספת המשימה');
    } finally {
      setIsScheduling(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-700">כותרת</label>
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500"
          required
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700">תיאור</label>
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500"
          rows={3}
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700">עדיפות</label>
        <select
          value={priority}
          onChange={(e) => setPriority(e.target.value as Task['priority'])}
          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500"
        >
          {PRIORITY_OPTIONS.map(option => (
            <option key={option.value} value={option.value}>
              {option.icon} {option.label}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700">משך משוער</label>
        <select
          value={showCustomDuration ? 'custom' : duration}
          onChange={(e) => {
            if (e.target.value === 'custom') {
              setShowCustomDuration(true);
            } else {
              setShowCustomDuration(false);
              setDuration(Number(e.target.value));
            }
          }}
          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500"
        >
          {DURATION_OPTIONS.map(option => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>

        {showCustomDuration && (
          <input
            type="number"
            value={customDuration}
            onChange={(e) => setCustomDuration(Number(e.target.value))}
            className="mt-2 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500"
            min="5"
            max="480"
            step="5"
          />
        )}
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700">תאריך יעד (אופציונלי)</label>
        <DatePicker
          selected={deadline}
          onChange={(date) => setDeadline(date)}
          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500"
          dateFormat="dd/MM/yyyy"
          minDate={new Date()}
          placeholderText="בחר תאריך"
        />
      </div>

      {error && (
        <div className="text-red-500 text-sm">{error}</div>
      )}

      <div className="flex justify-end gap-2">
        <button
          type="button"
          onClick={onCancel}
          className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
        >
          ביטול
        </button>
        <button
          type="submit"
          disabled={isScheduling}
          className="px-4 py-2 text-sm font-medium text-white bg-primary-600 rounded-md hover:bg-primary-700 disabled:opacity-50"
        >
          {isScheduling ? 'מתזמן...' : 'הוסף משימה'}
        </button>
      </div>
    </form>
  );
} 