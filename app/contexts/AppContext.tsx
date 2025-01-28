'use client';

import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { 
  User, 
  World, 
  BigStone, 
  DailyPlan, 
  Goal, 
  ConnectedCalendar, 
  GoogleCalendarService,
  GoogleCalendarResponse 
} from '@/app/types';
import { auth, db } from '@/lib/firebase/config';
import { collection, onSnapshot, doc, updateDoc } from 'firebase/firestore';
import { GoogleCalendarService as GoogleCalendarServiceImpl } from '@/app/services/googleCalendar';
import { onAuthStateChanged } from 'firebase/auth';

export interface AppContextType {
  user: User | null;
  worlds: World[];
  goals: Goal[];
  currentWorld: World | null;
  bigStones: BigStone[];
  todaysPlan: DailyPlan | null;
  isLoading: boolean;
  googleCalendar: GoogleCalendarService;
  setCurrentWorld: (world: World | null) => void;
  syncCalendar: () => Promise<void>;
  refreshWorlds: (worlds: World[]) => void;
  updateGoogleCalendarStatus: (isConnected: boolean) => Promise<void>;
  connectedCalendars: ConnectedCalendar[];
}

const defaultGoogleCalendar: GoogleCalendarService = {
  connect: async () => {},
  disconnect: async () => {},
  getEvents: async () => ({ items: [] })  // החזרת אובייקט ריק כברירת מחדל
};

export const AppContext = createContext<AppContextType>({
  user: null,
  worlds: [],
  goals: [],
  currentWorld: null,
  bigStones: [],
  todaysPlan: null,
  isLoading: true,
  googleCalendar: defaultGoogleCalendar,  // שימוש בערך ברירת המחדל
  setCurrentWorld: () => {},
  syncCalendar: async () => {},
  refreshWorlds: () => {},
  updateGoogleCalendarStatus: async () => {},
  connectedCalendars: []
});

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [worlds, setWorlds] = useState<World[]>([]);
  const [goals, setGoals] = useState<Goal[]>([]);
  const [currentWorld, setCurrentWorld] = useState<World | null>(null);
  const [bigStones, setBigStones] = useState<BigStone[]>([]);
  const [todaysPlan, setTodaysPlan] = useState<DailyPlan | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [googleCalendar, setGoogleCalendar] = useState<GoogleCalendarServiceImpl | null>(null);
  const [isAuthReady, setIsAuthReady] = useState(false);
  const [connectedCalendars, setConnectedCalendars] = useState<ConnectedCalendar[]>([]);

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

  // עדכון סטטוס חיבור היומן
  const updateGoogleCalendarStatus = async (isConnected: boolean) => {
    if (!user) return;
    
    // בדיקה אם הסטטוס באמת השתנה
    if (user.googleCalendarConnected === isConnected) {
      console.log('Calendar status already matches requested state:', isConnected);
      return;
    }

    console.log('Updating Google Calendar status:', {
      userId: user.id,
      isConnected,
      currentStatus: user.googleCalendarConnected
    });

    try {
      await updateDoc(doc(db, 'users', user.id), {
        googleCalendarConnected: isConnected,
        updatedAt: new Date()
      });
      console.log('Google Calendar status updated successfully');
    } catch (error) {
      console.error('Error updating Google Calendar status:', error);
    }
  };

  // האזנה לשינויים ביומנים המחוברים
  useEffect(() => {
    if (!user?.id) return;
    
    console.log('Setting up calendars listener for user:', user.id);
    
    const unsubscribe = onSnapshot(
      collection(db, 'users', user.id, 'connectedCalendars'),
      async (snapshot) => {
        const calendars = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data(),
          updatedAt: doc.data().updatedAt?.toDate()
        })) as ConnectedCalendar[];
        
        console.log('Connected calendars updated:', { 
          count: calendars.length,
          calendars: calendars.map(c => ({ id: c.id, name: c.name, isActive: c.isActive }))
        });
        
        setConnectedCalendars(calendars);

        // עדכון סטטוס החיבור רק אם יש שינוי אמיתי
        const shouldBeConnected = calendars.length > 0;
        if (shouldBeConnected !== user.googleCalendarConnected) {
          console.log('Updating connection status:', { shouldBeConnected });
          await updateDoc(doc(db, 'users', user.id), {
            googleCalendarConnected: shouldBeConnected,
            updatedAt: new Date()
          });
          // עדכון מיידי של מצב המשתמש במקום
          setUser(prevUser => prevUser ? {
            ...prevUser,
            googleCalendarConnected: shouldBeConnected
          } : null);
        }
      }
    );

    // האזנה לשינויים במסמך המשתמש
    const userUnsubscribe = onSnapshot(
      doc(db, 'users', user.id),
      (doc) => {
        const userData = doc.data();
        if (userData) {
          setUser(prevUser => prevUser ? {
            ...prevUser,
            ...userData,
            googleCalendarConnected: userData.googleCalendarConnected ?? false
          } : null);
        }
      }
    );

    return () => {
      unsubscribe();
      userUnsubscribe();
    };
  }, [user?.id]);

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

  const googleCalendarApi: GoogleCalendarService = {
    connect: async () => {
      // ... existing connect logic ...
    },
    disconnect: async () => {
      // ... existing disconnect logic ...
    },
    getEvents: async (timeMin: Date, timeMax: Date): Promise<GoogleCalendarResponse> => {
      if (!user) {
        console.log('No user found, returning empty events array');
        return { items: [] };
      }

      try {
        const firebaseUser = auth.currentUser;
        if (!firebaseUser) {
          console.log('No Firebase user found');
          return { items: [] };
        }

        const idToken = await firebaseUser.getIdToken(true);
        
        const response = await fetch(
          `/api/calendar/events?` +
          `timeMin=${timeMin.toISOString()}&` +
          `timeMax=${timeMax.toISOString()}`,
          {
            headers: {
              'Authorization': `Bearer ${idToken}`,
              'Content-Type': 'application/json',
            }
          }
        );
        
        if (!response.ok) {
          throw new Error(`Failed to fetch events: ${response.statusText}`);
        }
        
        const data = await response.json();
        return { items: data.items || [] };
      } catch (error) {
        console.error('Error fetching calendar events:', error);
        return { items: [] };
      }
    }
  };

  if (!isAuthReady) {
    console.log('AppContext: Waiting for auth to be ready');
    return <div>Loading...</div>;
  }

  return (
    <AppContext.Provider value={{
      user,
      worlds,
      goals,
      currentWorld,
      bigStones,
      todaysPlan,
      isLoading,
      googleCalendar: googleCalendarApi,
      setCurrentWorld,
      syncCalendar,
      refreshWorlds,
      updateGoogleCalendarStatus,
      connectedCalendars
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