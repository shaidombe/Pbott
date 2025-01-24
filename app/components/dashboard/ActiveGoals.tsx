'use client';

import { useApp } from '@/app/hooks/useApp';
import { Goal, World } from '@/app/types';
import { format, isPast, isWithinInterval, addDays } from 'date-fns';
import { getWorldColor } from '@/app/lib/utils/worldUtils';

interface GoalWithWorld extends Goal {
  world: World;
  priority: number; // ציון עדיפות מחושב
}

export default function ActiveGoals() {
  const { worlds, goals } = useApp();
  
  // חישוב עדיפות למטרות
  const activeGoals: GoalWithWorld[] = goals
    .filter(goal => !goal.isCompleted)
    .map(goal => {
      const world = worlds.find(w => w.id === goal.worldId);
      if (!world) return null;

      let priority = 0;
      
      // מטרות עם דדליין קרוב מקבלות עדיפות גבוהה
      if (goal.deadline) {
        const deadline = new Date(goal.deadline);
        if (isPast(deadline)) {
          priority += 100; // דדליין שעבר
        } else if (isWithinInterval(deadline, {
          start: new Date(),
          end: addDays(new Date(), 7)
        })) {
          priority += 75; // דדליין בשבוע הקרוב
        } else if (isWithinInterval(deadline, {
          start: new Date(),
          end: addDays(new Date(), 30)
        })) {
          priority += 50; // דדליין בחודש הקרוב
        }
      }

      // מטרות עם התקדמות נמוכה מקבלות עדיפות
      if (goal.target > 0) {
        const progress = (goal.currentProgress / goal.target) * 100;
        if (progress < 25) priority += 30;
        else if (progress < 50) priority += 20;
      }

      // מטרות מעולמות פעילים מקבלות עדיפות
      if (world.isActive) priority += 10;

      return {
        ...goal,
        world,
        priority
      };
    })
    .filter((goal): goal is GoalWithWorld => goal !== null)
    .sort((a, b) => b.priority - a.priority)
    .slice(0, 6); // מציג רק את 6 המטרות החשובות ביותר

  return (
    <div className="grid gap-4 grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
      {activeGoals.map(goal => (
        <div
          key={goal.id}
          className="bg-white p-4 rounded-lg border shadow-sm hover:shadow-md transition-shadow"
        >
          <div className="flex items-center gap-2 mb-2">
            <span>{goal.world.icon}</span>
            <span 
              className="w-2 h-2 rounded-full"
              style={{ backgroundColor: getWorldColor(goal.world.category) }}
            />
            <span className="text-sm text-gray-600">{goal.world.name}</span>
          </div>

          <h3 className="font-medium mb-2">{goal.title}</h3>

          {/* Progress Bar */}
          {goal.target > 0 && (
            <div className="space-y-1">
              <div className="flex justify-between text-sm text-gray-600">
                <span>{goal.currentProgress} / {goal.target}</span>
                <span>{Math.round((goal.currentProgress / goal.target) * 100)}%</span>
              </div>
              <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                <div
                  className="h-full transition-all duration-500 ease-in-out bg-primary-500"
                  style={{
                    width: `${(goal.currentProgress / goal.target) * 100}%`
                  }}
                />
              </div>
            </div>
          )}

          {/* Deadline */}
          {goal.deadline && (
            <div className="mt-2 text-sm">
              <span className={`
                ${isPast(new Date(goal.deadline)) ? 'text-red-600' : 'text-gray-600'}
              `}>
                {isPast(new Date(goal.deadline)) ? 'דדליין עבר: ' : 'דדליין: '}
                {format(new Date(goal.deadline), 'dd/MM/yyyy')}
              </span>
            </div>
          )}

          {/* Priority Indicator */}
          {goal.priority >= 75 && (
            <div className="mt-2 text-sm text-red-600 flex items-center gap-1">
              <span>⚠️</span>
              <span>דורש טיפול דחוף</span>
            </div>
          )}
        </div>
      ))}

      {activeGoals.length === 0 && (
        <div className="col-span-full text-center text-gray-500 py-4">
          אין מטרות פעילות כרגע
        </div>
      )}
    </div>
  );
} 