import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import ProfileManager from './profile';
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

  const session = { user };

  return (
    <div className="min-h-screen bg-black">
      <header className="bg-zinc-900 shadow-sm border-b border-zinc-800">
        <div className="max-w-7xl mx-auto py-4 px-4 sm:px-6 lg:px-8 flex justify-between items-center">
          <h1 className="text-xl font-bold text-pink-500">SmartSendr Dashboard</h1>
          <div className="flex items-center gap-4">
            <p className="text-sm text-zinc-300">Signed in as {user.email}</p>
            <LogoutButton />
          </div>
        </div>
      </header>
      <main className="py-10">
        <div className="max-w-7xl mx-auto sm:px-6 lg:px-8 grid grid-cols-1 md:grid-cols-3 gap-8">
          <div className="md:col-span-1">
            <ProfileManager session={session} />
          </div>
          <div className="md:col-span-2 bg-black p-8 rounded-lg shadow-md border border-zinc-800">
            {children}
          </div>
        </div>
      </main>
    </div>
  );
} 