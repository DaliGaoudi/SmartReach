import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { resetMonthlyUsage } from '@/lib/subscription-limits';

export async function GET(request: NextRequest) {
  try {
    // For Vercel cron jobs, we don't need authorization as Vercel handles security
    // But you can still add a secret check if you want extra security
    const authHeader = request.headers.get('authorization');
    const expectedToken = process.env.USAGE_RESET_TOKEN;
    
    // Optional: Add authorization check for manual calls
    if (authHeader && expectedToken && authHeader !== `Bearer ${expectedToken}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Reset monthly usage for all users
    await resetMonthlyUsage();

    return NextResponse.json({ 
      message: 'Monthly usage reset successfully',
      timestamp: new Date().toISOString()
    });

  } catch (error: any) {
    console.error('Error resetting monthly usage:', error);
    return NextResponse.json({ 
      error: 'Failed to reset monthly usage',
      details: error.message 
    }, { status: 500 });
  }
}

// Keep POST method for manual calls with authorization
export async function POST(request: NextRequest) {
  try {
    // Check for authorization for manual calls
    const authHeader = request.headers.get('authorization');
    const expectedToken = process.env.USAGE_RESET_TOKEN;
    
    if (!expectedToken || authHeader !== `Bearer ${expectedToken}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Reset monthly usage for all users
    await resetMonthlyUsage();

    return NextResponse.json({ 
      message: 'Monthly usage reset successfully',
      timestamp: new Date().toISOString()
    });

  } catch (error: any) {
    console.error('Error resetting monthly usage:', error);
    return NextResponse.json({ 
      error: 'Failed to reset monthly usage',
      details: error.message 
    }, { status: 500 });
  }
} 