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
import TimeSettingsModal from '@/app/components/worlds/TimeSettingsModal';
import WorldTabs from '@/app/components/worlds/WorldTabs';

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

export default function WorldsPage() {
  const { worlds, user } = useApp();

  const handleTimeUpdate = async (worldId: string, timeSlots: TimeSlot[]) => {
    if (!user) return;
    
    try {
      await updateDoc(doc(db, `users/${user.id}/worlds/${worldId}`), {
        timeSlots,
        updatedAt: new Date()
      });
    } catch (error) {
      console.error('Error updating time slots:', error);
    }
  };

  const handleActivate = async (worldId: string) => {
    if (!user) return;
    
    try {
      await updateDoc(doc(db, `users/${user.id}/worlds/${worldId}`), {
        isActive: true,
        updatedAt: new Date()
      });
    } catch (error) {
      console.error('Error activating world:', error);
    }
  };

  const handleDeactivate = async (worldId: string) => {
    if (!user) return;
    
    try {
      await updateDoc(doc(db, `users/${user.id}/worlds/${worldId}`), {
        isActive: false,
        updatedAt: new Date()
      });
    } catch (error) {
      console.error('Error deactivating world:', error);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <WorldTabs 
        worlds={worlds} 
        onTimeUpdate={handleTimeUpdate}
        onActivate={handleActivate}
        onDeactivate={handleDeactivate}
      />
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
  const [showTimeSettings, setShowTimeSettings] = useState(false);
  
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
      {/* Header */}
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

      {/* Stats */}
      {stats && (
        <div className="grid grid-cols-3 gap-4 mb-4">
          <div>
            <div className="text-sm text-gray-500">מטרות</div>
            <div className="font-semibold">
              {stats.totalGoals === 0 ? (
                <span className="text-yellow-600 text-sm">הגדר מטרה</span>
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
            <div className="text-sm text-gray-500">זמן שבועי</div>
            <div className="font-semibold">{formatTime(stats.timeInvested)}</div>
          </div>
        </div>
      )}

      {/* Warning for missing time slots */}
      {isActive && timeSlots.length === 0 && (
        <div className="flex items-center text-red-500 text-sm bg-red-50 p-2 rounded-lg mb-4">
          <ExclamationTriangleIcon className="w-4 h-4 mr-1" />
          חובה להגדיר זמנים
        </div>
      )}

      {/* Actions */}
      <div className="flex gap-2">
        {isActive ? (
          <>
            <button
              onClick={onNavigate}
              className="flex-1 bg-primary-500 text-white px-4 py-2 rounded-md hover:bg-primary-600"
            >
              צפה במטרות
            </button>
            <button
              onClick={() => setShowTimeSettings(true)}
              className="px-4 py-2 text-gray-600 hover:bg-gray-50 rounded-md"
            >
              זמנים
            </button>
            <button
              onClick={onDeactivate}
              className="px-4 py-2 text-red-500 hover:bg-red-50 rounded-md"
            >
              השבת
            </button>
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

      {/* Time Settings Modal */}
      {isActive && (
        <TimeSettingsModal
          isOpen={showTimeSettings}
          onClose={() => setShowTimeSettings(false)}
          world={worldData}
          onUpdate={handleTimeUpdate}
        />
      )}
    </div>
  );
}