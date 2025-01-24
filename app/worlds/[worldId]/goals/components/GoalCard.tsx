'use client';
import { useState, useEffect, useCallback } from 'react';
import { Goal, Task } from '@/app/types';
import TaskList from './TaskList';
import { collection, getDocs, doc, deleteDoc, updateDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase/config';
import { useApp } from '@/lib/hooks/useApp';
import { EllipsisHorizontalIcon, PlusIcon, MinusIcon } from '@heroicons/react/24/outline';
import AddGoalForm from './AddGoalForm';
import Confetti from 'react-confetti';
import { format, formatDistanceToNow } from 'date-fns';
import { he } from 'date-fns/locale';
import { ChevronUpIcon, ChevronDownIcon } from '@heroicons/react/24/outline';

interface GoalCardProps {
  worldId: string;
  goal: Goal;
  onUpdate?: () => void;
}

// פונקציות עזר
const calculateTimeLeft = (deadline: Date) => {
  const now = new Date();
  const end = new Date(deadline);
  const diff = end.getTime() - now.getTime();
  
  if (isNaN(diff) || diff <= 0) return 'הזמן הסתיים';
  
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  const months = Math.floor(days / 30);
  const remainingDays = days % 30;
  
  if (months > 0) {
    return `נשארו ${months} חודשים ו-${remainingDays} ימים`;
  }
  return `נשארו ${days} ימים`;
};

const getImportanceLabel = (importance: Goal['importance']) => {
  switch (importance) {
    case 'MUST':
      return 'חייב לעשות';
    case 'VERY_HIGH':
      return 'חשוב מאוד';
    case 'HIGH':
      return 'חשוב';
    default:
      return '';
  }
};

const formatDate = (date: Date) => {
  try {
    return new Date(date).toLocaleDateString('he-IL', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  } catch (e) {
    return 'תאריך לא תקין';
  }
};

export default function GoalCard({ worldId, goal, onUpdate }: GoalCardProps) {
  const { user } = useApp();
  const [isExpanded, setIsExpanded] = useState(false);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [showMenu, setShowMenu] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [showConfetti, setShowConfetti] = useState(false);
  const [isCompleted, setIsCompleted] = useState(goal.currentProgress >= goal.target);

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
    loadTasks();
  }, [loadTasks]);

  useEffect(() => {
    const completed = goal.currentProgress >= goal.target;
    if (completed && !isCompleted) {
      setShowConfetti(true);
      setTimeout(() => setShowConfetti(false), 5000);
    }
    setIsCompleted(completed);
  }, [goal.currentProgress, goal.target, isCompleted]);


  // חישוב זמן בפורמט קריא
  const formatTime = (minutes: number) => {
    if (minutes < 60) return `${minutes} דקות`;
    const hours = Math.floor(minutes / 60);
    const remainingMinutes = minutes % 60;
    return `${hours} שעות ${remainingMinutes > 0 ? `ו-${remainingMinutes} דקות` : ''}`;
  };

  const handleDelete = async () => {
    if (!user || !confirm('האם אתה בטוח שברצונך למחוק מטרה זו?')) return;

    try {
      const goalRef = doc(db, `users/${user.id}/worlds/${worldId}/goals/${goal.id}`);
      await deleteDoc(goalRef);
      onUpdate?.();
    } catch (err) {
      console.error('Error deleting goal:', err);
      alert('אירעה שגיאה במחיקת המטרה');
    }
  };

  const updateProgress = async (increment: boolean) => {
    if (!user || !goal.id) return;
    
    try {
      const newProgress = increment 
        ? Math.min(goal.currentProgress + 1, goal.target)
        : Math.max(goal.currentProgress - 1, 0);
      
      const goalRef = doc(db, `users/${user.id}/worlds/${worldId}/goals/${goal.id}`);
      await updateDoc(goalRef, {
        currentProgress: newProgress,
        updatedAt: new Date().toISOString()
      });
      
      onUpdate?.();
    } catch (err) {
      console.error('Error updating progress:', err);
      alert('אירעה שגיאה בעדכון ההתקדמות');
    }
  };

  const getRemainingTasks = () => {
    const remaining = goal.target - goal.currentProgress;
    if (goal.measurementType === 'TASKS') {
      return `נשארו ${remaining} משימות להשלים`;
    }
    return `נשארו ${remaining} ${goal.targetUnit} להשלים`;
  };

  // פונקציה לפורמט של תאריך ושעה בעברית
  const formatDateTime = (date: Date) => {
    return format(date, "d בMMMM yyyy 'בשעה' HH:mm", { locale: he });
  };

  const formatCompletionTime = (date: Date) => {
    const now = new Date();
    const completionDate = new Date(date);
    
    // אם הושלם היום, נציג רק את השעה
    if (completionDate.toDateString() === now.toDateString()) {
      return `הושלם בהצלחה 🎉 היום ב-${format(completionDate, 'HH:mm', { locale: he })}`;
    }
    
    // אחרת, נציג זמן יחסי
    const timeAgo = formatDistanceToNow(completionDate, { 
      locale: he, 
      addSuffix: true 
    });
    
    return `הושלם בהצלחה 🎉 ${timeAgo}`;
  };

  const getUncompletedTasksCount = () => {
    if (!tasks || tasks.length === 0) return 0;
    return tasks.filter(task => task.status !== 'COMPLETED').length;
  };

  const formatTimeInvested = (minutes: number) => {
    if (minutes < 60) {
      return `${minutes} דקות`;
    }
    const hours = Math.floor(minutes / 60);
    const remainingMinutes = minutes % 60;
    if (remainingMinutes === 0) {
      return `${hours} שעות`;
    }
    return `${hours} שעות ו-${remainingMinutes} דקות`;
  };

  const isValidDate = (date: any): date is Date => {
    return date instanceof Date && !isNaN(date.getTime());
  };

  const formatRelativeTime = (date: any) => {
    try {
      // בדיקה שקיבלנו ערך
      if (!date) {
        return 'תאריך לא ידוע';
      }

      let targetDate: Date;

      // אם קיבלנו תאריך
      if (date instanceof Date) {
        targetDate = date;
      }
      // אם קיבלנו string
      else if (typeof date === 'string') {
        targetDate = new Date(date);
      }
      // אם קיבלנו timestamp
      else if (typeof date === 'number') {
        targetDate = new Date(date);
      }
      // אם קיבלנו Firestore Timestamp
      else if (date?.toDate && typeof date.toDate === 'function') {
        targetDate = date.toDate();
      }
      else {
        console.error('Unsupported date format:', date);
        return 'תאריך לא תקין';
      }

      // בדיקה שהתאריך תקין
      if (!isValidDate(targetDate)) {
        console.error('Invalid date object:', targetDate);
        return 'תאריך לא תקין';
      }

      const now = new Date();
      
      if (targetDate.toDateString() === now.toDateString()) {
        return `היום ב-${format(targetDate, 'HH:mm', { locale: he })}`;
      }
      
      return formatDistanceToNow(targetDate, { 
        locale: he, 
        addSuffix: true 
      });
    } catch (error) {
      console.error('Error formatting date:', error);
      return 'תאריך לא תקין';
    }
  };

  const getTasksProgress = () => {
    if (!tasks || tasks.length === 0) return { completed: 0, total: 0 };
    const completed = tasks.filter(task => task.status === 'COMPLETED').length;
    return {
      completed,
      total: tasks.length
    };
  };

  const updateGoalProgress = async () => {
    if (!user) return;

    const { completed, total } = getTasksProgress();
    
    // אם אין משימות, אין מה לעדכן
    if (total === 0) return;

    try {
      const goalRef = doc(db, `users/${user.id}/worlds/${worldId}/goals/${goal.id}`);
      
      if (goal.measurementType === 'TASKS') {
        // עדכון אוטומטי של היעד לפי מספר המשימות הכולל
        await updateDoc(goalRef, {
          target: total,
          currentProgress: completed,
          isCompleted: completed === total && total > 0,
          updatedAt: new Date().toISOString()
        });
      } else {
        // לוגיקה קיימת למדידה מספרית
        const progress = Math.round((completed / total) * 100);
        await updateDoc(goalRef, {
          currentProgress: progress,
          isCompleted: completed === total && total > 0,
          updatedAt: new Date().toISOString()
        });
      }
      
      onUpdate?.();
    } catch (error) {
      console.error('Error updating goal progress:', error);
    }
  };

  // עדכון אוטומטי כשמשתנות המשימות
  useEffect(() => {
    if (goal.measurementType === 'TASKS') {
      updateGoalProgress();
    }
  }, [tasks]);

  const getProgressDisplay = () => {
    if (goal.measurementType === 'TASKS') {
      const { completed, total } = getTasksProgress();
      return `${completed} מתוך ${total} משימות הושלמו`;
    }
    return `${goal.currentProgress} מתוך ${goal.target} ${goal.targetUnit}`;
  };

  return (
    <div className="w-full max-w-4xl mx-auto bg-white rounded-lg shadow-sm p-4 relative">
      {showConfetti && (
        <Confetti
          width={window.innerWidth}
          height={window.innerHeight}
          recycle={false}
          numberOfPieces={500}
          gravity={0.3}
        />
      )}
      
      {isEditing ? (
        <div className="bg-white p-6 rounded-lg">
          <h3 className="text-lg font-semibold mb-4">עריכת מטרה</h3>
          <AddGoalForm
            worldId={worldId}
            goal={goal}
            onComplete={async () => {
              onUpdate?.();
              setIsEditing(false);
            }}
            onCancel={() => setIsEditing(false)}
          />
        </div>
      ) : (
        <>
          <div className="flex justify-between items-start mb-4">
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <h3 className="text-lg font-medium text-gray-900">{goal.title}</h3>
                <span className="text-sm px-2 py-0.5 rounded-full bg-primary-50 text-primary-700">
                  {getImportanceLabel(goal.importance)}
                </span>
              </div>
              
              {goal.description && (
                <p className="text-gray-600 mt-1 text-sm">{goal.description}</p>
              )}
            </div>

            {/* תפריט פעולות */}
            <div className="relative">
              <button
                onClick={() => setShowMenu(!showMenu)}
                className="p-2 hover:bg-gray-50 rounded-full"
              >
                <EllipsisHorizontalIcon className="w-5 h-5 text-gray-400" />
              </button>
              
              {showMenu && (
                <div className="absolute left-0 mt-2 w-48 rounded-md shadow-lg bg-white ring-1 ring-black ring-opacity-5 z-10">
                  <div className="py-1">
                    <button
                      onClick={() => {
                        setIsEditing(true);
                        setShowMenu(false);
                      }}
                      className="w-full text-right px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                    >
                      ערוך מטרה
                    </button>
                    <button
                      onClick={() => {
                        handleDelete();
                        setShowMenu(false);
                      }}
                      className="w-full text-right px-4 py-2 text-sm text-red-600 hover:bg-red-50"
                    >
                      מחק מטרה
                    </button>
                  </div>
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
          {/* פרוגרס בר ועדכון התקדמות */}
          <div className="mb-4">
            <div className="flex justify-between items-center text-sm text-gray-600 mb-1">
              <span>{getProgressDisplay()}</span>
              {goal.measurementType === 'TASKS' ? (
                <span className={isCompleted ? 'text-green-600 font-semibold' : ''}>
                  {tasks.length > 0 ? Math.round((getTasksProgress().completed / getTasksProgress().total) * 100) : 0}%
                </span>
              ) : (
                <span className={isCompleted ? 'text-green-600 font-semibold' : ''}>
                  {Math.round((goal.currentProgress / goal.target) * 100)}%
                </span>
              )}
            </div>
            <div className="w-full bg-gray-100 rounded-full h-2 mb-2">
              <div 
                className={`h-2 rounded-full transition-all duration-300 ${
                  isCompleted ? 'bg-green-500' : 'bg-primary-500'
                }`}
                style={{ width: `${Math.min(100, (goal.currentProgress / goal.target) * 100)}%` }}
              />
            </div>
            
            <div className="flex items-center justify-between mt-2">
              <div className="text-sm text-gray-600">
                {goal.isCompleted && getTasksProgress().completed === getTasksProgress().total && getTasksProgress().total > 0 ? (
                  <span className="text-green-600 font-medium">
                    {goal.updatedAt ? 
                      `הושלם בהצלחה 🎉 ${formatRelativeTime(goal.updatedAt)}` :
                      'הושלם בהצלחה 🎉'
                    }
                  </span>
                ) : (
                  getRemainingTasks()
                )}
              </div>
              
              {goal.measurementType === 'NUMERIC' && (
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => updateProgress(false)}
                    disabled={goal.currentProgress <= 0}
                    className="p-1 rounded-full hover:bg-gray-100 disabled:opacity-50 disabled:hover:bg-transparent"
                    title="הפחת"
                  >
                    <MinusIcon className="w-5 h-5 text-gray-500" />
                  </button>
                  
                  <span className="text-lg font-medium text-gray-700">
                    {goal.currentProgress}
                  </span>
                  
                  <button
                    onClick={() => updateProgress(true)}
                    className="p-1 rounded-full hover:bg-gray-100"
                    title="הוסף"
                  >
                    <PlusIcon className="w-5 h-5 text-gray-500" />
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* תאריכים */}
          <div className="text-sm text-gray-500 space-y-1 mb-4">
            {/* תאריך יצירה */}
            <div className="flex items-center gap-1">
              <span>📅</span>
              <span>נוצר {goal.createdAt ? formatRelativeTime(goal.createdAt) : 'תאריך לא ידוע'}</span>
            </div>
            
            {/* תאריך יעד */}
            {goal.deadline && (
              <div className="flex items-center gap-1">
                <span>🎯</span>
                <span>{calculateTimeLeft(goal.deadline)} ({formatDate(goal.deadline)})</span>
              </div>
            )}
          </div>

          {/* כפתור הרחבה, זמן שהושקע ומשימות להשלמה */}
          <div className="mt-4 pt-4 border-t border-gray-100">
            <div className="text-sm text-gray-500 space-y-1 mb-3">
              <div className="flex items-center gap-1">
                <span>⏱️</span>
                <span>זמן שהושקע: {formatTimeInvested(goal.timeInvested)}</span>
              </div>

              <div className="flex items-center gap-1">
                <span>📋</span>
                <span>משימות: {getTasksProgress().completed} הושלמו מתוך {getTasksProgress().total}</span>
              </div>
            </div>

            <button
              onClick={() => setIsExpanded(!isExpanded)}
              className="w-full flex items-center justify-center gap-2 text-gray-600 hover:text-primary-500 transition-colors"
            >
              <span>{isExpanded ? 'סגור' : 'הצג'} משימות</span>
              {isExpanded ? (
                <ChevronUpIcon className="w-5 h-5" />
              ) : (
                <ChevronDownIcon className="w-5 h-5" />
              )}
            </button>
          </div>

          {isExpanded && (
            <div className="mt-4">
              <TaskList 
                worldId={worldId}
                goalId={goal.id} 
                tasks={tasks}
                onUpdate={loadTasks}
              />
            </div>
          )}
        </>
      )}
    </div>
  );
} 