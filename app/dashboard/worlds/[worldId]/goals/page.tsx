/* eslint-disable @typescript-eslint/no-unused-vars */
'use client';
import { useState, useEffect, useCallback } from 'react';
import { useApp } from '@/app/contexts/AppContext';
import { doc, getDoc, collection, addDoc, getDocs } from 'firebase/firestore';
import { db } from '@/app/lib/firebase/config';
import { World, Goal } from '@/app/types';
import { useParams } from 'next/navigation';
import GoalCard from './components/GoalCard';

export default function WorldGoals() {
  const { user } = useApp();
  const params = useParams();
  const worldId = params.worldId as string;
  
  const [world, setWorld] = useState<World | null>(null);
  const [goals, setGoals] = useState<Goal[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showAddGoal, setShowAddGoal] = useState(false);
  const [newGoalTitle, setNewGoalTitle] = useState('');
  const [newGoalDescription, setNewGoalDescription] = useState('');

  const loadWorldAndGoals = useCallback(async () => {
    if (!user) return;
    setIsLoading(true);
    try {
      // Load world
      const worldRef = doc(db, `users/${user.id}/worlds/${worldId}`);
      const worldDoc = await getDoc(worldRef);
      if (!worldDoc.exists()) {
        console.error('World not found');
        return;
      }
      setWorld({ id: worldDoc.id, ...worldDoc.data() } as World);

      // Load goals
      const goalsRef = collection(db, `users/${user.id}/worlds/${worldId}/goals`);
      const snapshot = await getDocs(goalsRef);
      const goalsData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Goal[];
      setGoals(goalsData);
    } catch (error: unknown) {
      console.error('Error loading world and goals:', error instanceof Error ? error.message : 'Unknown error');
    } finally {
      setIsLoading(false);
    }
  }, [user, worldId]);

  useEffect(() => {
    loadWorldAndGoals();
  }, [loadWorldAndGoals]);

  const addGoal = async () => {
    if (!user || !newGoalTitle.trim()) return;

    try {
      const goalsRef = collection(db, `users/${user.id}/worlds/${worldId}/goals`);
      const newGoal: Omit<Goal, 'id'> = {
        worldId,
        userId: user.id,
        title: newGoalTitle.trim(),
        description: newGoalDescription.trim(),
        target: 0,
        currentProgress: 0,
        timeInvested: 0,
        isCompleted: false,
        createdAt: new Date(),
        updatedAt: new Date()
      };

      await addDoc(goalsRef, newGoal);
      await loadWorldAndGoals();
      setNewGoalTitle('');
      setNewGoalDescription('');
      setShowAddGoal(false);
    } catch (_err) {
      setError('אירעה שגיאה בהוספת המטרה');
    }
  };

  if (isLoading) return <div>Loading...</div>;
  if (!world) return <div>World not found</div>;

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Hero Section */}
      <div className="text-center mb-12">
        <div className="bg-gradient-to-r from-primary-400/90 to-sunset-400/90 p-8 rounded-3xl shadow-lg">
          <h1 className="text-3xl md:text-4xl font-bold mb-3 text-[#31161699]">
            {world?.name || 'טוען...'}
          </h1>
          <p className="text-[#321f1f99] text-lg">
            הגדר מטרות משמעותיות שיעזרו לך להתקדם בעולם זה
          </p>
        </div>
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
                onUpdate={loadWorldAndGoals}
              />
            ))}
          </div>

          {/* טופס הוספת מטרה */}
          {showAddGoal ? (
            <div className="bg-white p-6 rounded-lg shadow-sm">
              <input
                type="text"
                placeholder="שם המטרה"
                value={newGoalTitle}
                onChange={(e) => setNewGoalTitle(e.target.value)}
                className="w-full p-2 mb-2 border rounded-md"
              />
              <textarea
                placeholder="תיאור המטרה"
                value={newGoalDescription}
                onChange={(e) => setNewGoalDescription(e.target.value)}
                className="w-full p-2 mb-4 border rounded-md"
                rows={3}
              />
              <div className="flex gap-2">
                <button
                  onClick={addGoal}
                  className="px-4 py-2 bg-primary-500 text-white rounded-md hover:bg-primary-600"
                >
                  הוסף מטרה
                </button>
                <button
                  onClick={() => setShowAddGoal(false)}
                  className="px-4 py-2 text-gray-600 hover:bg-gray-50 rounded-md"
                >
                  ביטול
                </button>
              </div>
            </div>
          ) : (
            <button
              onClick={() => setShowAddGoal(true)}
              className="w-full p-4 border-2 border-dashed border-gray-300 rounded-lg text-gray-500 hover:border-primary-500 hover:text-primary-500"
            >
              + הוסף מטרה חדשה
            </button>
          )}
        </div>
      )}
    </div>
  );
} 