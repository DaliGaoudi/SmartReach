import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import LogoutButton from './logout-button';

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
      <header className="bg-white shadow-sm border-b border-zinc-200">
        <div className="max-w-7xl mx-auto py-4 px-4 sm:px-6 lg:px-8 flex justify-between items-center">
          <h1 className="text-xl font-bold text-pink-500">SmartSendr Dashboard</h1>
          <div className="flex items-center gap-4">
            <p className="text-sm text-zinc-600">Signed in as {user.email}</p>
            <LogoutButton />
          </div>
        </div>
      </header>
      <main className="py-10">
        {children}
      </main>
    </div>
  );
} 