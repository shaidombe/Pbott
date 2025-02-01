'use client';

import { World } from '@/app/types';
import { useApp } from '@/app/contexts/AppContext';
import { 
  CheckCircleIcon, 
  ClockIcon, 
  ChartBarIcon,
  ArrowTrendingUpIcon 
} from '@heroicons/react/24/outline';

interface Props {
  world: World;
}

export default function WorldStats({ world }: Props) {
  const { goals } = useApp();
  const worldGoals = goals.filter(goal => goal.worldId === world.id);
  const completedGoals = worldGoals.filter(goal => goal.isCompleted).length;
  const weeklyTimeInvested = world.stats?.timeInvested || 0;

  const stats = [
    {
      name: 'מטרות פעילות',
      value: worldGoals.length - completedGoals,
      icon: ChartBarIcon
    },
    {
      name: 'מטרות שהושלמו',
      value: completedGoals,
      icon: CheckCircleIcon
    },
    {
      name: 'זמן שבועי',
      value: `${Math.round(weeklyTimeInvested)} דק׳`,
      icon: ClockIcon
    },
    {
      name: 'אחוז השלמה',
      value: `${worldGoals.length > 0 
        ? Math.round((completedGoals / worldGoals.length) * 100)
        : 0}%`,
      icon: ArrowTrendingUpIcon
    }
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      {stats.map((stat) => (
        <div key={stat.name} className="bg-gray-50 p-4 rounded-lg">
          <div className="flex items-center gap-2 text-gray-500 mb-2">
            <stat.icon className="w-5 h-5" />
            <div className="text-sm">{stat.name}</div>
          </div>
          <div className="text-xl font-semibold">{stat.value}</div>
        </div>
      ))}
    </div>
  );
} 