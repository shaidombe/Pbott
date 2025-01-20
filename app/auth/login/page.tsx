import GoogleSignInButton from '@/app/components/auth/GoogleSignInButton';

export default function LoginPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-neutral-50">
      <div className="max-w-md w-full space-y-8 p-8">
        <div className="text-center">
          <h2 className="mt-6 text-3xl font-extrabold text-black">
            ברוכים הבאים ל-Pbot
          </h2>
          <p className="mt-2 text-sm text-neutral-800">
            מערכת לתכנון חיים חכם ויעיל
          </p>
        </div>
        <div className="mt-8 space-y-6">
          <GoogleSignInButton />
        </div>
      </div>
    </div>
  );
} 