'use client';

import { auth } from '@/app/lib/firebase/config';
import { GoogleAuthProvider, signInWithPopup } from 'firebase/auth';
import { useState } from 'react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';

export default function GoogleSignInButton() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  const handleSignIn = async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      const provider = new GoogleAuthProvider();
      provider.addScope('https://www.googleapis.com/auth/calendar');
      
      const result = await signInWithPopup(auth, provider);
      
      if (result.user) {
        // התחברות הצליחה - ניתוב לדשבורד
        router.push('/dashboard');
      }
    } catch (error) {
      console.error('Google sign in error:', error);
      setError('אירעה שגיאה בהתחברות. אנא נסה שוב.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div>
      <button
        onClick={handleSignIn}
        disabled={isLoading}
        className="flex items-center justify-center gap-2 w-full px-4 py-2 text-neutral-900 bg-white border border-gray-300 rounded-md hover:bg-neutral-50 transition-colors disabled:opacity-50"
      >
        <Image
          src="/google-logo.png"
          alt="Google Logo"
          width={20}
          height={20}
          className="w-5 h-5"
        />
        <span>{isLoading ? 'מתחבר...' : 'התחבר עם Google'}</span>
      </button>
      
      {error && (
        <p className="mt-2 text-red-500 text-sm text-center">{error}</p>
      )}
    </div>
  );
} 