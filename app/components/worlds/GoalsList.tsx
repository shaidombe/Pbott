'use client';

import { useApp } from '@/app/contexts/AppContext';
import { Goal, World } from '@/app/types';
import GoalCard from '@/app/components/goals/components/GoalCard';

interface Props {
  worldId: string;
  world: World;
}

export default function GoalsList({ worldId, world }: Props) {
  const { goals } = useApp();
  const worldGoals = goals.filter(goal => goal.worldId === worldId);

  return (
    <div className="space-y-4">
      {worldGoals.map(goal => (
        <GoalCard
          key={goal.id}
          worldId={worldId}
          goal={goal}
          world={world}
          onUpdate={() => {
            // Handle update if needed
          }}
        />
      ))}

      {worldGoals.length === 0 && (
        <p className="text-center text-gray-500 py-4">
          אין מטרות עדיין. הוסף את המטרה הראשונה שלך!
        </p>
      )}
    </div>
  );
} 