'use client';
import { useState, useEffect, useCallback } from 'react';
import { Goal, Task, World } from '@/app/types';
import TaskList from './TaskList';
import { collection, getDocs, doc, deleteDoc, updateDoc, onSnapshot } from 'firebase/firestore';
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
  world: World;
  onUpdate?: () => void;
  children?: React.ReactNode;
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

interface TimeProgressProps {
  endDate: Date;
  startDate: Date;
  label: string;
}

const TimeProgress = ({ endDate, startDate, label }: TimeProgressProps) => {
  const calculateProgress = () => {
    const now = new Date();
    const end = new Date(endDate);
    const start = new Date(startDate);
    
    const totalDiff = end.getTime() - start.getTime();
    const passedDiff = now.getTime() - start.getTime();
    const remainingDiff = end.getTime() - now.getTime();

    // חישוב ימים שעברו
    const passedDays = Math.max(Math.floor(passedDiff / (1000 * 60 * 60 * 24)), 0);

    // חישוב ימים שנותרו
    const remainingDays = Math.max(Math.ceil(remainingDiff / (1000 * 60 * 60 * 24)), 0);

    // אחוז התקדמות מדויק
    const progressPercent = Math.min(Math.max((passedDiff / totalDiff) * 100, 0), 100);

    return {
      passedDays,
      remainingDays,
      progressPercent
    };
  };

  const getProgressColor = (remainingDays: number) => {
    if (remainingDays <= 7) return 'bg-red-500'; // שבוע אחרון - אדום
    if (remainingDays <= 21) return 'bg-orange-500'; // 3 שבועות - כתום
    return 'bg-blue-500'; // מעל חודש - כחול
  };

  const { passedDays, remainingDays, progressPercent } = calculateProgress();

  return (
    <div className="my-4">
      <div className="text-sm text-gray-600 mb-2 flex justify-between">
        <span>{format(endDate, 'd MMM', { locale: he })}</span>
        <span>היום</span>
        <span>{format(startDate, 'd MMM', { locale: he })}</span>
      </div>
      
      <div className="relative h-4 bg-gray-100 rounded-lg overflow-hidden">
        {/* חלק שעבר - אפור */}
        <div 
          className="absolute h-full right-0 bg-gray-300 transition-all duration-500"
          style={{ width: `${progressPercent}%` }}
        >
          <div className="h-full w-full flex items-center justify-center">
            <span className="text-xs text-white font-medium">
              {passedDays} ימים
            </span>
          </div>
        </div>

        {/* חלק שנותר - צבע דינמי */}
        <div 
          className={`absolute h-full left-0 transition-all duration-500 ${getProgressColor(remainingDays)}`}
          style={{ 
            width: `${100 - progressPercent}%`
          }}
        >
          <div className="h-full w-full flex items-center justify-center">
            <span className="text-xs text-white font-medium">
              {remainingDays} ימים
            </span>
          </div>
        </div>
      </div>

      {/* טקסט מתחת לפס */}
      <div className="mt-2 flex justify-between text-xs text-gray-500">
        <span>עברו {passedDays} ימים</span>
        <span>נותרו {remainingDays} ימים</span>
      </div>
    </div>
  );
};

// מחוץ לקומפוננטה
const getDateKey = (date: Date | string | null) => {
  if (!date) return '';
  return new Date(date).getTime().toString();
};
export default function GoalCard({ worldId, goal: initialGoal, world, onUpdate, children }: GoalCardProps) {
  const { user } = useApp();
  const [isExpanded, setIsExpanded] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const [showConfetti, setShowConfetti] = useState(false);
  const [isCompleted, setIsCompleted] = useState(false);
  const [currentGoal, setCurrentGoal] = useState(initialGoal);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [tasksProgress, setTasksProgress] = useState({ completed: 0, total: 0 });
  const [isEditing, setIsEditing] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (!user) return;
    
    // מאזין לשינויים במטרה
    const goalRef = doc(db, `users/${user.id}/worlds/${worldId}/goals/${initialGoal.id}`);
    const unsubscribe = onSnapshot(goalRef, (doc) => {
      if (doc.exists()) {
        const updatedGoal = { id: doc.id, ...doc.data() } as Goal;
        setCurrentGoal(updatedGoal);
      }
    });

    return () => unsubscribe();
  }, [user, worldId, initialGoal.id]);

  const loadTasks = useCallback(async () => {
    if (!user || isLoading) return;
    setIsLoading(true);
    try {
      const tasksRef = collection(db, `users/${user.id}/worlds/${worldId}/goals/${initialGoal.id}/tasks`);
      const tasksSnapshot = await getDocs(tasksRef);
      const tasksData = tasksSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        deadline: doc.data().deadline ? new Date(doc.data().deadline) : null,
        createdAt: doc.data().createdAt ? new Date(doc.data().createdAt) : new Date(),
        updatedAt: doc.data().updatedAt ? new Date(doc.data().updatedAt) : new Date()
      })) as Task[];
      setTasks(tasksData);
    } catch (error) {
      console.error('Error loading tasks:', error);
    } finally {
      setIsLoading(false);
    }
  }, [user, worldId, initialGoal.id]);

  useEffect(() => {
    const loadInitialTasks = async () => {
      await loadTasks();
    };
    loadInitialTasks();
  }, [worldId, initialGoal.id]);

  useEffect(() => {
    const completed = initialGoal.currentProgress >= initialGoal.target;
    if (completed && !isCompleted) {
      setShowConfetti(true);
      setTimeout(() => setShowConfetti(false), 5000);
    }
    setIsCompleted(completed);
  }, [initialGoal.currentProgress, initialGoal.target, isCompleted]);

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
      const goalRef = doc(db, `users/${user.id}/worlds/${worldId}/goals/${initialGoal.id}`);
      await deleteDoc(goalRef);
      onUpdate?.();
    } catch (err) {
      console.error('Error deleting goal:', err);
      alert('אירעה שגיאה במחיקת המטרה');
    }
  };

  const updateProgress = async (increment: boolean) => {
    if (!user || !initialGoal.id) return;
    
    try {
      const newProgress = increment 
        ? Math.min(initialGoal.currentProgress + 1, initialGoal.target)
        : Math.max(initialGoal.currentProgress - 1, 0);
      
      const goalRef = doc(db, `users/${user.id}/worlds/${worldId}/goals/${initialGoal.id}`);
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
    const remaining = initialGoal.target - initialGoal.currentProgress;
    if (initialGoal.measurementType === 'TASKS') {
      return `נשארו ${remaining} משימות להשלים`;
    }
    return `נשארו ${remaining} ${initialGoal.targetUnit} להשלים`;
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

  const updateGoalProgress = useCallback(async () => {
    if (!user || !tasks?.length) return;

    const { completed, total } = tasksProgress;
    
    try {
      const goalRef = doc(db, `users/${user.id}/worlds/${worldId}/goals/${initialGoal.id}`);
      
      const updates = initialGoal.measurementType === 'TASKS' 
        ? {
            target: total,
            currentProgress: completed,
          }
        : {
            currentProgress: Math.round((completed / total) * 100),
          };
      
      await updateDoc(goalRef, {
        ...updates,
        isCompleted: completed === total && total > 0,
        updatedAt: new Date().toISOString()
      });
      
      onUpdate?.();
    } catch (error) {
      console.error('Error updating goal progress:', error);
    }
  }, [user, tasks, tasksProgress, initialGoal.measurementType, worldId, initialGoal.id]);

  useEffect(() => {
    if (!tasks?.length || !user) return;
    
    const progress = getTasksProgress();
    if (JSON.stringify(progress) === JSON.stringify(tasksProgress)) return;
    
    setTasksProgress(progress);
    
    // עדכון רק אם זו מטרה מסוג משימות
    if (initialGoal.measurementType === 'TASKS') {
      const goalRef = doc(db, `users/${user.id}/worlds/${worldId}/goals/${initialGoal.id}`);
      updateDoc(goalRef, {
        currentProgress: progress.completed,
        target: progress.total,
        isCompleted: progress.completed === progress.total && progress.total > 0,
        updatedAt: new Date().toISOString()
      }).catch(error => {
        console.error('Error updating goal progress:', error);
      });
    }
  }, [tasks, initialGoal.measurementType, user, worldId, initialGoal.id]);

  const getProgressDisplay = () => {
    if (initialGoal.measurementType === 'TASKS') {
      const { completed, total } = getTasksProgress();
      return `${completed} מתוך ${total} משימות הושלמו`;
    }
    return `${initialGoal.currentProgress} מתוך ${initialGoal.target} ${initialGoal.targetUnit}`;
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
            goal={initialGoal}
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
                <h3 className="text-lg font-medium text-gray-900">{initialGoal.title}</h3>
                <span className="text-sm px-2 py-0.5 rounded-full bg-primary-50 text-primary-700">
                  {getImportanceLabel(initialGoal.importance)}
                </span>
              </div>
              
              {initialGoal.description && (
                <p className="text-gray-600 mt-1 text-sm">{initialGoal.description}</p>
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
              {initialGoal.measurementType === 'TASKS' ? (
                <span className={isCompleted ? 'text-green-600 font-semibold' : ''}>
                  {tasks.length > 0 ? Math.round((getTasksProgress().completed / getTasksProgress().total) * 100) : 0}%
                </span>
              ) : (
                <span className={isCompleted ? 'text-green-600 font-semibold' : ''}>
                  {Math.round((initialGoal.currentProgress / initialGoal.target) * 100)}%
                </span>
              )}
            </div>
            <div className="relative w-full bg-gray-300 rounded-lg h-8">
              <div 
                className={`absolute h-full rounded-lg transition-all duration-300 ${
                  isCompleted ? 'bg-green-500' : 'bg-primary-500'
                }`}
                style={{ width: `${Math.min(100, (initialGoal.currentProgress / initialGoal.target) * 100)}%` }}
              />
              <div className="absolute inset-0 flex items-center justify-center text-sm font-medium">
                <span className="text-white">
                  {getRemainingTasks()}
                </span>
              </div>
            </div>
          </div>

          {/* תאריכים */}
          <div className="text-sm text-gray-500 space-y-1 mb-4">
            {initialGoal.deadline && (
              <TimeProgress
                endDate={new Date(initialGoal.deadline)}
                startDate={initialGoal.createdAt}
                label={calculateTimeLeft(new Date(initialGoal.deadline))}
              />
            )}
          </div>

          {/* כפתור הרחבה, זמן שהושקע ומשימות להשלמה */}
          <div className="mt-4 pt-4 border-t border-gray-100">
            <div className="text-sm text-gray-500 space-y-1 mb-3">
              <div className="flex items-center gap-1">
                <span>⏱️</span>
                <span>זמן שהושקע: {formatTimeInvested(initialGoal.timeInvested)}</span>
              </div>

              <div className="flex items-center gap-1">
                <span>📋</span>
                <span>משימות: {tasksProgress.completed} הושלמו מתוך {tasksProgress.total}</span>
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

          {isExpanded && children}
        </>
      )}
    </div>
  );
} 
