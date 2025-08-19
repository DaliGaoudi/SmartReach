import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get('code');
  const next = requestUrl.searchParams.get('next') || '/dashboard';
 
  if (!code) {
    console.error('No code in callback');
    return NextResponse.redirect(`${requestUrl.origin}/auth/auth-code-error`);
  }

  const cookieStore = await cookies();
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return cookieStore.get(name)?.value;
        },
        set(name: string, value: string, options: CookieOptions) {
          cookieStore.set({ 
            name, 
            value, 
            ...options,
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'lax',
            path: '/'
          });
        },
        remove(name: string, options: CookieOptions) {
          cookieStore.set({ 
            name, 
            value: '', 
            ...options,
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'lax',
            path: '/',
            expires: new Date(0)
          });
        },
      },
    }
  );
   
  const { data, error } = await supabase.auth.exchangeCodeForSession(code);
   
  if (!error && data.session) {
    console.log('Session created successfully:', {
      user_id: data.session.user.id,
      has_provider_token: !!data.session.provider_token,
      has_refresh_token: !!data.session.provider_refresh_token,
      provider: data.session.user.app_metadata?.provider,
      session_expires_at: data.session.expires_at
    });
   
    // Store Gmail tokens if this was a Google OAuth login
    if (data.session.provider_token && data.session.provider_refresh_token) {
      try {
        const expiresAt = new Date(Date.now() + 3600 * 1000).toISOString();
       
        const tokenData = {
          user_id: data.session.user.id,
          access_token: data.session.provider_token,
          refresh_token: data.session.provider_refresh_token,
          expires_at: expiresAt,
          provider: 'google',
          updated_at: new Date().toISOString()
        };
       
        console.log('Storing Gmail tokens for user:', data.session.user.id);
       
        const { error: upsertError } = await supabase
          .from('user_tokens')
          .upsert(tokenData, {
            onConflict: 'user_id'
          });
         
        if (upsertError) {
          console.error('Failed to upsert Gmail tokens:', upsertError);
        } else {
          console.log('Gmail tokens stored successfully');
        }
      } catch (tokenError) {
        console.error('Failed to store Gmail tokens:', tokenError);
      }
    }
   
    // Create the redirect response
    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://www.smartsendr.org'
const redirectResponse = NextResponse.redirect(`${siteUrl}${next}` )
    
    // Ensure cookies are properly set in the response
    return redirectResponse;
  }
  
  console.error('Auth callback error:', error);
  return NextResponse.redirect(`${requestUrl.origin}/auth/auth-code-error`);
}