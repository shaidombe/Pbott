'use client';

import { useState, useCallback, useEffect } from 'react';
import { World, TimeSlot, Goal, WorldEntity } from '@/app/types';
import { Tab, Dialog, Transition } from '@headlessui/react';
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
import WorldEntities from './WorldEntities';
import { Fragment } from 'react';
import TimeSettingsModal from './TimeSettingsModal';

interface Props {
  worlds: World[];
  onTimeUpdate: (worldId: string, timeSlots: TimeSlot[]) => Promise<void>;
  onActivate: (worldId: string) => Promise<void>;
  onDeactivate: (worldId: string) => Promise<void>;
}

const calculateAge = (birthDate: string | null): number | null => {
  if (!birthDate) return null;
  const today = new Date();
  const birth = new Date(birthDate);
  let age = today.getFullYear() - birth.getFullYear();
  const monthDiff = today.getMonth() - birth.getMonth();
  
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
    age--;
  }
  return age;
};

const DAYS = [
  { value: 0, label: 'ראשון' },
  { value: 1, label: 'שני' },
  { value: 2, label: 'שלישי' },
  { value: 3, label: 'רביעי' },
  { value: 4, label: 'חמישי' },
  { value: 5, label: 'שישי' },
  { value: 6, label: 'שבת' }
] as const;

const groupConsecutiveSlots = (slots: TimeSlot[]): Array<{
  days: number[];
  startTime: string;
  endTime: string;
}> => {
  if (!slots?.length) return [];
  
  // Sort slots by day and time
  const sortedSlots = [...slots].sort((a, b) => 
    a.dayOfWeek - b.dayOfWeek || 
    a.startTime.localeCompare(b.startTime)
  );
  
  const groups: Array<{
    days: number[];
    startTime: string;
    endTime: string;
  }> = [];
  
  let currentGroup = {
    days: [sortedSlots[0].dayOfWeek],
    startTime: sortedSlots[0].startTime,
    endTime: sortedSlots[0].endTime
  };

  for (let i = 1; i < sortedSlots.length; i++) {
    const currentSlot = sortedSlots[i];
    const prevSlot = sortedSlots[i - 1];
    
    if (
      currentSlot.startTime === currentGroup.startTime &&
      currentSlot.endTime === currentGroup.endTime &&
      currentSlot.dayOfWeek === prevSlot.dayOfWeek + 1
    ) {
      // Add to current group
      currentGroup.days.push(currentSlot.dayOfWeek);
    } else {
      // Start new group
      groups.push(currentGroup);
      currentGroup = {
        days: [currentSlot.dayOfWeek],
        startTime: currentSlot.startTime,
        endTime: currentSlot.endTime
      };
    }
  }
  
  groups.push(currentGroup);
  return groups;
};

const formatDayRange = (days: number[]): string => {
  if (days.length === 1) {
    return DAYS[days[0]].label;
  }
  if (days.length > 2) {
    return `${DAYS[days[0]].label} - ${DAYS[days[days.length - 1]].label}`;
  }
  return days.map(day => DAYS[day].label).join(', ');
};

export default function WorldTabs({ worlds, onTimeUpdate, onActivate, onDeactivate }: Props) {
  const { user } = useApp();
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [worldGoals, setWorldGoals] = useState<Record<string, Goal[]>>({});
  const [showAddGoal, setShowAddGoal] = useState<Record<string, boolean>>({});
  const [worldEntities, setWorldEntities] = useState<Record<string, WorldEntity[]>>({});
  const [isLoading, setIsLoading] = useState<Record<string, boolean>>({});
  const [showQuickAdd, setShowQuickAdd] = useState(false);
  const [selectedEntity, setSelectedEntity] = useState<WorldEntity | null>(null);
  const [showDeactivateDialog, setShowDeactivateDialog] = useState(false);
  const [worldToDeactivate, setWorldToDeactivate] = useState<{ id: string, name: string } | null>(null);
  const [isAdding, setIsAdding] = useState(false);

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

  const loadWorldEntities = useCallback(async (worldId: string) => {
    if (!user) return;
    setIsLoading(prev => ({ ...prev, [worldId]: true }));
    
    try {
      const entitiesRef = collection(db, `users/${user.id}/worlds/${worldId}/entities`);
      const q = query(entitiesRef, orderBy('createdAt', 'desc'));

      const unsubscribe = onSnapshot(q, (snapshot) => {
        const entitiesData = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data(),
          createdAt: doc.data().createdAt ? new Date(doc.data().createdAt) : new Date(),
          updatedAt: doc.data().updatedAt ? new Date(doc.data().updatedAt) : new Date()
        })) as WorldEntity[];
        
        setWorldEntities(prev => ({ ...prev, [worldId]: entitiesData }));
        setIsLoading(prev => ({ ...prev, [worldId]: false }));
      });

      return unsubscribe;
    } catch (error) {
      console.error('Error loading entities:', error);
      setIsLoading(prev => ({ ...prev, [worldId]: false }));
    }
  }, [user]);

  useEffect(() => {
    if (worlds.length > 0) {
      loadWorldEntities(worlds[selectedIndex].id);
    }
  }, [worlds, selectedIndex, loadWorldEntities]);

  const handleEntityClick = (entity: WorldEntity) => {
    setSelectedEntity(entity);
    setShowQuickAdd(true);
  };

  const formatEntityDisplay = (entity: WorldEntity) => {
    // מקרה מיוחד עבור ישויות שינה
    if (entity.type.includes('שנת')) {
      return `#${entity.type}`;
    }

    if (!entity.birthDate) return `#${entity.type} ${entity.name}`;
    
    const age = calculateAge(entity.birthDate);
    if (!age) return `#${entity.type} ${entity.name}`;
    
    return `#${entity.type} ${entity.name} (${age})`;
  };

  const handleDeactivate = async (worldId: string, worldName: string) => {
    setWorldToDeactivate({ id: worldId, name: worldName });
    setShowDeactivateDialog(true);
  };

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
                    world.isActive ? handleDeactivate(world.id, world.name) : onActivate(world.id);
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
                  
                  {/* Entities Section */}
                  <div className="mt-6">
                    <div className="flex flex-wrap gap-2 justify-center">
                      {worldEntities[world.id]?.length === 0 ? (
                        <div className="text-center p-6 bg-white/90 rounded-xl shadow-sm border border-gray-200 w-full max-w-md">
                          <div className="text-4xl mb-3">✨</div>
                          <h3 className="text-lg font-medium text-gray-900 mb-2">
                            טרם הוספת ישויות לעולם זה
                          </h3>
                          <p className="text-gray-600 mb-4">
                            ישויות הן הדברים החשובים שאתה רוצה לעקוב אחריהם ולהשקיע בהם זמן איכות. הוסף ישויות כדי להתחיל לנהל את הזמן שלך בצורה חכמה ומכוונת מטרה.
                          </p>
                          <button
                            onClick={() => {
                              setSelectedEntity(null);
                              setShowQuickAdd(true);
                            }}
                            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-primary-500 text-white hover:bg-primary-600 transition-colors"
                          >
                            <PlusIcon className="w-5 h-5" />
                            הוסף ישות ראשונה
                          </button>
                        </div>
                      ) : (
                        <>
                          {worldEntities[world.id]?.map(entity => (
                            <button
                              key={entity.id}
                              onClick={() => handleEntityClick(entity)}
                              className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-sm bg-white/80 hover:bg-white text-gray-700 hover:text-gray-900 transition-colors border border-gray-200"
                            >
                              {formatEntityDisplay(entity)}
                            </button>
                          ))}
                          <button
                            onClick={() => {
                              setSelectedEntity(null);
                              setShowQuickAdd(true);
                            }}
                            className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-sm bg-primary-50 hover:bg-primary-100 text-primary-600 transition-colors"
                          >
                            <PlusIcon className="w-4 h-4" />
                            הוסף
                          </button>
                        </>
                      )}
                    </div>
                  </div>

                  {/* Time Settings */}
                  <div className="mt-4 pt-4 border-t border-gray-100/50">
                    <div className="flex items-center justify-between mb-3">
                      <h3 className="text-sm font-medium text-gray-700">זמנים קבועים</h3>
                      <button
                        onClick={() => setIsAdding(true)}
                        className="text-sm text-primary-600 hover:text-primary-700"
                      >
                        + הוסף זמן
                      </button>
                    </div>
                    
                    {/* Time Slots Display */}
                    <div className="flex flex-wrap gap-2 justify-center">
                      {groupConsecutiveSlots(world.timeSlots || []).map((group, index) => (
                        <div
                          key={index}
                          className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-sm bg-white/80 hover:bg-white text-gray-700 border border-gray-200"
                        >
                          <span>{formatDayRange(group.days)}</span>
                          <span className="text-gray-400 mx-1">|</span>
                          <span>{group.startTime}-{group.endTime}</span>
                          <button
                            onClick={async () => {
                              const newSlots = world.timeSlots?.filter(slot => 
                                !group.days.includes(slot.dayOfWeek) || 
                                slot.startTime !== group.startTime || 
                                slot.endTime !== group.endTime
                              );
                              await onTimeUpdate(world.id, newSlots || []);
                            }}
                            className="ml-1 text-gray-400 hover:text-red-500"
                          >
                            ×
                          </button>
                        </div>
                      ))}
                    </div>

                    {/* Time Settings Modal */}
                    <TimeSettingsModal
                      isOpen={isAdding}
                      onClose={() => setIsAdding(false)}
                      world={world}
                      onUpdate={async (timeSlots) => {
                        await onTimeUpdate(world.id, timeSlots);
                        setIsAdding(false);
                      }}
                    />
                  </div>

                  {/* מודל הישויות */}
                  <WorldEntities 
                    worldId={world.id}
                    category={world.category}
                    entities={worldEntities[world.id] || []}
                    onUpdate={() => loadWorldEntities(world.id)}
                    showQuickAdd={showQuickAdd}
                    setShowQuickAdd={setShowQuickAdd}
                    selectedEntity={selectedEntity}
                    setSelectedEntity={setSelectedEntity}
                  />
                </div>
              </div>

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

      <Transition appear show={showDeactivateDialog} as={Fragment}>
        <Dialog 
          as="div" 
          className="relative z-50" 
          onClose={() => setShowDeactivateDialog(false)}
        >
          <Transition.Child
            as={Fragment}
            enter="ease-out duration-300"
            enterFrom="opacity-0"
            enterTo="opacity-100"
            leave="ease-in duration-200"
            leaveFrom="opacity-100"
            leaveTo="opacity-0"
          >
            <div className="fixed inset-0 bg-black bg-opacity-25" />
          </Transition.Child>

          <div className="fixed inset-0 overflow-y-auto">
            <div className="flex min-h-full items-center justify-center p-4 text-center">
              <Transition.Child
                as={Fragment}
                enter="ease-out duration-300"
                enterFrom="opacity-0 scale-95"
                enterTo="opacity-100 scale-100"
                leave="ease-in duration-200"
                leaveFrom="opacity-100 scale-100"
                leaveTo="opacity-0 scale-95"
              >
                <Dialog.Panel className="w-full max-w-md transform overflow-hidden rounded-2xl bg-white p-6 text-right align-middle shadow-xl transition-all">
                  <Dialog.Title as="h3" className="text-lg font-medium leading-6 text-gray-900 mb-4">
                    <span className="text-2xl ml-2">🌍</span>
                    רגע לפני השבתת העולם...
                  </Dialog.Title>

                  <div className="mt-2">
                    <p className="text-sm text-gray-500 mb-4">
                      אל דאגה! השבתת העולם "{worldToDeactivate?.name}" היא הקפאה זמנית בלבד:
                    </p>
                    <ul className="text-sm text-gray-500 space-y-2 mb-4">
                      <li className="flex items-center gap-2">
                        <span className="text-green-500">✓</span>
                        המטרות והמשימות יישמרו בבטחה
                      </li>
                      <li className="flex items-center gap-2">
                        <span className="text-green-500">✓</span>
                        תוכל להפעיל את העולם מחדש בכל רגע
                      </li>
                      <li className="flex items-center gap-2">
                        <span className="text-green-500">✓</span>
                        כל ההיסטוריה והנתונים יישארו שמורים
                      </li>
                    </ul>
                  </div>

                  <div className="mt-6 flex justify-end gap-3">
                    <button
                      type="button"
                      className="inline-flex justify-center rounded-md border border-transparent bg-gray-100 px-4 py-2 text-sm font-medium text-gray-900 hover:bg-gray-200 focus:outline-none"
                      onClick={() => setShowDeactivateDialog(false)}
                    >
                      ביטול
                    </button>
                    <button
                      type="button"
                      className="inline-flex justify-center rounded-md border border-transparent bg-red-100 px-4 py-2 text-sm font-medium text-red-900 hover:bg-red-200 focus:outline-none"
                      onClick={async () => {
                        if (worldToDeactivate) {
                          await onDeactivate(worldToDeactivate.id);
                          setShowDeactivateDialog(false);
                          setWorldToDeactivate(null);
                        }
                      }}
                    >
                      השבת עולם
                    </button>
                  </div>
                </Dialog.Panel>
              </Transition.Child>
            </div>
          </div>
        </Dialog>
      </Transition>
    </div>
  );
} 