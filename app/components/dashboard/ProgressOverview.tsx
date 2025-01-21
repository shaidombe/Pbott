'use client';

import { useApp } from '@/app/hooks/useApp';
import { World, Goal } from '@/app/types';
import { getWorldColor } from '@/app/lib/utils/worldUtils';

interface WorldProgress {
  world: World;
  goalsCount: number;
  completedGoals: number;
  completionRate: number;
  activeGoals: Goal[];
}

export default function ProgressOverview() {
  const { worlds, goals } = useApp();
  const activeWorlds = worlds.filter(w => w.isActive);

  // חישוב התקדמות לכל עולם
  const worldsProgress: WorldProgress[] = activeWorlds.map(world => {
    const worldGoals = goals.filter(g => g.worldId === world.id);
    const completedGoals = worldGoals.filter(g => g.isCompleted).length;
    
    return {
      world,
      goalsCount: worldGoals.length,
      completedGoals,
      completionRate: worldGoals.length > 0 
        ? (completedGoals / worldGoals.length) * 100 
        : 0,
      activeGoals: worldGoals.filter(g => !g.isCompleted)
    };
  });

  // מיון העולמות לפי אחוז השלמה (מהנמוך לגבוה)
  const sortedProgress = worldsProgress.sort((a, b) => a.completionRate - b.completionRate);

  return (
    <div className="space-y-4">
      {sortedProgress.map(({ world, goalsCount, completedGoals, completionRate, activeGoals }) => (
        <div key={world.id} className="space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span>{world.icon}</span>
              <span className="font-medium">{world.name}</span>
            </div>
            <div className="text-sm text-gray-500">
              {completedGoals}/{goalsCount} מטרות הושלמו
            </div>
          </div>
          
          {/* Progress Bar */}
          <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
            <div
              className="h-full transition-all duration-500 ease-in-out"
              style={{
                width: `${completionRate}%`,
                backgroundColor: getWorldColor(world.category)
              }}
            />
          </div>

          {/* Active Goals Preview */}
          {activeGoals.length > 0 && (
            <div className="text-sm text-gray-600 pl-6">
              <p className="font-medium mb-1">מטרות פעילות:</p>
              <ul className="list-disc space-y-1">
                {activeGoals.slice(0, 2).map(goal => (
                  <li key={goal.id}>
                    {goal.title}
                    {goal.target > 0 && (
                      <span className="text-gray-500">
                        {' '}({Math.round((goal.currentProgress / goal.target) * 100)}%)
                      </span>
                    )}
                  </li>
                ))}
                {activeGoals.length > 2 && (
                  <li className="text-gray-400">
                    ועוד {activeGoals.length - 2} מטרות נוספות...
                  </li>
                )}
              </ul>
            </div>
          )}
        </div>
      ))}

      {sortedProgress.length === 0 && (
        <p className="text-center text-gray-500 py-4">
          לא נמצאו עולמות פעילים
        </p>
      )}
    </div>
  );
} 