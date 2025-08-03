import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get('code');
  const next = searchParams.get('next') ?? '/dashboard';

  if (code) {
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
    
    const { data, error } = await supabase.auth.exchangeCodeForSession(code);
    
    if (!error && data.session) {
      console.log('Session data:', {
        user_id: data.session.user.id,
        has_provider_token: !!data.session.provider_token,
        has_refresh_token: !!data.session.provider_refresh_token,
        provider: data.session.user.app_metadata?.provider
      });
      
      // Store Gmail tokens if this was a Google OAuth login
      if (data.session.provider_token && data.session.provider_refresh_token) {
        try {
          // Calculate expiration time (Google tokens typically expire in 1 hour)
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
          // Continue anyway - the user can still use the app without Gmail
        }
      } else {
        console.log('No provider tokens found in session');
      }
      
      return NextResponse.redirect(`${origin}${next}`);
    }
  }

  // return the user to an error page with instructions
  return NextResponse.redirect(`${origin}/auth/auth-code-error`);
} 