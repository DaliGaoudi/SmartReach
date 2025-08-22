'use server';

import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { cookies, headers } from 'next/headers';
import { redirect } from 'next/navigation';

export async function signup(formData: FormData) {
  const origin = (await headers()).get('origin');
  const email = formData.get('email') as string;
  const password = formData.get('password') as string;
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

  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      emailRedirectTo: `${origin}/auth/callback`,
    },
  });

  if (error) {
    return { error: error.message };
  }

  // Insert into subscriptions table with 'trialing' status
  if (data.user) {
    const { error: insertError } = await supabase
      .from("subscriptions")
      .insert({
        user_id: data.user.id,
        status: "trialing",
        created: new Date().toISOString(),
        current_period_start: new Date().toISOString(),
        current_period_end: new Date().toISOString(),
      });

    if (insertError) {
      console.error("Error inserting trialing subscription:", insertError);
      return { error: "Account created, but failed to set up trial. Please contact support." };
    }
  }

  return { success: 'Check your email and click the confirmation link to activate your account.' };
}

export async function googleSignup() {
  // Use the explicitly set NEXT_PUBLIC_SITE_URL instead of deriving from origin header
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://www.smartsendr.org';
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

  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      scopes: 'https://www.googleapis.com/auth/gmail.send',
      redirectTo: `${siteUrl}/auth/callback`,
    },
  });

  if (error) {
    console.error('Error signing up with Google:', error);
    // TODO: Handle error display to the user
    return;
  }

  if (data.url) {
    redirect(data.url);
  }


} 