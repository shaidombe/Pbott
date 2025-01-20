'use client';
import { useState, useEffect, useCallback } from 'react';
import { collection, getDocs } from 'firebase/firestore';
import { db } from '@/app/lib/firebase/config';
import { useApp } from '@/app/contexts/AppContext';
import { Goal, Task } from '@/app/types';
import Link from 'next/link';

interface DashboardData {
  id: string;
  title: string;
  description: string;
  createdAt: Date;
}

export default function Dashboard() {
  const { user, worlds } = useApp();
  const [goals, setGoals] = useState<Goal[]>([]);
  const [todayTasks, setTodayTasks] = useState<Task[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [data, setData] = useState<DashboardData[]>([]);
  const [error, setError] = useState<string | null>(null);

  const loadDashboardData = useCallback(async () => {
    if (!user) return;
    setIsLoading(true);
    try {
      const activeWorlds = worlds.filter(w => w.isActive);

      // טעינת כל המטרות מכל העולמות הפעילים
      let allGoals: Goal[] = [];
      for (const world of activeWorlds) {
        const goalsRef = collection(db, `users/${user.id}/worlds/${world.id}/goals`);
        const goalsSnapshot = await getDocs(goalsRef);
        const worldGoals = goalsSnapshot.docs
          .map(doc => ({ ...doc.data(), id: doc.id })) as Goal[];
        allGoals = [...allGoals, ...worldGoals];
      }
      setGoals(allGoals);

      // טעינת משימות להיום
      let allTasks: Task[] = [];
      for (const goal of allGoals) {
        const tasksRef = collection(db, `users/${user.id}/worlds/${goal.worldId}/goals/${goal.id}/tasks`);
        const tasksSnapshot = await getDocs(tasksRef);
        const goalTasks = tasksSnapshot.docs
          .map(doc => ({ ...doc.data(), id: doc.id })) as Task[];
        allTasks = [...allTasks, ...goalTasks];
      }
      
      // סינון משימות להיום
      const today = new Date();
      const todaysTasks = allTasks.filter(task => {
        if (!task.scheduledStart) return false;
        const taskDate = new Date(task.scheduledStart);
        return taskDate.toDateString() === today.toDateString();
      });
      setTodayTasks(todaysTasks);

      const dataRef = collection(db, `users/${user.id}/dashboard`);
      const snapshot = await getDocs(dataRef);
      const dashboardData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as DashboardData[];
      setData(dashboardData);

    } catch (error: unknown) {
      console.error('Error loading dashboard:', error instanceof Error ? error.message : 'Unknown error');
      setError('אירעה שגיאה בטעינת הנתונים');
    } finally {
      setIsLoading(false);
    }
  }, [user, worlds]);

  useEffect(() => {
    loadDashboardData();
  }, [loadDashboardData]);

  if (isLoading) {
    return <div>Loading...</div>;
  }

  if (error) return <div className="text-red-500">{error}</div>;

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Hero Section */}
      <div className="text-center mb-12">
        <div className="bg-gradient-to-r from-primary-400/90 to-accent-400/90 p-8 rounded-3xl shadow-lg">
          <h1 className="text-3xl md:text-4xl font-bold mb-3 text-[#31161699]">
            היי {user?.name}! 👋
          </h1>
          <p className="text-[#321f1f99]">
            הנה מה שקורה בעולמות שלך היום
          </p>
        </div>
      </div>

      {/* תצוגת התקדמות */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {worlds.map(world => (
          <div key={world.id} className="bg-white p-6 rounded-xl shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold">{world.name}</h2>
              <Link 
                href={`/dashboard/worlds/${world.id}/goals`}
                className="text-primary-500 hover:underline text-sm"
              >
                צפה במטרות
              </Link>
            </div>
            <div className="space-y-4">
              {goals
                .filter(g => g.worldId === world.id)
                .map(goal => (
                  <div key={goal.id} className="bg-neutral-50 p-4 rounded-lg">
                    <h3 className="font-medium mb-2">{goal.title}</h3>
                    {/* כאן נוסיף פרוגרס בר */}
                  </div>
                ))
              }
            </div>
          </div>
        ))}
      </div>

      {/* משימות להיום */}
      <div className="bg-white p-6 rounded-xl shadow-sm">
        <h2 className="text-xl font-semibold mb-4">המשימות שלך להיום</h2>
        <div className="space-y-2">
          {todayTasks.map(task => (
            <div key={task.id} className="flex items-center justify-between p-3 bg-neutral-50 rounded-lg">
              <span>{task.title}</span>
              <span className="text-sm text-neutral-700">
                {task.estimatedDuration} דקות
              </span>
            </div>
          ))}
          {todayTasks.length === 0 && (
            <p className="text-neutral-700 text-center py-4">
              אין משימות מתוכננות להיום
            </p>
          )}
        </div>
      </div>

      <div className="space-y-6">
        {data.map(item => (
          <div key={item.id} className="p-4 bg-white rounded-lg shadow">
            <h2 className="text-xl font-bold">{item.title}</h2>
            <p className="text-neutral-800">{item.description}</p>
          </div>
        ))}
      </div>
    </div>
  );
} 