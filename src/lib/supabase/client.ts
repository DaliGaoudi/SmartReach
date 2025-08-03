import { createBrowserClient } from '@supabase/ssr';

export function createClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  // Debug logging to help identify the issue
  if (!supabaseUrl || !supabaseAnonKey) {
    console.error('Missing Supabase environment variables:', {
      url: supabaseUrl ? 'SET' : 'MISSING',
      anonKey: supabaseAnonKey ? 'SET' : 'MISSING'
    });
  }

  // Check if we're accidentally using the service role key
  if (supabaseAnonKey && supabaseAnonKey.startsWith('eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9')) {
    // This looks like a JWT token, check if it's the service role key
    if (supabaseAnonKey.includes('service_role')) {
      console.error('ERROR: Using service role key in browser! This is not allowed.');
      throw new Error('Service role key detected in browser. Use anon key instead.');
    }
  }

  return createBrowserClient(
    supabaseUrl!,
    supabaseAnonKey!
  );
} 