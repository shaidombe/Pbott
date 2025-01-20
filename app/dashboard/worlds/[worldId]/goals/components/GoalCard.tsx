'use client';
import { useState, useEffect, useCallback } from 'react';
import { Goal, Task } from '@/app/types';
import TaskList from './TaskList';
import { collection, getDocs, doc, deleteDoc, updateDoc } from 'firebase/firestore';
import { db } from '@/app/lib/firebase/config';
import { useApp } from '@/app/contexts/AppContext';
import { EllipsisHorizontalIcon } from '@heroicons/react/24/outline';

interface GoalCardProps {
  worldId: string;
  goal: Goal;
  onUpdate: () => Promise<void>;
}

export default function GoalCard({ worldId, goal, onUpdate }: GoalCardProps) {
  const { user } = useApp();
  const [isExpanded, setIsExpanded] = useState(false);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [showMenu, setShowMenu] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editTitle, setEditTitle] = useState(goal.title);
  const [editDescription, setEditDescription] = useState(goal.description || '');
  
  const loadTasks = useCallback(async () => {
    if (!user) return;
    try {
      const tasksRef = collection(db, `users/${user.id}/worlds/${worldId}/goals/${goal.id}/tasks`);
      const snapshot = await getDocs(tasksRef);
      const tasksData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Task[];
      setTasks(tasksData);
    } catch (error) {
      console.error('Error loading tasks:', error);
    }
  }, [user, worldId, goal.id]);

  useEffect(() => {
    if (isExpanded) {
      loadTasks();
    }
  }, [isExpanded, loadTasks]);

  // חישוב אחוז ההתקדמות
  const progressPercentage = goal.target > 0 
    ? Math.min(100, (goal.currentProgress / goal.target) * 100)
    : 0;

  // חישוב זמן בפורמט קריא
  const formatTime = (minutes: number) => {
    if (minutes < 60) return `${minutes} דקות`;
    const hours = Math.floor(minutes / 60);
    const remainingMinutes = minutes % 60;
    return `${hours} שעות ${remainingMinutes > 0 ? `ו-${remainingMinutes} דקות` : ''}`;
  };

  const handleTaskUpdate = async () => {
    await loadTasks();  // טעינה מחדש של המשימות
    await onUpdate();   // עדכון המטרה
  };

  const handleDelete = async () => {
    if (!user || !confirm('האם אתה בטוח שברצונך למחוק מטרה זו?')) return;

    try {
      const goalRef = doc(db, `users/${user.id}/worlds/${worldId}/goals/${goal.id}`);
      await deleteDoc(goalRef);
      await onUpdate();
    } catch (err) {
      console.error('Error deleting goal:', err);
      alert('אירעה שגיאה במחיקת המטרה');
    }
  };

  const handleUpdate = async () => {
    if (!user || !editTitle.trim()) return;

    try {
      const goalRef = doc(db, `users/${user.id}/worlds/${worldId}/goals/${goal.id}`);
      await updateDoc(goalRef, {
        title: editTitle.trim(),
        description: editDescription.trim(),
        updatedAt: new Date()
      });
      await onUpdate();
      setIsEditing(false);
    } catch (err) {
      console.error('Error updating goal:', err);
      alert('אירעה שגיאה בעדכון המטרה');
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-sm p-4">
      {/* כותרת ופרטים */}
      <div className="flex justify-between items-start mb-4">
        {isEditing ? (
          <div className="flex-1 ml-4">
            <input
              type="text"
              value={editTitle}
              onChange={(e) => setEditTitle(e.target.value)}
              className="w-full p-2 mb-2 border rounded-md"
              placeholder="שם המטרה"
            />
            <textarea
              value={editDescription}
              onChange={(e) => setEditDescription(e.target.value)}
              className="w-full p-2 border rounded-md"
              placeholder="תיאור המטרה"
              rows={2}
            />
            <div className="flex gap-2 mt-2">
              <button
                onClick={handleUpdate}
                className="px-3 py-1 bg-primary-500 text-white rounded-md text-sm"
              >
                שמור
              </button>
              <button
                onClick={() => setIsEditing(false)}
                className="px-3 py-1 text-gray-600 rounded-md text-sm"
              >
                ביטול
              </button>
            </div>
          </div>
        ) : (
          <div className="flex-1 ml-4">
            <h3 className="text-lg font-semibold">{goal.title}</h3>
            <p className="text-gray-600 text-sm">{goal.description}</p>
          </div>
        )}
        
        <div className="relative">
          <button
            onClick={() => setShowMenu(!showMenu)}
            className="p-1 hover:bg-gray-100 rounded-full"
          >
            <EllipsisHorizontalIcon className="w-6 h-6 text-gray-500" />
          </button>
          
          {showMenu && (
            <div className="absolute left-0 mt-1 py-2 w-48 bg-white rounded-md shadow-lg z-10 border">
              <button
                onClick={() => {
                  setIsEditing(true);
                  setShowMenu(false);
                }}
                className="w-full px-4 py-2 text-right text-sm text-gray-700 hover:bg-gray-100"
              >
                ערוך מטרה
              </button>
              <button
                onClick={() => {
                  handleDelete();
                  setShowMenu(false);
                }}
                className="w-full px-4 py-2 text-right text-sm text-red-600 hover:bg-red-50"
              >
                מחק מטרה
              </button>
            </div>
          )}
        </div>

        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="text-gray-400 hover:text-primary-500 ml-2"
        >
          {isExpanded ? '▼' : '▶'}
        </button>
      </div>

      {/* פרוגרס בר */}
      <div className="mb-4">
        <div className="flex justify-between text-sm text-gray-600 mb-1">
          <span>{goal.currentProgress} מתוך {goal.target}</span>
          <span>{Math.round(progressPercentage)}%</span>
        </div>
        <div className="w-full bg-gray-100 rounded-full h-2">
          <div 
            className="bg-primary-500 h-2 rounded-full transition-all duration-300"
            style={{ width: `${progressPercentage}%` }}
          />
        </div>
      </div>

      {/* סטטיסטיקות */}
      <div className="flex justify-between text-sm text-gray-600 mb-4">
        <span>זמן שהושקע: {formatTime(goal.timeInvested)}</span>
        {goal.deadline && (
          <span>תאריך יעד: {new Date(goal.deadline).toLocaleDateString('he-IL')}</span>
        )}
      </div>

      {/* רשימת משימות */}
      {isExpanded && (
        <TaskList 
          worldId={worldId}
          goalId={goal.id} 
          tasks={tasks}
          onUpdate={handleTaskUpdate}
        />
      )}
    </div>
  );
} 