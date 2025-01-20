'use client';

import { World, Goal, Task } from '@/app/types';
import { startOfWeek, endOfWeek } from 'date-fns';
import { he } from 'date-fns/locale';

interface WorldSummaryProps {
  world: World;
  goals: Goal[];
  tasks: Task[];
}

export default function WorldSummary({ world, goals, tasks }: WorldSummaryProps) {
  // חישוב סטטיסטיקות
  const completedGoals = goals.filter(g => g.isCompleted).length;
  const totalGoals = goals.length;
  const completedTasks = tasks.filter(t => t.status === 'COMPLETED').length;
  const totalTasks = tasks.length;

  // חישוב זמן שהושקע השבוע
  const weekStart = startOfWeek(new Date(), { locale: he });
  const weekEnd = endOfWeek(new Date(), { locale: he });
  const thisWeekTasks = tasks.filter(task => {
    if (!task.actualStart || !task.actualEnd) return false;
    const taskStart = new Date(task.actualStart);
    return taskStart >= weekStart && taskStart <= weekEnd;
  });

  const weeklyTimeInvested = thisWeekTasks.reduce((total, task) => {
    if (!task.actualStart || !task.actualEnd) return total;
    const duration = new Date(task.actualEnd).getTime() - new Date(task.actualStart).getTime();
    return total + (duration / (1000 * 60)); // המרה לדקות
  }, 0);

  return (
    <div className="bg-white p-6 rounded-xl shadow-sm">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <span className="text-2xl">{world.icon}</span>
          <h2 className="text-xl font-semibold">{world.name}</h2>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 mb-4">
        <div className="bg-neutral-50 p-4 rounded-lg">
          <div className="text-sm text-neutral-600 mb-1">התקדמות מטרות</div>
          <div className="text-2xl font-semibold">
            {completedGoals}/{totalGoals}
          </div>
          <div className="w-full bg-neutral-200 rounded-full h-2 mt-2">
            <div 
              className="bg-primary-500 rounded-full h-2"
              style={{ width: `${(completedGoals / totalGoals) * 100}%` }}
            />
          </div>
        </div>

        <div className="bg-neutral-50 p-4 rounded-lg">
          <div className="text-sm text-neutral-600 mb-1">משימות שהושלמו</div>
          <div className="text-2xl font-semibold">
            {completedTasks}/{totalTasks}
          </div>
          <div className="w-full bg-neutral-200 rounded-full h-2 mt-2">
            <div 
              className="bg-primary-500 rounded-full h-2"
              style={{ width: `${(completedTasks / totalTasks) * 100}%` }}
            />
          </div>
        </div>
      </div>

      <div className="bg-neutral-50 p-4 rounded-lg">
        <div className="text-sm text-neutral-600 mb-1">זמן שהושקע השבוע</div>
        <div className="text-2xl font-semibold">
          {Math.round(weeklyTimeInvested)} דקות
        </div>
      </div>
    </div>
  );
} 