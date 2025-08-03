import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { google } from 'googleapis';

export async function POST(request: NextRequest) {
  try {
    const { user_id } = await request.json();
    
    if (!user_id) {
      return NextResponse.json({ error: 'User ID is required' }, { status: 400 });
    }

    const supabase = await createClient();

    // Get the current user to verify they're authenticated
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    
    if (userError || !user || user.id !== user_id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get the stored tokens
    const { data: tokens, error: tokenError } = await supabase
      .from('user_tokens')
      .select('access_token, refresh_token, expires_at')
      .eq('user_id', user_id)
      .eq('provider', 'google')
      .single();

    if (tokenError || !tokens || !tokens.refresh_token) {
      return NextResponse.json({ error: 'No refresh token found' }, { status: 400 });
    }

    // Setup OAuth2 client
    const oauth2Client = new google.auth.OAuth2(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET,
      process.env.GOOGLE_REDIRECT_URI
    );

    oauth2Client.setCredentials({
      refresh_token: tokens.refresh_token,
    });

    // Refresh the token
    const { credentials } = await oauth2Client.refreshAccessToken();
    
    if (!credentials.access_token) {
      return NextResponse.json({ error: 'Failed to refresh token' }, { status: 500 });
    }

    // Calculate new expiration time
    const expiresAt = credentials.expiry_date 
      ? new Date(credentials.expiry_date).toISOString()
      : new Date(Date.now() + 3600 * 1000).toISOString();

    // Update the tokens in the database
    const { error: updateError } = await supabase
      .from('user_tokens')
      .update({
        access_token: credentials.access_token,
        refresh_token: credentials.refresh_token || tokens.refresh_token, // Keep old refresh token if new one not provided
        expires_at: expiresAt,
        updated_at: new Date().toISOString()
      })
      .eq('user_id', user_id)
      .eq('provider', 'google');

    if (updateError) {
      console.error('Failed to update tokens:', updateError);
      return NextResponse.json({ error: 'Failed to update tokens' }, { status: 500 });
    }

    return NextResponse.json({ 
      success: true, 
      message: 'Token refreshed successfully',
      expires_at: expiresAt
    });

  } catch (error) {
    console.error('Error refreshing Gmail token:', error);
    return NextResponse.json({ 
      error: 'Failed to refresh token',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
} 