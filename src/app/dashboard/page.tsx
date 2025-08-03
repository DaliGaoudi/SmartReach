import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';

export default async function Dashboard() {
  const supabase = await createClient();
  
  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session) {
    redirect('/login');
  }

  // Redirect to contacts page as the main dashboard
  redirect('/dashboard/contacts');
} 