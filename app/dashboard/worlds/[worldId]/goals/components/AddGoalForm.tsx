'use client';
import { useState } from 'react';
import { Goal } from '@/app/types';
import { useApp } from '@/app/lib/hooks/useApp';
import { addDoc, collection } from 'firebase/firestore';
import { db } from '@/app/lib/firebase/config';

interface AddGoalFormProps {
  worldId: string;
  onComplete: () => void;
  onCancel: () => void;
}

export default function AddGoalForm({ worldId, onComplete, onCancel }: AddGoalFormProps) {
  const { user } = useApp();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [target, setTarget] = useState<number>(0);
  const [deadline, setDeadline] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !title.trim() || target <= 0) return;

    setIsLoading(true);
    try {
      const goalsRef = collection(db, `users/${user.id}/worlds/${worldId}/goals`);
      const newGoal: Omit<Goal, 'id'> = {
        worldId,
        userId: user.id,
        title: title.trim(),
        description: description.trim(),
        target,
        currentProgress: 0,
        timeInvested: 0,
        deadline: deadline ? new Date(deadline) : undefined,
        isCompleted: false,
        createdAt: new Date(),
        updatedAt: new Date()
      };

      await addDoc(goalsRef, newGoal);
      onComplete();
    } catch (err) {
      console.error('Error adding goal:', err);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-neutral-900 mb-1">
          מטרה
        </label>
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="למשל: להשיג 20 שיתופי פעולה"
          className="w-full p-2 border rounded-md"
          required
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-neutral-900 mb-1">
          תיאור
        </label>
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="פרט את המטרה..."
          className="w-full p-2 border rounded-md h-24"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-neutral-900 mb-1">
          יעד מספרי
        </label>
        <input
          type="number"
          value={target}
          onChange={(e) => setTarget(Number(e.target.value))}
          min="1"
          className="w-full p-2 border rounded-md"
          required
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-neutral-900 mb-1">
          תאריך יעד
        </label>
        <input
          type="date"
          value={deadline}
          onChange={(e) => setDeadline(e.target.value)}
          className="w-full p-2 border rounded-md"
        />
      </div>

      <div className="flex gap-2 justify-end">
        <button
          type="button"
          onClick={onCancel}
          className="px-4 py-2 text-neutral-800 hover:bg-neutral-50 rounded-md"
        >
          ביטול
        </button>
        <button
          type="submit"
          disabled={isLoading}
          className="px-4 py-2 bg-primary-500 text-white rounded-md hover:bg-primary-600 disabled:opacity-50"
        >
          {isLoading ? 'שומר...' : 'הוסף מטרה'}
        </button>
      </div>
    </form>
  );
} 