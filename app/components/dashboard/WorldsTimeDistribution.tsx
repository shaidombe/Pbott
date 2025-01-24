'use client';

import { useApp } from '@/hooks/useApp';
import { World } from '@/app/types';
import { getWorldColor } from '@/lib/utils/worldUtils';

interface Props {
  className?: string;
}

interface WorldWithPercentage extends World {
  percentage: number;
}

export default function WorldsTimeDistribution({ className }: Props) {
  const { worlds } = useApp();
  const activeWorlds = worlds.filter((w: World) => w.isActive);

  // חישוב סך הזמן המושקע בכל עולם בשבוע האחרון
  const calculateWorldTime = (world: World): number => {
    const timeInvested = world.stats?.timeInvested || 0;
    return timeInvested;
  };

  // חישוב האחוזים מסך הזמן הכולל
  const totalTime = activeWorlds.reduce((sum: number, world: World) => sum + calculateWorldTime(world), 0);
  const worldsWithPercentage: WorldWithPercentage[] = activeWorlds.map((world: World) => ({
    ...world,
    percentage: totalTime > 0 ? (calculateWorldTime(world) / totalTime) * 100 : 0
  }));

  return (
    <div className={className}>
      <div className="space-y-4">
        {worldsWithPercentage.map((world: WorldWithPercentage) => (
          <div key={world.id} className="space-y-1">
            <div className="flex justify-between text-sm">
              <span className="flex items-center gap-2">
                <span>{world.icon}</span>
                <span>{world.name}</span>
              </span>
              <span>{world.percentage.toFixed(1)}%</span>
            </div>
            <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
              <div
                className="h-full transition-all duration-500 ease-in-out"
                style={{
                  width: `${world.percentage}%`,
                  backgroundColor: getWorldColor(world.category)
                }}
              />
            </div>
          </div>
        ))}
      </div>

      {activeWorlds.length === 0 && (
        <p className="text-center text-gray-500 py-4">
          לא נמצאו עולמות פעילים
        </p>
      )}
    </div>
  );
} 