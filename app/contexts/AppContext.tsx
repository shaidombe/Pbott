'use client';

import { createContext, useContext, useState, useEffect } from 'react';
import { User, World, BigStone, DailyPlan } from '@/app/types';
import { auth, db } from '@/app/lib/firebase/config';
import { collection, query, where, onSnapshot, doc, getDoc } from 'firebase/firestore';
import { GoogleCalendarService } from '@/app/lib/services/googleCalendar';

interface AppContextType {
  user: User | null;
  worlds: World[];
  currentWorld: World | null;
  bigStones: BigStone[];
  todaysPlan: DailyPlan | null;
  isLoading: boolean;
  googleCalendar: GoogleCalendarService | null;
  setCurrentWorld: (world: World) => void;
  syncCalendar: () => Promise<void>;
  refreshWorlds: (worlds: World[]) => void;
}

export const AppContext = createContext<AppContextType>({
  user: null,
  worlds: [],
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

  useEffect(() => {
    const unsubAuth = auth.onAuthStateChanged(async (firebaseUser) => {
      if (firebaseUser) {
        const userDoc = await getDoc(doc(db, 'users', firebaseUser.uid));
        if (userDoc.exists()) {
          const userData = userDoc.data() as User;
          setUser(userData);
          
          // יצירת שירות Google Calendar אם יש טוקן
          if (userData.googleAccessToken) {
            setGoogleCalendar(new GoogleCalendarService(userData.googleAccessToken));
          }
        }
      } else {
        setUser(null);
        setGoogleCalendar(null);
      }
      setIsLoading(false);
    });

    return () => unsubAuth();
  }, []);

  useEffect(() => {
    if (!user) return;

    // האזנה לשינויים בעולמות
    const q = query(collection(db, 'worlds'), where('userId', '==', user.id));
    const unsubWorlds = onSnapshot(q, (snapshot) => {
      const worldsData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as World[];
      setWorlds(worldsData);
    });

    return () => unsubWorlds();
  }, [user]);

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

  return (
    <AppContext.Provider value={{
      user,
      worlds,
      currentWorld,
      bigStones,
      todaysPlan,
      isLoading,
      googleCalendar,
      setCurrentWorld,
      syncCalendar,
      refreshWorlds: setWorlds
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