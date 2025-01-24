'use client';

import { createContext, useContext, useState, useEffect } from 'react';
import { User, World, BigStone, DailyPlan, Goal } from '@/app/types';
import { auth, db } from '@/lib/firebase/config';
import { collection, onSnapshot } from 'firebase/firestore';
import { GoogleCalendarService } from '@/lib/services/googleCalendar';
import { onAuthStateChanged } from 'firebase/auth';

interface AppContextType {
  user: User | null;
  worlds: World[];
  goals: Goal[];
  currentWorld: World | null;
  bigStones: BigStone[];
  todaysPlan: DailyPlan | null;
  isLoading: boolean;
  googleCalendar: GoogleCalendarService | null;
  setCurrentWorld: (world: World | null) => void;
  syncCalendar: () => Promise<void>;
  refreshWorlds: (worlds: World[]) => void;
}

export const AppContext = createContext<AppContextType>({
  user: null,
  worlds: [],
  goals: [],
  currentWorld: null,
  bigStones: [],
  todaysPlan: null,
  isLoading: true,
  googleCalendar: null,
  setCurrentWorld: () => {},
  syncCalendar: async () => {},
  refreshWorlds: () => {}
});

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [worlds, setWorlds] = useState<World[]>([]);
  const [currentWorld, setCurrentWorld] = useState<World | null>(null);
  const [bigStones] = useState<BigStone[]>([]);
  const [todaysPlan] = useState<DailyPlan | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [googleCalendar, setGoogleCalendar] = useState<GoogleCalendarService | null>(null);
  const [isAuthReady, setIsAuthReady] = useState(false);

  // Check if we're in build time
  const isBuildTime = process.env.NODE_ENV === 'production' && typeof window === 'undefined';

  useEffect(() => {
    // Skip auth check during build time
    if (isBuildTime) return;
    
    console.log('AppContext: Waiting for auth to be ready');
    let worldsUnsubscribe: (() => void) | undefined;

    const authUnsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
      console.log('AppContext: Auth state changed', { 
        hasUser: !!firebaseUser 
      });

      if (firebaseUser) {
        const now = new Date();
        setUser({
          id: firebaseUser.uid,
          email: firebaseUser.email || '',
          name: firebaseUser.displayName || '',
          photoURL: firebaseUser.photoURL || '',
          googleCalendarConnected: false,
          createdAt: now,
          updatedAt: now
        });
        
        // הגדר האזנה לעולמות
        const worldsRef = collection(db, `users/${firebaseUser.uid}/worlds`);
        worldsUnsubscribe = onSnapshot(worldsRef, (snapshot) => {
          const worldsData = snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
          })) as World[];
          
          const normalizedWorlds = worldsData.map(world => ({
            ...world,
            isActive: world.isActive ?? false,
            timeSlots: world.timeSlots ?? [],
            stats: world.stats ?? {
              totalGoals: 0,
              completedGoals: 0,
              timeInvested: 0
            }
          }));
          
          console.log('AppContext: Worlds updated from Firestore', { 
            count: normalizedWorlds.length 
          });
          
          setWorlds(normalizedWorlds);
        }, (error) => {
          console.error('AppContext: Error in worlds subscription:', error);
        });

      } else {
        // נקה את המצב כשהמשתמש מתנתק
        setUser(null);
        setWorlds([]);
        if (worldsUnsubscribe) {
          worldsUnsubscribe();
          worldsUnsubscribe = undefined;
        }
      }
      
      setIsAuthReady(true);
      setIsLoading(false);
    });

    // נקה את כל ההאזנות כשהקומפוננטה מתפרקת
    return () => {
      if (worldsUnsubscribe) {
        worldsUnsubscribe();
      }
      authUnsubscribe();
    };
  }, []);

  const syncCalendar = async () => {
    if (!googleCalendar || !user) return;

    try {
      // קבלת אירועים מהיום
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);

      const events = await googleCalendar.getEvents(today, tomorrow);
      
      // TODO: סנכרון האירועים עם המשימות ב-Firestore
      console.log('Calendar events:', events);
    } catch (error) {
      console.error('Error syncing calendar:', error);
    }
  };

  const refreshWorlds = (newWorlds: World[]) => {
    console.log('AppContext: Manual worlds refresh requested', { 
      count: newWorlds.length 
    });
    // לא צריך לעשות כלום כי ה-snapshot יתפוס את השינויים
  };

  if (!isAuthReady) {
    console.log('AppContext: Waiting for auth to be ready');
    return <div>Loading...</div>;
  }

  return (
    <AppContext.Provider value={{
      user,
      worlds,
      goals: [],
      currentWorld,
      bigStones,
      todaysPlan,
      isLoading,
      googleCalendar,
      setCurrentWorld,
      syncCalendar,
      refreshWorlds
    }}>
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  const context = useContext(AppContext);
  if (context === undefined) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
} 