'use client';

import { useApp } from '@/hooks/useApp';
import { World } from '@/app/types';
import { format, differenceInDays } from 'date-fns';

interface Alert {
  id: string;
  type: 'warning' | 'info' | 'success';
  icon: string;
  message: string;
  world?: World;
}

export default function SystemAlerts() {
  const { worlds, goals } = useApp();
  const alerts: Alert[] = [];

  // בדיקת עולמות לא פעילים
  const inactiveWorlds = worlds.filter(w => !w.isActive);
  if (inactiveWorlds.length > 0) {
    alerts.push({
      id: 'inactive-worlds',
      type: 'info',
      icon: '💡',
      message: `יש ${inactiveWorlds.length} עולמות לא פעילים. האם תרצה להפעיל אותם?`
    });
  }

  // בדיקת מטרות עם דדליין קרוב
  goals.forEach(goal => {
    if (goal.deadline && !goal.isCompleted) {
      const daysUntilDeadline = differenceInDays(new Date(goal.deadline), new Date());
      if (daysUntilDeadline >= 0 && daysUntilDeadline <= 3) {
        const world = worlds.find(w => w.id === goal.worldId);
        alerts.push({
          id: `goal-deadline-${goal.id}`,
          type: 'warning',
          icon: '⏰',
          message: `דדליין מתקרב: ${goal.title} (${format(new Date(goal.deadline), 'dd/MM/yyyy')})`,
          world
        });
      }
    }
  });

  // בדיקת עולמות שלא הייתה בהם פעילות השבוע
  worlds.forEach(world => {
    if (world.isActive && (!world.stats?.timeInvested || world.stats.timeInvested === 0)) {
      alerts.push({
        id: `no-activity-${world.id}`,
        type: 'warning',
        icon: '📊',
        message: `לא נרשמה פעילות השבוע בעולם ${world.name}`,
        world
      });
    }
  });

  return (
    <div className="space-y-3">
      {alerts.map(alert => (
        <div
          key={alert.id}
          className={`p-3 rounded-lg flex items-start gap-3 ${
            alert.type === 'warning' ? 'bg-yellow-50 text-yellow-800' :
            alert.type === 'info' ? 'bg-blue-50 text-blue-800' :
            'bg-green-50 text-green-800'
          }`}
        >
          <span className="text-xl">{alert.icon}</span>
          <div className="flex-1">
            <p>{alert.message}</p>
            {alert.world && (
              <span className="text-sm opacity-75 flex items-center gap-1 mt-1">
                {alert.world.icon} {alert.world.name}
              </span>
            )}
          </div>
        </div>
      ))}

      {alerts.length === 0 && (
        <p className="text-center text-gray-500 py-4">
          אין התראות חדשות
        </p>
      )}
    </div>
  );
} 