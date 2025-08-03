'use server';

import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';

export async function logout() {
  const cookieStore = await cookies();
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return cookieStore.get(name)?.value
        },
        set(name: string, value: string, options: CookieOptions) {
          cookieStore.set({ name, value, ...options })
        },
        remove(name: string, options: CookieOptions) {
          cookieStore.set({ name, value: '', ...options })
        },
      },
    }
  );

  const { error } = await supabase.auth.signOut();

  if (error) {
    console.error('Error logging out:', error);
    // Optionally handle the error
  }

  redirect('/login');
}

export async function getUsageStats() {
  const cookieStore = await cookies();
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return cookieStore.get(name)?.value
        },
        set(name: string, value: string, options: CookieOptions) {
          cookieStore.set({ name, value, ...options })
        },
        remove(name: string, options: CookieOptions) {
          cookieStore.set({ name, value: '', ...options })
        },
      },
    }
  );

  const { data: { user }, error: userError } = await supabase.auth.getUser();
  
  if (userError || !user) {
    throw new Error('User not authenticated');
  }

  // Get user's profile for usage data
  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('email_count')
    .eq('id', user.id)
    .single();

  if (profileError) {
    console.error('Error fetching user profile:', profileError);
    return {
      emailsUsed: 0,
      emailsRemaining: 25,
      contactsUploaded: 0,
      contactsRemaining: 50,
      isPremium: false
    };
  }

  // Get user's subscription status
  const { data: subscription, error: subscriptionError } = await supabase
    .from('subscriptions')
    .select('status, prices(products(name))')
    .eq('user_id', user.id)
    .in('status', ['trialing', 'active'])
    .single();

  const isPremium = !subscriptionError && subscription;
  const emailsUsed = profile?.email_count || 0;
  const emailsRemaining = isPremium ? -1 : Math.max(0, 25 - emailsUsed);

  return {
    emailsUsed,
    emailsRemaining,
    contactsUploaded: 0, // TODO: Add contact count tracking
    contactsRemaining: isPremium ? -1 : 50,
    isPremium
  };
} 