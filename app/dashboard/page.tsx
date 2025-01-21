'use client';
import { useState, useEffect, useCallback, useRef } from 'react';
import { collection, getDocs } from 'firebase/firestore';
import { db } from '@/app/lib/firebase/config';
import { useApp } from '@/app/contexts/AppContext';
import { Goal, Task } from '@/app/types';
import Link from 'next/link';
import { format } from 'date-fns';
import { he } from 'date-fns/locale';
import WorldsTimeDistribution from '@/app/components/dashboard/WorldsTimeDistribution';
import ProgressOverview from '@/app/components/dashboard/ProgressOverview';
import SystemAlerts from '@/app/components/dashboard/SystemAlerts';
import DailySchedule from '@/app/components/dashboard/DailySchedule';
import ActiveGoals from '@/app/components/dashboard/ActiveGoals';

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
  const isDataLoaded = useRef(false);

  const loadDashboardData = useCallback(async () => {
    if (!user || isDataLoaded.current) {
      console.log('Dashboard: Skipping load - already loaded or no user', { 
        isLoaded: isDataLoaded.current, 
        hasUser: !!user,
        worldsCount: worlds.length
      });
      return;
    }
    
    console.log('Dashboard: Starting data load', { 
      userId: user.id,
      worldsCount: worlds.length
    });

    setIsLoading(true);
    try {
      const activeWorlds = worlds.filter(w => w.isActive);
      console.log('Dashboard: Active worlds', { count: activeWorlds.length });

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

      console.log('Dashboard: Data loaded successfully', {
        goalsCount: allGoals.length,
        tasksCount: todayTasks.length
      });
      
      isDataLoaded.current = true;
    } catch (error: unknown) {
      console.error('Dashboard: Error loading data:', error);
      setError('אירעה שגיאה בטעינת הנתונים');
    } finally {
      setIsLoading(false);
    }
  }, [user, worlds]);

  useEffect(() => {
    if (!isDataLoaded.current) {
      loadDashboardData();
    }
  }, [loadDashboardData]);

  if (isLoading) {
    return <div>Loading...</div>;
  }

  if (error) return <div className="text-red-500">{error}</div>;

  return (
    <div className="space-y-6 p-6">
      {/* Overall Status Section */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-xl shadow-sm">
          <h2 className="text-xl font-semibold mb-4">התפלגות זמן</h2>
          <WorldsTimeDistribution />
        </div>
        
        <div className="bg-white p-6 rounded-xl shadow-sm">
          <h2 className="text-xl font-semibold mb-4">סטטוס התקדמות</h2>
          <ProgressOverview />
        </div>
        
        <div className="bg-white p-6 rounded-xl shadow-sm">
          <h2 className="text-xl font-semibold mb-4">התראות מערכת</h2>
          <SystemAlerts />
        </div>
      </div>

      {/* Today's Schedule Section */}
      <div className="bg-white p-6 rounded-xl shadow-sm">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-semibold">היום שלך</h2>
          <div className="text-sm text-neutral-500">
            {format(new Date(), 'EEEE, d בMMMM', { locale: he })}
          </div>
        </div>
        <DailySchedule />
      </div>

      {/* Goals Overview Section */}
      <div className="bg-white p-6 rounded-xl shadow-sm">
        <h2 className="text-xl font-semibold mb-4">מטרות פעילות</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <ActiveGoals />
        </div>
      </div>
    </div>
  );
} 