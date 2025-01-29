'use client';
import { useState, useEffect } from 'react';
import { Task, World } from '@/app/types';
import AddTaskForm from './AddTaskForm';
import { PencilIcon } from '@heroicons/react/24/outline';
import { doc, updateDoc, getDoc, collection, getDocs } from 'firebase/firestore';
import { db } from '@/lib/firebase/config';
import { useApp } from '@/lib/hooks/useApp';
import { WorldCategory } from '@/app/types';

interface TaskListProps {
  worldId: string;
  goalId: string;
  tasks: Task[];
  onUpdate: () => Promise<void>;
}

// פונקציה להמרת דקות לפורמט קריא
const formatDuration = (minutes: number) => {
  if (minutes < 60) {
    return `${minutes} דקות`;
  } else {
    const hours = Math.floor(minutes / 60);
    const remainingMinutes = minutes % 60;
    if (remainingMinutes === 0) {
      return hours === 1 ? 'שעה' : `${hours} שעות`;
    }
    return `${hours} שעות ו-${remainingMinutes} דקות`;
  }
};

// פונקציה לפורמט תאריך ושעה
const formatDateTime = (date: Date) => {
  return date.toLocaleString('he-IL', {
    day: 'numeric',
    month: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
};

export default function TaskList({ worldId, goalId, tasks, onUpdate }: TaskListProps) {
  const { user } = useApp();
  const [showAddTask, setShowAddTask] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [isGoogleCalendarConnected, setIsGoogleCalendarConnected] = useState(false);

  useEffect(() => {
    // בדיקת חיבור ליומן גוגל
    if (user?.googleCalendarConnected) {
      setIsGoogleCalendarConnected(true);
    }
  }, [user]);

  const handleStatusChange = async (task: Task) => {
    if (!user) return;
    
    const taskRef = doc(db, `users/${user.id}/worlds/${worldId}/goals/${goalId}/tasks/${task.id}`);
    const newStatus = task.status === 'COMPLETED' ? 'PENDING' : 'COMPLETED';
    const now = new Date();
    
    try {
      // עדכון סטטוס המשימה
      await updateDoc(taskRef, {
        status: newStatus,
        updatedAt: now.toISOString(),
        ...(newStatus === 'COMPLETED' ? {
          actualStart: task.actualStart || now.toISOString(),
          actualEnd: now.toISOString()
        } : {
          actualStart: null,
          actualEnd: null
        })
      });

      // קבלת כל המשימות של העולם
      const allTasks: Task[] = [];
      const goalsRef = collection(db, `users/${user.id}/worlds/${worldId}/goals`);
      const goalsSnapshot = await getDocs(goalsRef);
      
      for (const goalDoc of goalsSnapshot.docs) {
        const tasksRef = collection(db, `users/${user.id}/worlds/${worldId}/goals/${goalDoc.id}/tasks`);
        const tasksSnapshot = await getDocs(tasksRef);
        const goalTasks = tasksSnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        })) as Task[];
        allTasks.push(...goalTasks);
      }

      // עדכון סטטיסטיקות העולם
      const worldRef = doc(db, `users/${user.id}/worlds/${worldId}`);
      const worldDoc = await getDoc(worldRef);
      const worldData = worldDoc.data();
      
      if (worldData) {
        const currentStats = worldData.stats || {
          totalGoals: 0,
          completedGoals: 0,
          totalTasks: 0,
          completedTasks: 0,
          timeInvested: 0
        };

        let timeInvested = currentStats.timeInvested || 0;
        if (newStatus === 'COMPLETED' && task.estimatedDuration) {
          timeInvested += task.estimatedDuration;
        } else if (newStatus === 'PENDING' && task.estimatedDuration) {
          timeInvested = Math.max(0, timeInvested - task.estimatedDuration);
        }

        const newStats = {
          totalGoals: currentStats.totalGoals || 0,
          completedGoals: currentStats.completedGoals || 0,
          totalTasks: allTasks.length,  // סך כל המשימות
          completedTasks: allTasks.filter(t => t.status === 'COMPLETED').length,  // סך המשימות שהושלמו
          timeInvested
        };

        await updateDoc(worldRef, {
          stats: newStats
        });
      }

      onUpdate();
    } catch (error) {
      console.error('Error updating task status:', error);
    }
  };

  const completedTasks = tasks.filter(t => t.status === 'COMPLETED').length;
  const totalTasks = tasks.length;

  return (
    <div className="mt-4 space-y-4">
      <div className="flex justify-between items-center">
        <div>
          <h4 className="font-medium text-gray-700">תתי-משימות</h4>
          <p className="text-sm text-gray-500">
            {completedTasks} מתוך {totalTasks} הושלמו
          </p>
        </div>
        <button
          onClick={() => setShowAddTask(true)}
          className="text-primary-500 text-sm hover:underline"
        >
          + הוסף תת-משימה
        </button>
      </div>

      {/* רשימת המשימות */}
      <div className="space-y-2">
        {tasks.map(task => (
          <div 
            key={task.id}
            className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
          >
            <div className="flex items-center gap-3 flex-1">
              <input
                type="checkbox"
                checked={task.status === 'COMPLETED'}
                onChange={() => handleStatusChange(task)}
                className="w-4 h-4 rounded border-gray-300 text-primary-600 focus:ring-primary-500"
              />
              <div className="flex-1">
                <div className={`flex items-center justify-between ${task.status === 'COMPLETED' ? 'line-through text-gray-400' : ''}`}>
                  <span>{task.title}</span>
                  <button
                    onClick={() => setEditingTask(task)}
                    className="p-1 text-gray-400 hover:text-gray-600 transition-colors"
                  >
                    <PencilIcon className="w-4 h-4" />
                  </button>
                </div>
                <div className="text-sm text-gray-500 mt-1 space-x-3 space-x-reverse">
                  <span className="inline-flex items-center gap-1">
                    <span>⏱️</span>
                    {formatDuration(task.estimatedDuration)}
                  </span>
                  {task.deadline && (
                    <span className="inline-flex items-center gap-1">
                      <span>📅</span>
                      {formatDateTime(new Date(task.deadline))}
                    </span>
                  )}
                  <span className={`
                    px-2 py-0.5 rounded-full text-xs
                    ${getPriorityStyle(task.priority)}
                  `}>
                    {getPriorityIcon(task.priority)} {getPriorityLabel(task.priority)}
                  </span>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* מודאל הוספה/עריכה */}
      {(showAddTask || editingTask) && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl p-6 max-w-md w-full">
            {!isGoogleCalendarConnected && (
              <div className="mb-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg text-sm text-yellow-800">
                <p>⚠️ שים לב: היומן אינו מחובר לגוגל קלנדר.</p>
                <a 
                  href="/calendars" 
                  className="text-primary-600 hover:underline mt-1 block"
                >
                  לחץ כאן לחיבור היומן
                </a>
              </div>
            )}
            
            <h3 className="text-lg font-semibold mb-4">
              {editingTask ? 'עריכת משימה' : 'הוספת משימה חדשה'}
            </h3>
            <AddTaskForm
              worldId={worldId}
              goalId={goalId}
              task={editingTask || undefined}
              world={{
                id: worldId,
                userId: user?.id || '',
                name: '',
                category: WorldCategory.CUSTOM,
                isActive: true,
                timeSlots: [],
                createdAt: new Date(),
                updatedAt: new Date()
              }}
              onComplete={() => {
                setShowAddTask(false);
                setEditingTask(null);
                onUpdate();
              }}
              onCancel={() => {
                setShowAddTask(false);
                setEditingTask(null);
              }}
            />
          </div>
        </div>
      )}
    </div>
  );
}

const getPriorityStyle = (priority: Task['priority']) => {
  switch (priority) {
    case 'HIGH':
      return 'bg-red-50 text-red-700 border-red-200';
    case 'MEDIUM':
      return 'bg-yellow-50 text-yellow-700 border-yellow-200';
    case 'LOW':
      return 'bg-green-50 text-green-700 border-green-200';
  }
};

const getPriorityIcon = (priority: Task['priority']) => {
  switch (priority) {
    case 'HIGH':
      return '⚡';
    case 'MEDIUM':
      return '🎯';
    case 'LOW':
      return '📝';
  }
};

const getPriorityLabel = (priority: Task['priority']) => {
  switch (priority) {
    case 'HIGH':
      return 'דחוף';
    case 'MEDIUM':
      return 'חשוב';
    case 'LOW':
      return 'נחמד לעשות';
  }
}; 