/* eslint-disable @typescript-eslint/no-unused-vars */
'use client';
import { useState, useEffect, useCallback, useRef } from 'react';
import { useApp } from '@/app/contexts/AppContext';
import { collection, getDocs, addDoc, doc, updateDoc, deleteDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase/config';
import { World, WorldCategory, TimeSlot, Goal, WorldStats, Task } from '@/app/types';
import { useRouter } from 'next/navigation';
import { getWorldName, getWorldDescription, getWorldIcon } from '@/lib/utils/worldUtils';
import WorldTimeSettings from '@/app/components/worlds/WorldTimeSettings';
import { formatTime } from '@/lib/utils/timeUtils';
import { ExclamationTriangleIcon } from '@heroicons/react/24/solid';
import WorldsTimeDistribution from '@/app/components/worlds/WorldsTimeDistribution';
import { ChevronDownIcon, ChevronUpIcon } from '@heroicons/react/24/outline';

declare module '@/app/types' {
  interface World {
    stats?: WorldStats;
  }
}

const defaultStats: WorldStats = {
  totalGoals: 0,
  completedGoals: 0,
  totalTasks: 0,
  completedTasks: 0,
  timeInvested: 0
};

export default function WorldsSetup() {
  const { user, worlds, refreshWorlds } = useApp();
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const isDataLoaded = useRef(false);
  const initialLoadAttempted = useRef(false);
  const [showDetails, setShowDetails] = useState(false);

  const loadWorlds = useCallback(async () => {
    if (!user) {
      console.log('WorldsSetup: No user yet, waiting...');
      return;
    }

    if (isDataLoaded.current) {
      console.log('WorldsSetup: Data already loaded', {
        worldsCount: worlds.length
      });
      return;
    }
    
    setIsLoading(true);
    try {
      const worldsRef = collection(db, `users/${user.id}/worlds`);
      const snapshot = await getDocs(worldsRef);
      const worldsData = await Promise.all(snapshot.docs.map(async (doc) => {
        const worldId = doc.id;
        const worldData = doc.data() as Omit<World, 'id'>;
        
        // Get goals
        const goalsRef = collection(db, `users/${user.id}/worlds/${worldId}/goals`);
        const goalsSnapshot = await getDocs(goalsRef);
        const goals = goalsSnapshot.docs.map(goalDoc => ({ 
          id: goalDoc.id, 
          ...goalDoc.data() 
        })) as Goal[];
        
        // Get tasks for each goal
        let totalTasks = 0;
        let completedTasks = 0;
        let timeInvested = 0;
        
        // נשנה את הלוגיקה לטעינת המשימות
        await Promise.all(goals.map(async (goal) => {
          const tasksRef = collection(db, `users/${user.id}/worlds/${worldId}/goals/${goal.id}/tasks`);
          const tasksSnapshot = await getDocs(tasksRef);
          const tasks = tasksSnapshot.docs.map(taskDoc => ({
            id: taskDoc.id,
            ...taskDoc.data()
          })) as Task[];
          
          totalTasks += tasks.length;
          completedTasks += tasks.filter(task => task.status === 'COMPLETED').length;
          
          // חישוב הזמן המושקע
          tasks.forEach(task => {
            if (task.status === 'COMPLETED' && task.actualStart && task.actualEnd) {
              const start = new Date(task.actualStart);
              const end = new Date(task.actualEnd);
              timeInvested += (end.getTime() - start.getTime()) / (1000 * 60); // המרה לדקות
            }
          });
        }));

        const stats: WorldStats = {
          totalGoals: goals.length,
          completedGoals: goals.filter(g => g.isCompleted).length,
          totalTasks,
          completedTasks,
          timeInvested
        };

        return {
          ...worldData,
          id: worldId,
          stats,
          isActive: worldData.isActive ?? false,
          timeSlots: worldData.timeSlots ?? [],
        } as World;
      }));

      refreshWorlds(worldsData);
      isDataLoaded.current = true;
      
    } catch (error) {
      console.error('Error loading worlds:', error);
      setError('אירעה שגיאה בטעינת הנתונים');
    } finally {
      setIsLoading(false);
    }
  }, [user, refreshWorlds, worlds.length]);

  useEffect(() => {
    loadWorlds();
  }, [loadWorlds]);

  useEffect(() => {
    if (user && !isDataLoaded.current) {
      console.log('WorldsSetup: User became available, loading worlds');
      loadWorlds();
    }
  }, [user, loadWorlds]);

  // פונקציה חדשה לטעינה מחדש במקרה הצורך
  const reloadWorlds = useCallback(async () => {
    console.log('WorldsSetup: Forcing worlds reload');
    isDataLoaded.current = false;
    await loadWorlds();
  }, [loadWorlds]);

  // מסנן את כל העולמות - גם פעילים וגם מושבתים
  const activeWorlds = worlds.filter(w => w.isActive === true);
  const inactiveWorlds = worlds.filter(w => w.isActive === false);
  
  // מסנן קטגוריות שעדיין לא קיימות בכלל
  const availableCategories = Object.values(WorldCategory).filter(
    category => !worlds.some(w => w.category === category)
  );

  const activateWorld = async (category: WorldCategory) => {
    if (!user) return;
    setIsLoading(true);
    
    try {
      const worldsRef = collection(db, `users/${user.id}/worlds`);
      const newWorld: Omit<World, 'id' | 'stats'> = {
        userId: user.id,
        name: getWorldName(category),
        description: getWorldDescription(category),
        category,
        isActive: true,
        timeSlots: [],
        createdAt: new Date(),
        updatedAt: new Date()
      };
      
      await addDoc(worldsRef, newWorld);
      // טען מחדש את העולמות מהשרת
      const updatedWorlds = [...worlds, { ...newWorld, id: 'temp', stats: defaultStats }];
      refreshWorlds(updatedWorlds);
    } catch (err) {
      setError('אירעה שגיאה בהפעלת העולם');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeactivateWorld = async (worldId: string) => {
    if (!user) return;
    
    try {
      // מחיקת המסמך מ-Firestore
      const worldRef = doc(db, `users/${user.id}/worlds`, worldId);
      await deleteDoc(worldRef);  // שימוש ב-deleteDoc במקום updateDoc
      
      // עדכון ה-state המקומי
      const updatedWorlds = worlds.filter(w => w.id !== worldId);
      refreshWorlds(updatedWorlds);
      
      console.log('World deleted successfully:', worldId);
    } catch (error) {
      console.error('Error deleting world:', error);
      setError('אירעה שגיאה בהשבתת העולם');
    }
  };

  const reactivateWorld = async (worldId: string) => {
    if (!user) return;
    try {
      const worldRef = doc(db, `users/${user.id}/worlds`, worldId);
      await updateDoc(worldRef, {
        isActive: true,
        updatedAt: new Date()
      });
      
      // עדכן את המצב המקומי
      const updatedWorlds = worlds.map(world => 
        world.id === worldId ? { ...world, isActive: true } : world
      );
      refreshWorlds(updatedWorlds);
    } catch (err) {
      setError('אירעה שגיאה בהפעלת העולם');
    }
  };

  const navigateToGoals = (worldId: string) => {
    router.push(`/worlds/${worldId}/goals`);
  };

  return (
    <div className="space-y-6">
      <div className="space-y-8 animate-fade-in">
        <div className="text-center mb-12">
          <div className="bg-gradient-to-r from-sunset-400/90 to-primary-400/90 p-8 rounded-3xl shadow-lg">
            <h1 className="text-3xl md:text-4xl font-bold mb-3 text-[#31161699]">
              העולמות שלך
            </h1>
            <p className="text-[#321f1f99] text-lg">
              כל עולם מייצג תחום חיים חשוב. הפעל את העולמות הרלוונטיים עבורך והתחל להגדיר מטרות לכל עולם.
            </p>
          </div>
        </div>

        {activeWorlds.length > 0 && (
          <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
            <WorldsTimeDistribution worlds={activeWorlds} />
            

            <div className={`transition-all duration-300 ease-in-out overflow-hidden ${
              showDetails ? 'max-h-[1000px] opacity-100 mt-4' : 'max-h-0 opacity-0'
            }`}>
              <div className="border-t pt-4">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {/* תוכן נוסף מהקומפוננטה המקורית */}
                </div>
              </div>
            </div>
          </div>
        )}
        {isLoading ? (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-sunset-500 mx-auto"></div>
          </div>
        ) : error ? (
          <div className="text-red-500 text-center py-12">{error}</div>
        ) : (
          <div className="space-y-8">
            {/* עולמות פעילים */}
            {activeWorlds.length > 0 && (
              <div>
                <h2 className="text-xl font-semibold mb-4">העולמות הפעילים שלך</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {activeWorlds.map((world) => (
                    <WorldCard
                      key={world.id}
                      id={world.id}
                      title={world.name}
                      description={world.description || ''}
                      isActive={true}
                      icon={getWorldIcon(world.category)}
                      timeSlots={world.timeSlots}
                      stats={world.stats}
                      onNavigate={() => navigateToGoals(world.id)}
                      onDeactivate={() => handleDeactivateWorld(world.id)}
                    />
                  ))}
                </div>
              </div>
            )}

            {/* עולמות מושבתים */}
            {inactiveWorlds.length > 0 && (
              <div>
                <h2 className="text-xl font-semibold mb-4">עולמות מושבתים</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {inactiveWorlds.map((world) => (
                    <WorldCard
                      key={world.id}
                      id={world.id}
                      title={world.name}
                      description={world.description || ''}
                      isActive={false}
                      icon={getWorldIcon(world.category)}
                      timeSlots={world.timeSlots}
                      stats={world.stats}
                      onActivate={() => reactivateWorld(world.id)}
                    />
                  ))}
                </div>
              </div>
            )}

            {/* עולמות חדשים */}
            {availableCategories.length > 0 && (
              <div>
                <h2 className="text-xl font-semibold mb-4">הוסף עולם חדש</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {availableCategories.map((category) => (
                    <WorldCard
                      key={category}
                      title={getWorldName(category)}
                      description={getWorldDescription(category)}
                      isActive={false}
                      icon={getWorldIcon(category)}
                      onActivate={() => activateWorld(category)}
                    />
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

interface TimeSlotInput {
  day: number; // 0-6 (ראשון עד שבת)
  startHour: string;
  endHour: string;
}

interface WorldCardProps {
  id?: string;
  title: string;
  description: string;
  isActive: boolean;
  icon: string;
  timeSlots?: TimeSlot[];
  onNavigate?: () => void;
  onActivate?: () => Promise<void>;
  onDeactivate?: () => Promise<void>;
  stats?: WorldStats;
}

function WorldCard({ 
  id,
  title, 
  description, 
  isActive, 
  icon,
  timeSlots = [],
  onActivate, 
  onNavigate, 
  onDeactivate,
  stats = defaultStats
}: WorldCardProps) {
  const { user } = useApp();

  const handleTimeUpdate = async (newTimeSlots: TimeSlot[]) => {
    if (!user || !id) return;
    try {
      const worldRef = doc(db, `users/${user.id}/worlds`, id);
      await updateDoc(worldRef, {
        timeSlots: newTimeSlots,
        updatedAt: new Date()
      });
    } catch (error) {
      console.error('Error updating time slots:', error);
    }
  };

  // יצירת אובייקט World מלא עבור WorldTimeSettings
  const worldData: World = {
    id: id || '',
    userId: user?.id || '',
    name: title,
    description,
    category: WorldCategory.WORK,
    isActive,
    timeSlots,
    createdAt: new Date(),
    updatedAt: new Date(),
    stats: {
      totalGoals: stats.totalGoals,
      completedGoals: stats.completedGoals,
      totalTasks: stats.totalTasks,
      completedTasks: stats.completedTasks,
      timeInvested: stats.timeInvested
    }
  };

  return (
    <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
      <div className="flex justify-between items-start mb-4">
        <div>
          <h3 className="text-xl font-semibold flex items-center gap-2">
            <span>{icon}</span>
            {title}
            {isActive && timeSlots.length === 0 && (
              <div className="flex items-center text-red-500 text-sm font-normal bg-red-50 px-2 py-1 rounded-full">
                <ExclamationTriangleIcon className="w-4 h-4 mr-1" />
                חובה להגדיר זמנים
              </div>
            )}
          </h3>
          <p className="text-gray-600 mt-1">{description}</p>
        </div>
        {isActive && (
          <span className="bg-green-100 text-green-800 text-xs px-2 py-1 rounded-full">
            פעיל
          </span>
        )}
      </div>

      {stats && (
        <div className="grid grid-cols-3 gap-4 mb-4 p-4 bg-gray-50 rounded-lg">
          <div>
            <div className="text-sm text-gray-500">מטרות</div>
            <div className="font-semibold">
              {stats.totalGoals === 0 ? (
                <span className="text-yellow-600 text-sm">
                  🎯 הגדר את המטרה הראשונה שלך
                </span>
              ) : (
                `${stats.completedGoals}/${stats.totalGoals}`
              )}
            </div>
          </div>
          <div>
            <div className="text-sm text-gray-500">משימות</div>
            <div className="font-semibold">
              {stats.completedTasks}/{stats.totalTasks}
            </div>
          </div>
          <div>
            <div className="text-sm text-gray-500">זמן שהושקע</div>
            <div className="font-semibold">
              {formatTime(stats.timeInvested)}
            </div>
          </div>
        </div>
      )}

      {isActive && id && (
        <div className="mt-4 border-t pt-4">
          <WorldTimeSettings 
            world={worldData}
            onUpdate={handleTimeUpdate}
          />
        </div>
      )}

      <div className="flex gap-2">
        {isActive ? (
          <>
            {onNavigate && (
              <button
                onClick={onNavigate}
                className="flex-1 bg-primary-500 text-white px-4 py-2 rounded-md hover:bg-primary-600"
              >
                צפה במטרות
              </button>
            )}
            {onDeactivate && (
              <button
                onClick={onDeactivate}
                className="px-4 py-2 text-red-500 hover:bg-red-50 rounded-md"
              >
                השבת
              </button>
            )}
          </>
        ) : (
          <button
            onClick={onActivate}
            className="flex-1 border border-primary-500 text-primary-500 px-4 py-2 rounded-md hover:bg-primary-50"
          >
            הפעל עולם
          </button>
        )}
      </div>
    </div>
  );
} 