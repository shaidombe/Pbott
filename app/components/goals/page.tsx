/* eslint-disable @typescript-eslint/no-unused-vars */
'use client';
import { useState, useEffect, useCallback } from 'react';
import { useApp } from '@/app/contexts/AppContext';
import { doc, getDoc, collection, getDocs, query, onSnapshot, orderBy } from 'firebase/firestore';
import { db } from '@/lib/firebase/config';
import { World, Goal } from '@/app/types';
import { useParams } from 'next/navigation';
import GoalCard from './components/GoalCard';
import AddGoalForm from './components/AddGoalForm';
import Link from 'next/link';
import TaskList from './components/TaskList';

type DayOfWeek = 0 | 1 | 2 | 3 | 4 | 5 | 6;

interface Day {
  value: DayOfWeek;
  label: string;
}

const DAYS: Day[] = [
  { value: 0, label: 'ראשון' },
  { value: 1, label: 'שני' },
  { value: 2, label: 'שלישי' },
  { value: 3, label: 'רביעי' },
  { value: 4, label: 'חמישי' },
  { value: 5, label: 'שישי' },
  { value: 6, label: 'שבת' }
] as const;

export default function WorldGoals() {
  const { user } = useApp();
  const params = useParams();
  const worldId = params.worldId as string;
  
  const [world, setWorld] = useState<World | null>(null);
  const [goals, setGoals] = useState<Goal[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showAddGoal, setShowAddGoal] = useState(false);

  const loadWorldAndGoals = useCallback(async () => {
    if (!user) return;
    setIsLoading(true);
    try {
      // טעינת העולם
      const worldRef = doc(db, `users/${user.id}/worlds/${worldId}`);
      const worldDoc = await getDoc(worldRef);
      if (!worldDoc.exists()) throw new Error('World not found');
      setWorld({ id: worldDoc.id, ...worldDoc.data() } as World);

      // טעינת המטרות
      const goalsRef = collection(db, `users/${user.id}/worlds/${worldId}/goals`);
      const q = query(goalsRef, orderBy('createdAt', 'desc'));

      // הגדרת ה-listener בשביל עדכונים בזמן אמת
      const unsubscribe = onSnapshot(q, (snapshot) => {
        const goalsData = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data(),
          deadline: doc.data().deadline ? new Date(doc.data().deadline) : null,
          createdAt: doc.data().createdAt ? new Date(doc.data().createdAt) : new Date(),
          updatedAt: doc.data().updatedAt ? new Date(doc.data().updatedAt) : new Date()
        })) as Goal[];
        
        setGoals(goalsData);
        setIsLoading(false);
      }, (error) => {
        console.error("Error loading goals:", error);
        setIsLoading(false);
      });

      // ניקוי ה-listener כשהקומפוננטה מתפרקת
      return () => unsubscribe();
    } catch (error) {
      console.error('Error loading world and goals:', error);
      setError('אירעה שגיאה בטעינת הנתונים');
      setIsLoading(false);
    }
  }, [user, worldId]);

  useEffect(() => {
    loadWorldAndGoals();
  }, [loadWorldAndGoals]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-500" />
      </div>
    );
  }

  if (!world) return <div>העולם לא נמצא</div>;

  return (
    <div className="space-y-8 animate-fade-in max-w-4xl mx-auto px-4">
      {/* Hero Section */}
      <div className="text-center mb-12">
        <div className="bg-gradient-to-r from-primary-400/90 to-sunset-400/90 p-8 rounded-3xl shadow-lg">
          <h1 className="text-3xl md:text-4xl font-bold mb-3 text-[#31161699]">
            {world.name}
          </h1>
          <p className="text-[#321f1f99] text-lg">
            הגדר מטרות משמעותיות שיעזרו לך להתקדם בעולם זה
          </p>
        </div>
      </div>

      {/* Time Slots Summary */}
      <div className="bg-white p-6 rounded-xl shadow-sm mb-8">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-lg font-medium">זמנים מתוכננים</h2>
          <Link 
            href={`/worlds/${worldId}`}
            className="text-primary-500 hover:text-primary-600 text-sm"
          >
            ערוך זמנים
          </Link>
        </div>
        
        {world.timeSlots && world.timeSlots.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {DAYS.map(day => {
              const daySlots = world.timeSlots.filter(slot => slot.dayOfWeek === day.value);
              if (daySlots.length === 0) return null;
              
              return (
                <div key={day.value} className="p-3 bg-gray-50 rounded-lg">
                  <div className="font-medium mb-2">{day.label}</div>
                  {daySlots.map((slot, index) => (
                    <div key={index} className="text-sm text-gray-600">
                      {slot.startTime} - {slot.endTime}
                    </div>
                  ))}
                </div>
              );
            })}
          </div>
        ) : (
          <div className="text-center text-gray-500 py-4">
            לא הוגדרו זמנים קבועים לעולם זה
          </div>
        )}
      </div>

      {error ? (
        <div className="text-red-500 text-center py-12">{error}</div>
      ) : (
        <div className="space-y-6">
          {/* רשימת המטרות */}
          <div className="space-y-6">
            {goals.map(goal => (
              <GoalCard 
                key={goal.id}
                worldId={worldId}
                goal={goal}
                world={world!}
                onUpdate={() => {
                  loadWorldAndGoals();
                }}
              >
                <TaskList
                  worldId={worldId}
                  goalId={goal.id}
                  world={world!}
                  onUpdate={() => {
                    loadWorldAndGoals();
                  }}
                />
              </GoalCard>
            ))}
          </div>

          {/* הוספת מטרה */}
          {showAddGoal ? (
            <div className="bg-white p-6 rounded-lg shadow-sm">
              <AddGoalForm
                worldId={worldId}
                onComplete={() => {
                  loadWorldAndGoals();
                  setShowAddGoal(false);
                }}
                onCancel={() => setShowAddGoal(false)}
              />
            </div>
          ) : (
            <button
              onClick={() => setShowAddGoal(true)}
              className="w-full p-4 border-2 border-dashed border-gray-300 rounded-lg text-gray-500 hover:border-primary-500 hover:text-primary-500 transition-colors"
            >
              + הוסף מטרה חדשה
            </button>
          )}
        </div>
      )}
    </div>
  );
} 