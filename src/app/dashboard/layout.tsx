import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import LogoutButton from './logout-button';
import { NotificationBell } from '@/components/NotificationBell';

// Header component that uses client-side features
function Header({ userEmail }: { userEmail: string }) {
  return (
    <header className="bg-white shadow-sm border-b border-zinc-200">
      <div className="max-w-7xl mx-auto py-3 sm:py-4 px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row justify-between items-center gap-2 sm:gap-4">
        <h1 className="text-lg sm:text-xl font-bold text-pink-500">SmartSendr Dashboard</h1>
        <div className="flex items-center gap-2 sm:gap-4 text-xs sm:text-sm">
          <NotificationBell />
          <p className="text-zinc-600 hidden sm:block">Signed in as {userEmail}</p>
          <p className="text-zinc-600 sm:hidden">{userEmail?.split('@')[0]}...</p>
          <LogoutButton />
        </div>
      </div>
    </header>
  );
}

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  return (
    <div className="min-h-screen bg-zinc-50">
      <Header userEmail={user.email || ''} />
      <main className="py-6 sm:py-10 px-4 sm:px-6 lg:px-8">
        {children}
      </main>
    </div>
  );
} 