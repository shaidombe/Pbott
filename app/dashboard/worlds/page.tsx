/* eslint-disable @typescript-eslint/no-unused-vars */
'use client';
import { useState, useEffect, useCallback } from 'react';
import { useApp } from '@/app/contexts/AppContext';
import { collection, getDocs, addDoc, doc, updateDoc } from 'firebase/firestore';
import { db } from '@/app/lib/firebase/config';
import { World, WorldCategory } from '@/app/types';
import { useRouter } from 'next/navigation';
import { getWorldName, getWorldDescription, getWorldIcon } from '@/app/lib/utils/worldUtils';

export default function WorldsSetup() {
  const { user, worlds, refreshWorlds } = useApp();
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const loadWorlds = useCallback(async () => {
    if (!user) return;
    setIsLoading(true);
    try {
      const worldsRef = collection(db, `users/${user.id}/worlds`);
      const snapshot = await getDocs(worldsRef);
      const worldsData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as World[];
      refreshWorlds(worldsData);
    } catch (error: unknown) {
      console.error('Error loading worlds:', error instanceof Error ? error.message : 'Unknown error');
    } finally {
      setIsLoading(false);
    }
  }, [user, refreshWorlds]);

  useEffect(() => {
    loadWorlds();
  }, [loadWorlds]);

  const activateWorld = async (category: WorldCategory) => {
    if (!user) return;
    
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
      await loadWorlds();
    } catch (_err) {
      setError('אירעה שגיאה בהפעלת העולם');
    }
  };

  const deactivateWorld = async (worldId: string) => {
    try {
      const worldRef = doc(db, 'worlds', worldId);
      await updateDoc(worldRef, {
        isActive: false,
        updatedAt: new Date()
      });
      await loadWorlds();
    } catch (err) {
      setError('אירעה שגיאה בהשבתת העולם');
    }
  };

  const navigateToGoals = (worldId: string) => {
    router.push(`/dashboard/worlds/${worldId}/goals`);
  };

  return (
    <div className="space-y-8 animate-fade-in">
      <div className="text-center mb-12">
        <div className="bg-gradient-to-r from-sunset-400/90 to-primary-400/90 p-8 rounded-3xl shadow-lg">
          <h1 className="text-3xl md:text-4xl font-bold mb-3 text-[#31161699]">
            העולמות שלך
          </h1>
          <p className="text-[#321f1f99] text-lg">
            העולמות הם התחומים השונים בחיים שלך. לכל עולם יש מטרות ומשימות משלו.
            התחל על ידי הפעלת העולמות שחשובים לך, והגדר להם מטרות.
          </p>
        </div>
      </div>

      <div className="text-gray-600 text-center max-w-2xl mx-auto mb-8">
        <p>
          כל עולם מייצג תחום חיים חשוב. הפעל את העולמות הרלוונטיים עבורך והתחל להגדיר מטרות לכל עולם.
        </p>
      </div>

      {isLoading ? (
        <div className="text-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-sunset-500 mx-auto"></div>
        </div>
      ) : error ? (
        <div className="text-red-500 text-center py-12">{error}</div>
      ) : (
        <div className="space-y-8">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {[
              WorldCategory.WORK,
              WorldCategory.FAMILY,
              WorldCategory.HEALTH,
              WorldCategory.LEISURE,
              WorldCategory.CUSTOM
            ].map((category) => {
              const world = worlds.find(w => w.category === category);
              return (
                <WorldCard
                  key={category}
                  title={getWorldName(category)}
                  description={getWorldDescription(category)}
                  isActive={!!world?.isActive}
                  icon={getWorldIcon(category)}
                  stats={world?.stats}
                  onActivate={() => activateWorld(category)}
                  onNavigate={() => world && navigateToGoals(world.id)}
                />
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

interface WorldCardProps {
  title: string;
  description: string;
  isActive: boolean;
  icon: string;
  onActivate: () => Promise<void>;
  onNavigate: () => void;
  stats?: {
    totalGoals: number;
    completedGoals: number;
    timeInvested: number; // בדקות
  };
}

function WorldCard({ title, description, isActive, icon, onActivate, onNavigate, stats }: WorldCardProps) {
  const formatTime = (minutes: number) => {
    if (!minutes) return '0 דקות';
    if (minutes < 60) return `${minutes} דקות`;
    const hours = Math.floor(minutes / 60);
    const remainingMinutes = minutes % 60;
    return `${hours} שעות ${remainingMinutes > 0 ? `ו-${remainingMinutes} דקות` : ''}`;
  };

  return (
    <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
      <div className="flex justify-between items-start mb-4">
        <div>
          <h3 className="text-xl font-semibold flex items-center gap-2">
            <span>{icon}</span>
            {title}
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
            <div className="font-semibold">{stats.completedGoals}/{stats.totalGoals}</div>
          </div>
          <div>
            <div className="text-sm text-gray-500">הושקעו</div>
            <div className="font-semibold">{formatTime(stats.timeInvested)}</div>
          </div>
          <div>
            <div className="text-sm text-gray-500">התקדמות</div>
            <div className="font-semibold">
              {stats.totalGoals ? Math.round((stats.completedGoals / stats.totalGoals) * 100) : 0}%
            </div>
          </div>
        </div>
      )}

      <div className="flex gap-2">
        {isActive ? (
          <button
            onClick={onNavigate}
            className="flex-1 bg-primary-500 text-white px-4 py-2 rounded-md hover:bg-primary-600"
          >
            צפה במטרות
          </button>
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