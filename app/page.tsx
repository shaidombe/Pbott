export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-24">
      <h1 className="text-4xl font-bold">ברוכים הבאים ל-Pbot</h1>
      <a 
        href="/auth/login" 
        className="mt-4 px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
      >
        התחבר למערכת
      </a>
    </main>
  );
}
