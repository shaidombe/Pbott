'use client';

import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { auth, db } from '@/app/lib/firebase/config';
import { User } from '@/app/types';
import { doc, getDoc, setDoc, updateDoc } from 'firebase/firestore';
import { useRouter } from 'next/navigation';

interface AppContextType {
  user: User | null;
  loading: boolean;
  error: string | null;
}

export const AppContext = createContext<AppContextType>({
  user: null,
  loading: true,
  error: null
});

export function useApp() {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
}

export function AppProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [error, setError] = useState<string | null>(null);
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const router = useRouter();

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged(async (firebaseUser) => {
      if (firebaseUser) {
        try {
          const userRef = doc(db, 'users', firebaseUser.uid);
          const userDoc = await getDoc(userRef);
          
          if (userDoc.exists()) {
            // Update existing user data with latest photo URL
            const userData = userDoc.data() as User;
            if (firebaseUser.photoURL && userData.photoURL !== firebaseUser.photoURL) {
              await updateDoc(userRef, {
                photoURL: firebaseUser.photoURL,
                updatedAt: new Date()
              });
            }
            setUser({ ...userData, photoURL: firebaseUser.photoURL || userData.photoURL });
          } else {
            // Create new user with photo URL
            const newUser: User = {
              id: firebaseUser.uid,
              email: firebaseUser.email || '',
              name: firebaseUser.displayName || '',
              photoURL: firebaseUser.photoURL || '',
              googleCalendarConnected: false,
              createdAt: new Date(),
              updatedAt: new Date()
            };
            
            await setDoc(userRef, newUser);
            setUser(newUser);
          }
        } catch (err) {
          console.error('Error setting up user:', err);
        }
      } else {
        setUser(null);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  return (
    <AppContext.Provider value={{ user, loading, error }}>
      {children}
    </AppContext.Provider>
  );
} 