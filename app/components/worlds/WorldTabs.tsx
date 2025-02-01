'use client';

import { useState, useCallback, useEffect } from 'react';
import { World, TimeSlot, Goal } from '@/app/types';
import { Tab } from '@headlessui/react';
import { getWorldColor, getWorldIcon } from '@/lib/utils/worldUtils';
import WorldTimeSettings from './WorldTimeSettings';
import GoalsList from './GoalsList';
import WorldStats from './WorldStats';
import WorldsTimeDistribution from './WorldsTimeDistribution';
import { classNames } from '@/app/lib/utils/styleUtils';
import { PlusIcon, MinusIcon } from '@heroicons/react/24/outline';
import { doc, getDoc, collection, query, orderBy, onSnapshot } from 'firebase/firestore';
import { db } from '@/lib/firebase/config';
import { useApp } from '@/app/contexts/AppContext';
import GoalCard from '@/app/components/goals/components/GoalCard';
import TaskList from '@/app/components/goals/components/TaskList';
import AddGoalForm from '@/app/components/goals/components/AddGoalForm';

interface Props {
  worlds: World[];
  onTimeUpdate: (worldId: string, timeSlots: TimeSlot[]) => void;
  onActivate: (worldId: string) => Promise<void>;
  onDeactivate: (worldId: string) => Promise<void>;
}

export default function WorldTabs({ worlds, onTimeUpdate, onActivate, onDeactivate }: Props) {
  const [selectedIndex, setSelectedIndex] = useState(0);
  const { user } = useApp();
  const [worldGoals, setWorldGoals] = useState<Record<string, Goal[]>>({});
  const [showAddGoal, setShowAddGoal] = useState<Record<string, boolean>>({});
  const [isLoading, setIsLoading] = useState<Record<string, boolean>>({});

  const loadWorldGoals = useCallback(async (worldId: string) => {
    if (!user) return;
    setIsLoading(prev => ({ ...prev, [worldId]: true }));
    
    try {
      const goalsRef = collection(db, `users/${user.id}/worlds/${worldId}/goals`);
      const q = query(goalsRef, orderBy('createdAt', 'desc'));

      const unsubscribe = onSnapshot(q, (snapshot) => {
        const goalsData = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data(),
          deadline: doc.data().deadline ? new Date(doc.data().deadline) : null,
          createdAt: doc.data().createdAt ? new Date(doc.data().createdAt) : new Date(),
          updatedAt: doc.data().updatedAt ? new Date(doc.data().updatedAt) : new Date()
        })) as Goal[];
        
        setWorldGoals(prev => ({ ...prev, [worldId]: goalsData }));
        setIsLoading(prev => ({ ...prev, [worldId]: false }));
      });

      return unsubscribe;
    } catch (error) {
      console.error('Error loading goals:', error);
      setIsLoading(prev => ({ ...prev, [worldId]: false }));
    }
  }, [user]);

  return (
    <div className="w-full space-y-8">
      {/* סטטיסטיקה */}
      <details className="bg-white p-6 rounded-xl shadow-sm">
        <summary className="cursor-pointer font-semibold text-lg">
          סטטיסטיקה שבועית
        </summary>
        <div className="mt-4">
          <WorldsTimeDistribution worlds={worlds} />
        </div>
      </details>

      <Tab.Group selectedIndex={selectedIndex} onChange={(index) => {
        setSelectedIndex(index);
        const world = worlds[index];
        if (world && !worldGoals[world.id]) {
          loadWorldGoals(world.id);
        }
      }}>
        <Tab.List className="flex space-x-2 rounded-xl bg-gray-100 p-1">
          {worlds.map((world) => (
            <Tab
              key={world.id}
              className={({ selected }) =>
                classNames(
                  'w-full rounded-lg py-2.5 text-sm font-medium leading-5',
                  'ring-white ring-opacity-60 ring-offset-2 focus:outline-none focus:ring-2',
                  selected
                    ? 'bg-white shadow text-gray-900'
                    : 'text-gray-500 hover:bg-white/[0.12] hover:text-gray-900'
                )
              }
            >
              <div className="flex items-center justify-center gap-2">
                <span>{getWorldIcon(world.category)}</span>
                <span>{world.name}</span>
                <div
                  role="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    world.isActive ? onDeactivate(world.id) : onActivate(world.id);
                  }}
                  className={`ml-2 p-1 rounded-full ${
                    world.isActive 
                      ? 'text-red-500 hover:bg-red-50' 
                      : 'text-green-500 hover:bg-green-50'
                  }`}
                >
                  {world.isActive ? <MinusIcon className="w-4 h-4" /> : <PlusIcon className="w-4 h-4" />}
                </div>
              </div>
            </Tab>
          ))}
        </Tab.List>

        <Tab.Panels className="mt-6">
          {worlds.map((world) => (
            <Tab.Panel
              key={world.id}
              className="rounded-xl bg-white p-6 shadow-sm space-y-8"
            >
              {/* Hero Section */}
              <div className="text-center">
                <div 
                  className="p-8 rounded-3xl shadow-lg"
                  style={{
                    background: `linear-gradient(to right, ${getWorldColor(world.category)}22, ${getWorldColor(world.category)}44)`
                  }}
                >
                  <h1 className="text-3xl md:text-4xl font-bold mb-3 text-gray-800 flex items-center justify-center gap-3">
                    <span>{getWorldIcon(world.category)}</span>
                    <span>{world.name}</span>
                  </h1>
                  <p className="text-gray-600 mb-4">{world.description}</p>
                  <WorldStats world={world} />
                </div>
              </div>

              {/* Time Settings */}
              <details className="bg-white rounded-lg">
                <summary className="cursor-pointer p-4 font-medium">
                  הגדרות זמנים
                </summary>
                <div className="p-4">
                  <WorldTimeSettings 
                    world={world} 
                    onUpdate={(timeSlots) => onTimeUpdate(world.id, timeSlots)} 
                  />
                </div>
              </details>

              {/* Goals Section */}
              <div className="space-y-6">
                {isLoading[world.id] ? (
                  <div className="flex justify-center py-8">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-500" />
                  </div>
                ) : (
                  <>
                    <div className="space-y-6">
                      {worldGoals[world.id]?.map(goal => (
                        <GoalCard 
                          key={goal.id}
                          worldId={world.id}
                          goal={goal}
                          world={world}
                          onUpdate={() => loadWorldGoals(world.id)}
                        >
                          <TaskList
                            worldId={world.id}
                            goalId={goal.id}
                            world={world}
                            onUpdate={() => loadWorldGoals(world.id)}
                          />
                        </GoalCard>
                      ))}
                    </div>

                    {showAddGoal[world.id] ? (
                      <div className="bg-white p-6 rounded-lg shadow-sm">
                        <AddGoalForm
                          worldId={world.id}
                          onComplete={() => {
                            loadWorldGoals(world.id);
                            setShowAddGoal(prev => ({ ...prev, [world.id]: false }));
                          }}
                          onCancel={() => setShowAddGoal(prev => ({ ...prev, [world.id]: false }))}
                        />
                      </div>
                    ) : (
                      <button
                        onClick={() => setShowAddGoal(prev => ({ ...prev, [world.id]: true }))}
                        className="w-full p-4 border-2 border-dashed border-gray-300 rounded-lg text-gray-500 hover:border-primary-500 hover:text-primary-500 transition-colors"
                      >
                        + הוסף מטרה חדשה
                      </button>
                    )}
                  </>
                )}
              </div>
            </Tab.Panel>
          ))}
        </Tab.Panels>
      </Tab.Group>
    </div>
  );
} 