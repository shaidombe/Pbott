'use client';

import WorldTimeSettings from '@/app/components/worlds/WorldTimeSettings';
import { useApp } from '@/app/contexts/AppContext';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase/config';
import { TimeSlot } from '@/app/types';
import { useParams } from 'next/navigation';
import Link from 'next/link';

function WorldPage() {
  const params = useParams();
  const worldId = params.worldId as string;
  const { worlds, user } = useApp();
  const world = worlds.find(w => w.id === worldId);

  const handleTimeUpdate = async (timeSlots: TimeSlot[]) => {
    if (!world || !user) return;
    
    try {
      await updateDoc(doc(db, `users/${user.id}/worlds/${world.id}`), {
        timeSlots,
        updatedAt: new Date()
      });
    } catch (error) {
      console.error('Error updating time slots:', error);
    }
  };

  if (!world) return <div>World not found</div>;

  return (
    <div className="space-y-8">
      {/* Hero Section */}
      <div className="text-center mb-12">
        <div className="bg-gradient-to-r from-primary-400/90 to-accent-400/90 p-8 rounded-3xl shadow-lg">
          <h1 className="text-3xl md:text-4xl font-bold mb-3 text-[#31161699]">
            {world.name}
          </h1>
          <p className="text-[#321f1f99]">
            הגדר את הזמנים המועדפים עליך לפעילויות בעולם זה
          </p>
        </div>
      </div>

      {/* Navigation */}
      <div className="flex justify-end mb-6">
        <Link 
          href={`/worlds/${world.id}/goals`}
          className="text-primary-500 hover:underline"
        >
          צפה במטרות →
        </Link>
      </div>

      {/* Time Settings */}
      <div className="bg-white p-6 rounded-xl shadow-sm">
        <h2 className="text-xl font-semibold mb-4">זמנים מועדפים</h2>
        <WorldTimeSettings 
          world={world} 
          onUpdate={handleTimeUpdate} 
        />
      </div>
    </div>
  );
}

export default WorldPage; 