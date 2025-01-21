'use client';
import { useState, useEffect } from 'react';
import { Goal } from '@/app/types';
import { useApp } from '@/app/lib/hooks/useApp';
import { addDoc, collection, doc, updateDoc } from 'firebase/firestore';
import { db } from '@/app/lib/firebase/config';
import DatePicker from 'react-datepicker';
import "react-datepicker/dist/react-datepicker.css";

interface AddGoalFormProps {
  worldId: string;
  goal?: Goal;
  onComplete: () => void;
  onCancel: () => void;
}

const IMPORTANCE_OPTIONS = [
  { value: 'MUST', label: 'חייב לעשות', icon: '⚡' },
  { value: 'VERY_HIGH', label: 'חשוב מאוד', icon: '🎯' },
  { value: 'HIGH', label: 'חשוב', icon: '📝' }
] as const;

const MEASUREMENT_TYPES = [
  { value: 'TASKS', label: 'כמות משימות שהושלמו' },
  { value: 'NUMERIC', label: 'מספר (למשל: שעות, לקוחות..)' }
] as const;

export default function AddGoalForm({ worldId, goal, onComplete, onCancel }: AddGoalFormProps) {
  const { user } = useApp();
  const [title, setTitle] = useState(goal?.title || '');
  const [description, setDescription] = useState(goal?.description || '');
  const [importance, setImportance] = useState<Goal['importance']>(goal?.importance || 'HIGH');
  const [deadline, setDeadline] = useState<Date | null>(() => {
    if (goal?.deadline) {
      const date = new Date(goal.deadline);
      return isNaN(date.getTime()) ? null : date;
    }
    return null;
  });
  const [measurementType, setMeasurementType] = useState<Goal['measurementType']>(
    goal?.measurementType || 'NUMERIC'
  );
  const [target, setTarget] = useState<number>(goal?.target || 0);
  const [targetUnit, setTargetUnit] = useState(goal?.targetUnit || '');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !title.trim() || !deadline || isNaN(deadline.getTime())) {
      alert('נא למלא את כל השדות הנדרשים ולבחור תאריך תקין');
      return;
    }

    setIsLoading(true);
    try {
      const now = new Date().toISOString();
      const goalData = {
        title: title.trim(),
        description: description.trim(),
        importance,
        deadline: deadline.toISOString(),
        measurementType,
        target,
        targetUnit: measurementType === 'NUMERIC' ? targetUnit : 'tasks',
        updatedAt: now,
        createdAt: now
      };

      if (goal?.id) {
        // עריכה
        const goalRef = doc(db, `users/${user.id}/worlds/${worldId}/goals/${goal.id}`);
        await updateDoc(goalRef, goalData);
      } else {
        // הוספה חדשה
        const goalsRef = collection(db, `users/${user.id}/worlds/${worldId}/goals`);
        await addDoc(goalsRef, {
          ...goalData,
          worldId,
          userId: user.id,
          currentProgress: 0,
          timeInvested: 0,
          isCompleted: false,
          createdAt: now
        });
      }
      onComplete();
    } catch (err) {
      console.error('Error saving goal:', err);
      alert(goal?.id ? 'אירעה שגיאה בעדכון המטרה' : 'אירעה שגיאה בהוספת המטרה');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="w-full max-w-4xl mx-auto space-y-6">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          כותרת המטרה
        </label>
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          className="w-full p-2 border rounded-md"
          required
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          תיאור
        </label>
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          className="w-full p-2 border rounded-md h-24"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          רמת חשיבות
        </label>
        <div className="grid grid-cols-3 gap-2">
          {IMPORTANCE_OPTIONS.map((option) => (
            <button
              key={option.value}
              type="button"
              onClick={() => setImportance(option.value)}
              className={`
                p-3 rounded-lg flex flex-col items-center justify-center
                transition-all duration-200 ease-in-out
                ${importance === option.value 
                  ? 'bg-primary-100 border-2 border-primary-500 text-primary-700' 
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

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          תאריך יעד
        </label>
        <DatePicker
          selected={deadline}
          onChange={(date) => setDeadline(date)}
          dateFormat="dd/MM/yyyy"
          minDate={new Date()}
          placeholderText="בחר תאריך יעד"
          className="w-full p-2 border rounded-md"
          required
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          איך נמדוד את ההתקדמות?
        </label>
        <select
          value={measurementType}
          onChange={(e) => setMeasurementType(e.target.value as typeof MEASUREMENT_TYPES[number]['value'])}
          className="w-full p-2 border rounded-md mb-2"
        >
          {MEASUREMENT_TYPES.map(type => (
            <option key={type.value} value={type.value}>{type.label}</option>
          ))}
        </select>

        <div className="flex gap-2">
          <input
            type="number"
            value={target}
            onChange={(e) => setTarget(Number(e.target.value))}
            min="1"
            className="w-24 p-2 border rounded-md"
            required
          />
          {measurementType === 'NUMERIC' && (
            <input
              type="text"
              value={targetUnit}
              onChange={(e) => setTargetUnit(e.target.value)}
              placeholder="יחידת מדידה"
              className="flex-1 p-2 border rounded-md"
              required
            />
          )}
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
          {isLoading ? 'שומר...' : goal?.id ? 'עדכן מטרה' : 'הוסף מטרה'}
        </button>
      </div>
    </form>
  );
} 